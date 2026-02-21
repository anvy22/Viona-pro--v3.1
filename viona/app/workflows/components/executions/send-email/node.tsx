"use client";
import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { SendEmailDialog, type SendEmailFormValues } from "./dialog";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { AI_AGENT_CHANNEL_NAME } from "@/inngest/channels/ai-agent";
import { fetchAiAgentRealtimeToken } from "@/app/workflows/components/executions/ai-agent/actions";
import { Mail } from "lucide-react";

type SendEmailNodeType = Node<Partial<SendEmailFormValues>>;

export const SendEmailNode = memo((props: NodeProps<SendEmailNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id, channel: AI_AGENT_CHANNEL_NAME,
        topic: "status", refreshToken: fetchAiAgentRealtimeToken,
    });

    const handleDelete = () => {
        setNodes((nodes) => nodes.filter((n) => n.id !== props.id));
        setEdges((edges) => edges.filter((e) => e.source !== props.id && e.target !== props.id));
    };

    const handleSubmit = (values: SendEmailFormValues) => {
        setNodes((nodes) => nodes.map((node) =>
            node.id === props.id ? { ...node, data: { ...node.data, ...values } } : node
        ));
    };

    const description = props.data?.fromAddress || "Not configured";

    return (
        <>
            <SendEmailDialog open={open} onOpenChange={setOpen} onSubmit={handleSubmit} defaultValues={props.data} />
            <WorkflowNode name="Send Email" description={description} onSettings={() => setOpen(true)} onDelete={handleDelete}>
                <NodeStatusIndicator status={nodeStatus} variant="border">
                    <BaseNode status={nodeStatus} onDoubleClick={() => setOpen(true)}>
                        <BaseNodeContent>
                            <Mail className="size-4 text-muted-foreground" />
                            <BaseHandle position={Position.Top} type="source" id="source-1" />
                        </BaseNodeContent>
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    );
});
SendEmailNode.displayName = "SendEmailNode";
