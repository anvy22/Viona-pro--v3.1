import type { NodeExecutor } from "../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { aiAgentChannel } from "@/inngest/channels/ai-agent";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";
import ky from "ky";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
});

type AiAgentData = {
    variableName?: string;
    systemPrompt?: string;
    userPrompt?: string;
    maxIterations?: number;
};

type ChatModelData = {
    provider?: "gemini" | "openai" | "anthropic";
    model?: string;
    credentialId?: string | null;
};

type MemoryData = {
    windowSize?: number;
    memoryKey?: string;
};

/**
 * Helper: create the AI SDK model instance based on provider + model + apiKey.
 */
function createModelInstance(provider: string, model: string, apiKey: string) {
    switch (provider) {
        case "openai": {
            const openai = createOpenAI({ apiKey });
            return openai(model || "gpt-4o");
        }
        case "anthropic": {
            const anthropic = createAnthropic({ apiKey });
            return anthropic(model || "claude-sonnet-4-5");
        }
        case "gemini":
        default: {
            const google = createGoogleGenerativeAI({ apiKey });
            return google(model || "gemini-2.0-flash");
        }
    }
}

/**
 * Helper: fetch and decrypt credential by ID.
 */
async function resolveCredential(credentialId: string | null | undefined): Promise<string> {
    if (!credentialId) return "";

    const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
    });
    if (credential?.value) {
        return decrypt(credential.value);
    }
    return "";
}

/**
 * Helper: build AI SDK tools from connected tool nodes.
 */
function buildToolsFromNodes(toolNodes: Array<{ id: string; type: string; data: any }>) {
    const tools: Record<string, any> = {};

    for (const toolNode of toolNodes) {
        const toolName = (toolNode.data as any)?.variableName || `tool_${toolNode.id.slice(0, 8)}`;

        if (toolNode.type === "HTTP_REQUEST") {
            tools[toolName] = tool({
                description: `Make an HTTP request. Node: ${toolName}`,
                parameters: z.object({
                    url: z.string().describe("The URL to send the request to"),
                    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET").describe("HTTP method"),
                    body: z.string().optional().describe("Request body (JSON string)"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing requires explicit cast
                execute: async ({ url, method, body }: { url: string; method: string; body?: string }) => {
                    try {
                        const options: any = {};
                        if (body && ["POST", "PUT", "PATCH"].includes(method)) {
                            options.json = JSON.parse(body);
                        }
                        const response = await ky(url, { method, ...options }).text();
                        return response.slice(0, 5000); // Limit response size
                    } catch (err: any) {
                        return `HTTP Error: ${err.message}`;
                    }
                },
            });
        } else {
            // Generic tool for other node types
            tools[toolName] = tool({
                description: `Execute the "${toolName}" node (type: ${toolNode.type})`,
                parameters: z.object({
                    input: z.string().describe("Input data for this tool"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing requires explicit cast
                execute: async ({ input }: { input: string }) => {
                    return `Tool "${toolName}" received: ${input}. (Generic tool execution placeholder)`;
                },
            });
        }
    }

    return tools;
}


export const aiAgentExecutor: NodeExecutor<AiAgentData> = async ({ data, nodeId, context, step, publish }) => {

    await publish(
        aiAgentChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.variableName) {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("AI Agent: Variable name is required");
    }

    if (!data.userPrompt) {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("AI Agent: User prompt is required");
    }

    // ----- 1. Find connected sub-nodes via DB connections -----
    const connections = await prisma.connection.findMany({
        where: { toNodeId: nodeId },
    });

    let chatModelData: ChatModelData | null = null;
    let memoryData: MemoryData | null = null;
    const toolNodeIds: string[] = [];

    for (const conn of connections) {
        if (conn.toInput === "chat-model-target") {
            const chatModelNode = await prisma.node.findUnique({
                where: { id: conn.fromNodeId },
                include: { credential: true },
            });
            if (chatModelNode) {
                chatModelData = chatModelNode.data as unknown as ChatModelData;
                // Also get credentialId from the node record
                if (chatModelNode.credentialId) {
                    chatModelData.credentialId = chatModelNode.credentialId;
                }
            }
        } else if (conn.toInput === "memory-target") {
            const memoryNode = await prisma.node.findUnique({
                where: { id: conn.fromNodeId },
            });
            if (memoryNode) {
                memoryData = memoryNode.data as unknown as MemoryData;
            }
        } else if (conn.toInput === "tool-target") {
            toolNodeIds.push(conn.fromNodeId);
        }
    }

    // ----- 2. Resolve Chat Model -----
    if (!chatModelData?.provider) {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("AI Agent: No Chat Model connected. Connect a Chat Model sub-node to the bottom-left handle.");
    }

    let apiKey = "";
    try {
        apiKey = await resolveCredential(chatModelData.credentialId);
    } catch (err) {
        console.error("Failed to resolve Chat Model credential", err);
    }

    if (!apiKey) {
        await publish(aiAgentChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("AI Agent: Chat Model has no API key configured.");
    }

    const model = createModelInstance(
        chatModelData.provider,
        chatModelData.model || "",
        apiKey,
    );

    // ----- 3. Resolve Memory -----
    const memoryKey = memoryData?.memoryKey || "chatHistory";
    const windowSize = memoryData?.windowSize || 10;
    const existingHistory = (context[memoryKey] as Array<{ role: string; content: string }>) || [];
    const recentHistory = existingHistory.slice(-windowSize);

    // ----- 4. Resolve Tools -----
    let toolNodes: Array<{ id: string; type: string; data: any }> = [];
    if (toolNodeIds.length > 0) {
        const nodes = await prisma.node.findMany({
            where: { id: { in: toolNodeIds } },
        });
        toolNodes = nodes.map((n) => ({
            id: n.id,
            type: n.type,
            data: n.data,
        }));
    }

    const tools = buildToolsFromNodes(toolNodes);

    // ----- 5. Build prompts -----
    const systemPrompt = data.systemPrompt
        ? Handlebars.compile(data.systemPrompt)(context)
        : "You are a helpful AI assistant that can use tools to accomplish tasks.";

    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    // ----- 6. Run agentic loop -----
    try {
        const result = await step.run("ai-agent-generate", async () => {
            const messages: Array<{ role: "user" | "assistant"; content: string }> = [
                ...recentHistory.map((m) => ({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                })),
                { role: "user" as const, content: userPrompt },
            ];

            const { text, steps: agentSteps } = await generateText({
                model,
                system: systemPrompt,
                messages,
                tools: Object.keys(tools).length > 0 ? tools : undefined,
                stopWhen: stepCountIs(data.maxIterations || 10),
            });

            // Update memory with the new exchange
            const updatedHistory = [
                ...existingHistory,
                { role: "user", content: userPrompt },
                { role: "assistant", content: text },
            ].slice(-windowSize * 2); // Keep a reasonable history

            return {
                agentResponse: text,
                toolCallCount: agentSteps.length - 1,
                updatedHistory,
            };
        });

        await publish(
            aiAgentChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                agentResponse: result.agentResponse,
                toolCallCount: result.toolCallCount,
            },
            // Update memory in context
            ...(memoryData ? { [memoryKey]: result.updatedHistory } : {}),
        };

    } catch (error) {
        await publish(
            aiAgentChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw error;
    }
};
