import { NodeType } from "@prisma/client";
import type { NodeTypes } from "@xyflow/react";
import { InitialNode } from "../components/initial-node";
import { HttpRequestNode } from "../app/workflows/components/executions/http-request/node";
import { ManualTriggerNode } from "../app/workflows/components/triggers/manual-trigger/node";


export const nodeComponents = {
    [NodeType.INITIAL]: InitialNode,
    [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
    [NodeType.HTTP_REQUEST]: HttpRequestNode,
} as const satisfies NodeTypes;

export type RegisteredNodeTypes = keyof typeof nodeComponents;