import type { NodeExecutor } from "../../executions/types";
import { inventoryTriggerChannel } from "@/inngest/channels/inventory-trigger";

type InventoryTriggerData = Record<string, unknown>;

export const inventoryTriggerExecutor: NodeExecutor<InventoryTriggerData> = async ({ nodeId, context, step, publish }) => {
    await publish(
        inventoryTriggerChannel().status({
            nodeId,
            status: "loading",
        }),
    );
    const result = await step.run("inventory-trigger", async () => context);

    await publish(
        inventoryTriggerChannel().status({
            nodeId,
            status: "success",
        }),
    );

    return result;
};
