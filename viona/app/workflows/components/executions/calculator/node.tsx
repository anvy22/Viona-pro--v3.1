"use client";
import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { CalculatorDialog } from "./dialog";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { AI_AGENT_CHANNEL_NAME } from "@/inngest/channels/ai-agent";
import { fetchAiAgentRealtimeToken } from "@/app/workflows/components/executions/ai-agent/actions";
import { Calculator as CalcIcon } from "lucide-react";

export const CalculatorNode = memo((props: NodeProps<Node>) => {
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

    return (
        <>
            <CalculatorDialog open={open} onOpenChange={setOpen} />
            <WorkflowNode name="Calculator" description="Math expressions" onSettings={() => setOpen(true)} onDelete={handleDelete}>
                <NodeStatusIndicator status={nodeStatus} variant="border">
                    <BaseNode status={nodeStatus} onDoubleClick={() => setOpen(true)}>
                        <BaseNodeContent>
                            <CalcIcon className="size-4 text-muted-foreground" />
                            <BaseHandle position={Position.Top} type="source" id="source-1" />
                        </BaseNodeContent>
                    </BaseNode>
                </NodeStatusIndicator>
            </WorkflowNode>
        </>
    );
});
CalculatorNode.displayName = "CalculatorNode";
