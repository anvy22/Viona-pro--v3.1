import { NodeProps } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { StripeTriggerDialog } from "./dialog";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { STRIPE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/stripe-trigger";
import { fetchStripeTriggerRealtimeToken } from "./actions";

export const StripeTriggerNode = memo((props: NodeProps) => {
    const [open, setOpen] = useState(false);

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: STRIPE_TRIGGER_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchStripeTriggerRealtimeToken,
    });

    const handleOpenSettings = () => setOpen(true);
    return (
        <>
            <StripeTriggerDialog
                open={open}
                onOpenChange={setOpen}
            />
            <BaseTriggerNode
                {...props}
                icon="/logos/stripe.svg"
                name="Stripe"
                description="When stripe event is triggered"
                status={nodeStatus}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    )
});