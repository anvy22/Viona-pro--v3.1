import type { NodeExecutor } from "../../executions/types";
import { manualTriggerChannel } from "@/inngest/channels/manual-trigger";

type ManualTiggerData = Record<string, unknown>;

export const manualTriggerExecutor: NodeExecutor<ManualTiggerData> = async ({  nodeId, context, step, publish}) => {
    await publish(
        manualTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );
    const result  = await step.run("manual-trigger", async () => context);

    await publish(
        manualTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );
    
    return result;
};