"use client";
import "./ai-agent-node.css";
import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { AiAgentDialog, type AiAgentFormValues } from "./dialog";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { AI_AGENT_CHANNEL_NAME } from "@/inngest/channels/ai-agent";
import { fetchAiAgentRealtimeToken } from "./actions";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { type NodeStatus, NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { Bot, MessageSquare, BrainCircuit, Wrench, CheckCircle2, Loader2, XCircle } from "lucide-react";

type AiAgentNodeData = {
    variableName?: string;
    systemPrompt?: string;
    userPrompt?: string;
    maxIterations?: number;
};

type AiAgentNodeType = Node<AiAgentNodeData>;

export const AiAgentNode = memo((props: NodeProps<AiAgentNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes, setEdges } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: AI_AGENT_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchAiAgentRealtimeToken,
    });

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = (values: AiAgentFormValues) => {
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

    const handleDelete = () => {
        setNodes((currentNodes) => currentNodes.filter((node) => node.id !== props.id));
        setEdges((currentEdges) => currentEdges.filter(
            (edge) => edge.source !== props.id && edge.target !== props.id
        ));
    };

    const nodeData = props.data;
    const description = nodeData?.userPrompt
        ? `${nodeData.userPrompt.slice(0, 40)}...`
        : "Not configured";

    return (
        <>
            <AiAgentDialog
                open={open}
                onOpenChange={setOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <WorkflowNode
                name=""
                onDelete={handleDelete}
                onSettings={handleOpenSettings}
            >
                <div
                    className="ai-agent-node group"
                    onDoubleClick={handleOpenSettings}
                    tabIndex={0}
                >
                    {/* ─── Gradient accent bar ─── */}
                    <div className="ai-agent-node__accent" />

                    {/* ─── Main content ─── */}
                    <div className="ai-agent-node__body">
                        {/* Header row */}
                        <div className="ai-agent-node__header">
                            <div className="ai-agent-node__icon-wrapper">
                                <Bot className="size-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div className="ai-agent-node__title-group">
                                <span className="ai-agent-node__title">AI Agent</span>
                                <span className="ai-agent-node__desc">{description}</span>
                            </div>
                            {/* Status indicator */}
                            {nodeStatus === "loading" && (
                                <Loader2 className="size-3.5 text-blue-500 animate-spin ml-auto shrink-0" />
                            )}
                            {nodeStatus === "success" && (
                                <CheckCircle2 className="size-3.5 text-emerald-500 ml-auto shrink-0" />
                            )}
                            {nodeStatus === "error" && (
                                <XCircle className="size-3.5 text-red-500 ml-auto shrink-0" />
                            )}
                        </div>

                        {/* ─── Sub-node slots ─── */}
                        <div className="ai-agent-node__slots">
                            <div className="ai-agent-node__slot">
                                <span className="ai-agent-node__slot-label">Model</span>
                                <BaseHandle
                                    position={Position.Bottom}
                                    type="target"
                                    id="chat-model-target"
                                    className="!absolute !-bottom-[7px] !left-1/2 !-translate-x-1/2 !w-[9px] !h-[9px] !rounded-full !border-2 !border-violet-400 dark:!border-violet-500 !bg-card"
                                />
                            </div>
                            <div className="ai-agent-node__slot">
                                <span className="ai-agent-node__slot-label">Memory</span>
                                <BaseHandle
                                    position={Position.Bottom}
                                    type="target"
                                    id="memory-target"
                                    className="!absolute !-bottom-[7px] !left-1/2 !-translate-x-1/2 !w-[9px] !h-[9px] !rounded-full !border-2 !border-blue-400 dark:!border-blue-500 !bg-card"
                                />
                            </div>
                            <div className="ai-agent-node__slot">
                                <span className="ai-agent-node__slot-label">Tools</span>
                                <BaseHandle
                                    position={Position.Bottom}
                                    type="target"
                                    id="tool-target"
                                    className="!absolute !-bottom-[7px] !left-1/2 !-translate-x-1/2 !w-[9px] !h-[9px] !rounded-full !border-2 !border-amber-400 dark:!border-amber-500 !bg-card"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ─── Main flow handles ─── */}
                    <BaseHandle
                        position={Position.Left}
                        type="target"
                        id="target-1"
                    />
                    <BaseHandle
                        position={Position.Right}
                        type="source"
                        id="source-1"
                    />
                </div>
            </WorkflowNode>
        </>
    );
});

AiAgentNode.displayName = "AiAgentNode";
