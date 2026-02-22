"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { inventoryTriggerChannel } from "@/inngest/channels/inventory-trigger";
import { inngest } from "@/inngest/client";

export type InventoryTriggerToken = Realtime.Token<
    typeof inventoryTriggerChannel,
    ["status"]
>;

export async function fetchInventoryTriggerRealtimeToken():
    Promise<InventoryTriggerToken> {
    const token = await getSubscriptionToken(inngest, {
        channel: inventoryTriggerChannel(),
        topics: ["status"],
    });

    return token;
}
