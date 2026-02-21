import type { NodeExecutor } from "../types";
import { NonRetriableError } from "inngest";
import Handlebars from "handlebars";
import { anthropicChannel } from "@/inngest/channels/anthropic"
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai"
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    const safeString = new Handlebars.SafeString(jsonString);

    return safeString;
});

type AnthropicData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
}

export const anthropicExecutor: NodeExecutor<AnthropicData> = async ({ data, nodeId, context, step, publish }) => {

    await publish(
        anthropicChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.variableName) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Anthropic Node:Variable name is required");
    }

    if (!data.userPrompt) {
        await publish(
            anthropicChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Anthropic Node:User prompt is required");
    }

    const systemPrompt = data.systemPrompt
        ? Handlebars.compile(data.systemPrompt)(context)
        : "You are a helpfull assistant.";


    const userPrompt = Handlebars.compile(data.userPrompt)(context);

    let credentials = process.env.ANTHROPIC_API_KEY!;

    try {
        const node = await prisma.node.findUnique({
            where: { id: nodeId },
            include: { credential: true }
        });
        if (node?.credential?.value) {
            credentials = decrypt(node.credential.value);
        }
    } catch (err) {
        console.error("Failed to load credential for node", err);
    }

    const anthropic = createAnthropic({
        apiKey: credentials,
    })

    try {
        const { steps } = await step.ai.wrap(
            "anthropic-generate-text",
            generateText,
            {
                model: anthropic(data.model || "claude-sonnet-4-5"),
                system: systemPrompt,
                prompt: userPrompt,
            }
        )

        const text = steps[0].content[0].type === "text"
            ? steps[0].content[0].text
            : "";

        await publish(
            anthropicChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: {
                aiResponse: text,
            }
        }
    } catch (error) {

        await publish(
            anthropicChannel().status({
                nodeId,
                status: "error",
            }),
        );

        throw error;
    }

};