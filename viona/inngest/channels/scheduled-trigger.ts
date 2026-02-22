import { channel, topic } from "@inngest/realtime";

export const SCHEDULED_TRIGGER_CHANNEL_NAME = "scheduled-trigger-execution";

export const scheduledTriggerChannel = channel(SCHEDULED_TRIGGER_CHANNEL_NAME)
    .addTopic(
        topic("status").type<{
            nodeId: string;
            status: "success" | "error" | "loading";
        }>(),
    );
