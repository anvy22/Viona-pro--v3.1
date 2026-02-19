import { NodeType } from "@prisma/client";
import { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "../../triggers/manual-trigger/executor";
import { httpRequestExecutor } from "../../executions/http-request/executor";
import { googleFormTriggerExecutor } from "../../triggers/google-form-trigger/executor";

export const executorRegistry: Record<NodeType, NodeExecutor<any>> = {
    [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
    [NodeType.INITIAL]: manualTriggerExecutor,
    [NodeType.HTTP_REQUEST]: httpRequestExecutor,
    [NodeType.GOOGLE_FORM_TRIGGER]: googleFormTriggerExecutor,

};

export const getExecutor = (type: NodeType): NodeExecutor => {
    const executor = executorRegistry[type];
    if (!executor) {
        throw new Error(`No executor found for node type: ${type}`);
    }
    return executor;
};

