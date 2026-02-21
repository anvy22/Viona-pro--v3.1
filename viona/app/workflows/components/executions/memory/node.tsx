"use client";
import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { MemoryDialog, type MemoryFormValues } from "./dialog";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { AI_AGENT_CHANNEL_NAME } from "@/inngest/channels/ai-agent";
import { fetchAiAgentRealtimeToken } from "@/app/workflows/components/executions/ai-agent/actions";
import { BrainCircuit } from "lucide-react";

type MemoryNodeData = {
    windowSize?: number;
    memoryKey?: string;
};

type MemoryNodeType = Node<MemoryNodeData>;

export const MemoryNode = memo((props: NodeProps<MemoryNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: AI_AGENT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchAiAgentRealtimeToken,
    });

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = (values: MemoryFormValues) => {
        setNodes((nodes) => {
            return nodes.map((node) => {
                if (node.id === props.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...values,
                        },
                    };
                }
                return node;
            });
        });
    };

    const nodeData = props.data;
    const description = nodeData?.windowSize
        ? `Window: ${nodeData.windowSize} messages`
        : "Not configured";

    return (
        <>
            <MemoryDialog
                open={open}
                onOpenChange={setOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name="Memory"
                description={description}
                onSettings={handleOpenSettings}
            >
                <NodeStatusIndicator status={nodeStatus} variant="border">
                    <BaseNode status={nodeStatus} onDoubleClick={handleOpenSettings}>
                        <BaseNodeContent>
                            <BrainCircuit className="size-4 text-muted-foreground" />
                            <BaseHandle position={Position.Top} type="source" id="source-1" />
                        </BaseNodeContent>
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    );
});

MemoryNode.displayName = "MemoryNode";
