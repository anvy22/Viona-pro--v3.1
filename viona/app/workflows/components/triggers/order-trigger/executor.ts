import type { NodeExecutor } from "../../executions/types";
import { orderTriggerChannel } from "@/inngest/channels/order-trigger";

type OrderTriggerData = Record<string, unknown>;

export const orderTriggerExecutor: NodeExecutor<OrderTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(
        orderTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );
    const result = await step.run("order-trigger", async () => context);

    await publish(
        orderTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
