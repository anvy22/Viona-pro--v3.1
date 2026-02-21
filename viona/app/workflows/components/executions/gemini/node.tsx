"use client";
import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { BaseExecutionNode } from "@/app/workflows/components/executions/base-execution-node";
import { memo, useState } from "react";
import { GeminiDialog, type GeminiFormValues } from "./dialog";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { GEMINI_CHANNEL_NAME } from "@/inngest/channels/gemini";
import { fetchGeminiRealtimeToken } from "@/app/workflows/components/executions/gemini/actions";
import { AVAILABLE_MODELS } from "./dialog";
import { attachCredentialToNode } from "@/app/credentials/credentials-actions";

type GeminiNodeData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
    credentialId?: string | null;
};

type GeminiNodeType = Node<GeminiNodeData>;

export const GeminiNode = memo((props: NodeProps<GeminiNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: GEMINI_CHANNEL_NAME,
        topic: "status",
        refreshToken: fetchGeminiRealtimeToken,
    });

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = async (values: GeminiFormValues, credentialId: string | null) => {
        // Persist credentialId to the DB so the executor can look it up
        try {
            await attachCredentialToNode(props.id, credentialId);
        } catch (err) {
            console.error("Failed to attach credential to node", err);
        }

        setNodes((nodes) => {
            return nodes.map((node) => {
                if (node.id === props.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...values,
                            credentialId,
                        },
                    };
                }
                return node;
            });
        });
    }

    const nodeData = props.data;
    const description = nodeData?.userPrompt
        ? `${nodeData.model || AVAILABLE_MODELS[0]}: ${nodeData.userPrompt.slice(0, 50)}...`
        : "Not configured";



    return (
        <>
            <GeminiDialog
                open={open}
                onOpenChange={setOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
                defaultCredentialId={nodeData?.credentialId ?? null}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/gemini.svg"
                name="Gemini"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}
            />
        </>
    );

});

GeminiNode.displayName = "GeminiNode";
