import { channel, topic } from "@inngest/realtime";

export const ORDER_TRIGGER_CHANNEL_NAME = "order-trigger-execution";

export const orderTriggerChannel = channel(ORDER_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "success" | "error" | "loading";
        }>(),
    );
