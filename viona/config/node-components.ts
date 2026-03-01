import { NodeType } from "@prisma/client";
import type { NodeTypes } from "@xyflow/react";
import { InitialNode } from "../components/initial-node";
import { HttpRequestNode } from "../app/workflows/components/executions/http-request/node";
import { ManualTriggerNode } from "../app/workflows/components/triggers/manual-trigger/node";
import { GoogleFormTrigger } from "../app/workflows/components/triggers/google-form-trigger/node";
import { StripeTriggerNode } from "../app/workflows/components/triggers/stripe-trigger/node";
import { GeminiNode } from "../app/workflows/components/executions/gemini/node";
import { OpenAiNode } from "@/app/workflows/components/executions/openai/node";
import { AnthropicNode } from "@/app/workflows/components/executions/anthropic/node";
import { DiscordNode } from "@/app/workflows/components/executions/discord/node";
import { SlackNode } from "@/app/workflows/components/executions/slack/node";
import { AiAgentNode } from "@/app/workflows/components/executions/ai-agent/node";
import { ChatModelNode } from "@/app/workflows/components/executions/chat-model/node";
import { MemoryNode } from "@/app/workflows/components/executions/memory/node";
import { SendEmailNode } from "@/app/workflows/components/executions/send-email/node";
import { WebScraperNode } from "@/app/workflows/components/executions/web-scraper/node";
import { CalculatorNode } from "@/app/workflows/components/executions/calculator/node";
import { InventoryLookupNode } from "@/app/workflows/components/executions/inventory-lookup/node";
import { OrderManagerNode } from "@/app/workflows/components/executions/order-manager/node";
import { InventoryTriggerNode } from "@/app/workflows/components/triggers/inventory-trigger/node";
import { OrderTriggerNode } from "@/app/workflows/components/triggers/order-trigger/node";
import { ScheduledTriggerNode } from "@/app/workflows/components/triggers/scheduled-trigger/node";

export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
    [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTrigger,
    [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
    [NodeType.GEMINI]: GeminiNode,
    [NodeType.OPENAI]: OpenAiNode,
    [NodeType.ANTHROPIC]: AnthropicNode,
    [NodeType.DISCORD]: DiscordNode,
    [NodeType.SLACK]: SlackNode,
    [NodeType.AI_AGENT]: AiAgentNode,
    [NodeType.CHAT_MODEL]: ChatModelNode,
    [NodeType.MEMORY]: MemoryNode,
    [NodeType.SEND_EMAIL]: SendEmailNode,
    [NodeType.WEB_SCRAPER]: WebScraperNode,
    [NodeType.CALCULATOR]: CalculatorNode,
    [NodeType.INVENTORY_LOOKUP]: InventoryLookupNode,
    [NodeType.ORDER_MANAGER]: OrderManagerNode,
    [NodeType.INVENTORY_TRIGGER]: InventoryTriggerNode,
    [NodeType.ORDER_TRIGGER]: OrderTriggerNode,
    [NodeType.SCHEDULED_TRIGGER]: ScheduledTriggerNode,
} as const satisfies NodeTypes;

export type RegisteredNodeTypes = keyof typeof nodeComponents;