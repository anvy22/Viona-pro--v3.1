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
} as const satisfies NodeTypes;


export type RegisteredNodeTypes = keyof typeof nodeComponents;