"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { orderTriggerChannel } from "@/inngest/channels/order-trigger";
import { inngest } from "@/inngest/client";

export type OrderTriggerToken = Realtime.Token<
    typeof orderTriggerChannel,
    ["status"]
>;

export async function fetchOrderTriggerRealtimeToken():
    Promise<OrderTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: orderTriggerChannel(),
        topics: ["status"],
    });

    return token;
}
