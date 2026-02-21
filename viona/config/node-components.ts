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
} as const satisfies NodeTypes;


export type RegisteredNodeTypes = keyof typeof nodeComponents;