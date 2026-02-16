import type { NodeExecutor } from "../../executions/types";

type ManualTiggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTiggerData> = async ({  nodeId, context, step }) => {
    const result  = await step.run("manual-trigger", async () => context);
    return result;
};