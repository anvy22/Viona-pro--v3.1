import { channel, topic } from "@inngest/realtime";

export const INVENTORY_TRIGGER_CHANNEL_NAME = "inventory-trigger-execution";

export const inventoryTriggerChannel = channel(INVENTORY_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "success" | "error" | "loading";
        }>(),
    );
