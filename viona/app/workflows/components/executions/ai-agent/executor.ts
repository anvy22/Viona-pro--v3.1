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
function buildToolsFromNodes(toolNodes: Array<{ id: string; type: string; data: any }>, orgId?: bigint) {
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
                        return response.slice(0, 5000);
                    } catch (err: any) {
                        return `HTTP Error: ${err.message}`;
                    }
                },
            });
        } else if (toolNode.type === "SEND_EMAIL") {
            const emailConfig = toolNode.data as any;
            tools["send_email"] = tool({
                description: "Send an email to a recipient. Use this when you need to email someone.",
                parameters: z.object({
                    to: z.string().describe("Recipient email address"),
                    subject: z.string().describe("Email subject line"),
                    body: z.string().describe("Email body (plain text)"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
                    try {
                        const nodemailer = await import("nodemailer");
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.smtpHost,
                            port: parseInt(emailConfig.smtpPort || "587"),
                            secure: emailConfig.smtpPort === "465",
                            auth: {
                                user: emailConfig.smtpUser,
                                pass: emailConfig.smtpPass,
                            },
                        });
                        await transporter.sendMail({
                            from: emailConfig.fromName
                                ? `"${emailConfig.fromName}" <${emailConfig.fromAddress}>`
                                : emailConfig.fromAddress,
                            to,
                            subject,
                            text: body,
                        });
                        return `Email sent successfully to ${to}`;
                    } catch (err: any) {
                        return `Email Error: ${err.message}`;
                    }
                },
            });
        } else if (toolNode.type === "WEB_SCRAPER") {
            const maxLength = (toolNode.data as any)?.maxLength || 5000;
            tools["web_scraper"] = tool({
                description: "Fetch and read web page content from a URL. Returns the text content of the page.",
                parameters: z.object({
                    url: z.string().describe("The URL to fetch content from"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ url }: { url: string }) => {
                    try {
                        const response = await ky(url).text();
                        // Strip HTML tags for cleaner text
                        const text = response.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                        return text.slice(0, maxLength);
                    } catch (err: any) {
                        return `Scraper Error: ${err.message}`;
                    }
                },
            });
        } else if (toolNode.type === "CALCULATOR") {
            tools["calculator"] = tool({
                description: "Evaluate a mathematical expression. Supports +, -, *, /, %, ** (power), Math functions (sqrt, sin, cos, tan, log, abs, round, ceil, floor), and constants (PI, E).",
                parameters: z.object({
                    expression: z.string().describe("The math expression to evaluate, e.g. '(15 * 3) + Math.sqrt(144)'"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ expression }: { expression: string }) => {
                    try {
                        // Validate: only allow safe math characters and functions
                        const safePattern = /^[0-9+\-*/%.() ,eE]+$|Math\.(sqrt|sin|cos|tan|log|abs|round|ceil|floor|pow|PI|E)/;
                        const cleaned = expression.replace(/Math\.\w+/g, "").replace(/PI|E/g, "");
                        if (!/^[0-9+\-*/%.() ,eE\s]*$/.test(cleaned)) {
                            return "Error: Expression contains unsafe characters. Only numbers, operators (+,-,*,/,%,**), and Math functions are allowed.";
                        }
                        const safeExpr = expression
                            .replace(/\bPI\b/g, "Math.PI")
                            .replace(/\bE\b/g, "Math.E")
                            .replace(/\bsqrt\b/g, "Math.sqrt")
                            .replace(/\bsin\b/g, "Math.sin")
                            .replace(/\bcos\b/g, "Math.cos")
                            .replace(/\btan\b/g, "Math.tan")
                            .replace(/\blog\b/g, "Math.log")
                            .replace(/\babs\b/g, "Math.abs")
                            .replace(/\bround\b/g, "Math.round")
                            .replace(/\bceil\b/g, "Math.ceil")
                            .replace(/\bfloor\b/g, "Math.floor");
                        const fn = new Function(`"use strict"; return (${safeExpr})`);
                        const result = fn();
                        return `Result: ${result}`;
                    } catch (err: any) {
                        return `Calculation Error: ${err.message}`;
                    }
                },
            });
        } else if (toolNode.type === "INVENTORY_LOOKUP") {
            // Auto-configured: queries the organization's own database
            tools["search_products"] = tool({
                description: "Search or list products in the inventory. If no query is provided, lists all products. Can search by name or SKU.",
                parameters: z.object({
                    query: z.string().optional().describe("Optional search query — product name or SKU. Leave empty to list all products."),
                    limit: z.number().optional().describe("Max results to return (default 10)"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ query, limit }: { query?: string; limit?: number }) => {
                    try {
                        console.log("[Inventory Tool] orgId:", orgId?.toString(), "query:", query);
                        const where: any = {};
                        if (orgId) where.org_id = orgId;
                        if (query && query.trim()) {
                            where.OR = [
                                { name: { contains: query, mode: "insensitive" } },
                                { sku: { contains: query, mode: "insensitive" } },
                            ];
                        }
                        const products = await prisma.product.findMany({
                            where,
                            include: {
                                productStocks: { include: { warehouse: true } },
                                productPrices: true,
                            },
                            take: Math.min(limit || 10, 20),
                        });
                        console.log("[Inventory Tool] Found", products.length, "products");
                        if (products.length === 0) return "No products found in the inventory.";
                        return JSON.stringify(products.map(p => ({
                            id: p.product_id.toString(),
                            sku: p.sku,
                            name: p.name,
                            description: p.description,
                            status: p.status,
                            stock: p.productStocks.map(s => ({
                                warehouse: s.warehouse.name,
                                quantity: s.quantity,
                            })),
                            pricing: p.productPrices.map(pr => ({
                                actual: pr.actual_price?.toString(),
                                retail: pr.retail_price?.toString(),
                                market: pr.market_price?.toString(),
                            })),
                        })), null, 2);
                    } catch (err: any) {
                        console.error("[Inventory Tool] Error:", err);
                        return `Inventory Error: ${err.message}`;
                    }
                },
            });

            tools["list_warehouses"] = tool({
                description: "List all warehouses in the organization with their addresses.",
                parameters: z.object({}),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async () => {
                    try {
                        const warehouses = await prisma.warehouse.findMany({
                            where: orgId ? { org_id: orgId } : {},
                            include: { productStocks: { include: { product: true } } },
                        });
                        return JSON.stringify(warehouses.map(w => ({
                            id: w.warehouse_id.toString(),
                            name: w.name,
                            address: w.address,
                            productCount: w.productStocks.length,
                            totalStock: w.productStocks.reduce((sum, s) => sum + (s.quantity || 0), 0),
                        })), null, 2);
                    } catch (err: any) {
                        return `Warehouse Error: ${err.message}`;
                    }
                },
            });
        } else if (toolNode.type === "ORDER_MANAGER") {
            tools["search_orders"] = tool({
                description: "Search orders by customer name, email, status, or order ID. Returns order details.",
                parameters: z.object({
                    query: z.string().optional().describe("Search by customer name, email, or phone"),
                    status: z.string().optional().describe("Filter by order status"),
                    limit: z.number().optional().describe("Max results (default 10)"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ query, status, limit }: { query?: string; status?: string; limit?: number }) => {
                    try {
                        const where: any = {};
                        if (orgId) where.org_id = orgId;
                        if (status) where.status = status;
                        if (query) {
                            where.OR = [
                                { customer_name: { contains: query, mode: "insensitive" } },
                                { customer_email: { contains: query, mode: "insensitive" } },
                                { customer_phone: { contains: query, mode: "insensitive" } },
                            ];
                        }
                        const orders = await prisma.order.findMany({
                            where,
                            include: {
                                orderItems: { include: { product: true } },
                            },
                            orderBy: { created_at: "desc" },
                            take: Math.min(limit || 10, 20),
                        });
                        if (orders.length === 0) return "No orders found.";
                        return JSON.stringify(orders.map(o => ({
                            id: o.order_id.toString(),
                            date: o.order_date?.toISOString(),
                            status: o.status,
                            total: o.total_amount?.toString(),
                            customer: {
                                name: o.customer_name,
                                email: o.customer_email,
                                phone: o.customer_phone,
                            },
                            shipping: {
                                street: o.shipping_street,
                                city: o.shipping_city,
                                state: o.shipping_state,
                                zip: o.shipping_zip,
                                country: o.shipping_country,
                                method: o.shipping_method,
                            },
                            items: o.orderItems.map(i => ({
                                product: i.product.name,
                                sku: i.product.sku,
                                quantity: i.quantity,
                                price: i.price_at_order?.toString(),
                            })),
                            notes: o.notes,
                        })), null, 2);
                    } catch (err: any) {
                        return `Order Search Error: ${err.message}`;
                    }
                },
            });

            tools["update_order_status"] = tool({
                description: "Update the status of an order. Can only change the status field.",
                parameters: z.object({
                    orderId: z.string().describe("The order ID to update"),
                    newStatus: z.string().describe("New status (e.g. 'processing', 'shipped', 'delivered', 'cancelled')"),
                }),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
                    try {
                        const order = await prisma.order.findFirst({
                            where: {
                                order_id: BigInt(orderId),
                                ...(orgId ? { org_id: orgId } : {}),
                            },
                        });
                        if (!order) return `Error: Order #${orderId} not found in your organization.`;

                        await prisma.order.update({
                            where: { order_id: BigInt(orderId) },
                            data: { status: newStatus },
                        });
                        return `Order #${orderId} status updated to "${newStatus}" successfully.`;
                    } catch (err: any) {
                        return `Order Update Error: ${err.message}`;
                    }
                },
            });

            tools["get_order_stats"] = tool({
                description: "Get summary statistics of orders — counts by status, total revenue, etc.",
                parameters: z.object({}),
                // @ts-expect-error — AI SDK v6 tool() typing
                execute: async () => {
                    try {
                        const orders = await prisma.order.findMany({
                            where: orgId ? { org_id: orgId } : {},
                            select: { status: true, total_amount: true },
                        });
                        const statusCounts: Record<string, number> = {};
                        let totalRevenue = 0;
                        for (const o of orders) {
                            const s = o.status || "unknown";
                            statusCounts[s] = (statusCounts[s] || 0) + 1;
                            totalRevenue += parseFloat(o.total_amount?.toString() || "0");
                        }
                        return JSON.stringify({
                            totalOrders: orders.length,
                            totalRevenue: totalRevenue.toFixed(2),
                            byStatus: statusCounts,
                        }, null, 2);
                    } catch (err: any) {
                        return `Stats Error: ${err.message}`;
                    }
                },
            });
        } else {
            // Generic fallback for unknown tool types
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
    // Also resolve the org_id for security scoping (inventory/order tools)
    const agentNode = await prisma.node.findUnique({
        where: { id: nodeId },
        include: { workflow: { select: { org_id: true } } },
    });
    const orgId = agentNode?.workflow?.org_id;

    const connections = await prisma.connection.findMany({
        where: { toNodeId: nodeId },
    });

    let chatModelData: ChatModelData | null = null;
    let chatModelNodeId: string | null = null;
    let memoryData: MemoryData | null = null;
    let memoryNodeId: string | null = null;
    const toolNodeIds: string[] = [];

    for (const conn of connections) {
        if (conn.toInput === "chat-model-target") {
            const chatModelNode = await prisma.node.findUnique({
                where: { id: conn.fromNodeId },
                include: { credential: true },
            });
            if (chatModelNode) {
                chatModelNodeId = chatModelNode.id;
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
                memoryNodeId = memoryNode.id;
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

    // Publish loading for sub-nodes
    if (chatModelNodeId) {
        await publish(aiAgentChannel().status({ nodeId: chatModelNodeId, status: "loading" }));
    }
    if (memoryNodeId) {
        await publish(aiAgentChannel().status({ nodeId: memoryNodeId, status: "loading" }));
    }
    for (const toolId of toolNodeIds) {
        await publish(aiAgentChannel().status({ nodeId: toolId, status: "loading" }));
    }

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

    const tools = buildToolsFromNodes(toolNodes, orgId);

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

        // Publish success for sub-nodes
        if (chatModelNodeId) {
            await publish(aiAgentChannel().status({ nodeId: chatModelNodeId, status: "success" }));
        }
        if (memoryNodeId) {
            await publish(aiAgentChannel().status({ nodeId: memoryNodeId, status: "success" }));
        }
        for (const toolId of toolNodeIds) {
            await publish(aiAgentChannel().status({ nodeId: toolId, status: "success" }));
        }

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

        // Publish error for sub-nodes
        if (chatModelNodeId) {
            await publish(aiAgentChannel().status({ nodeId: chatModelNodeId, status: "error" }));
        }
        if (memoryNodeId) {
            await publish(aiAgentChannel().status({ nodeId: memoryNodeId, status: "error" }));
        }
        for (const toolId of toolNodeIds) {
            await publish(aiAgentChannel().status({ nodeId: toolId, status: "error" }));
        }

        throw error;
    }
};
