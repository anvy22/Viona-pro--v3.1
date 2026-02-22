import type { NodeExecutor } from "../../executions/types";
import { scheduledTriggerChannel } from "@/inngest/channels/scheduled-trigger";

type ScheduledTriggerData = Record<string, unknown>;

export const scheduledTriggerExecutor: NodeExecutor<ScheduledTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(
        scheduledTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );
    const result = await step.run("scheduled-trigger", async () => context);

    await publish(
        scheduledTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
