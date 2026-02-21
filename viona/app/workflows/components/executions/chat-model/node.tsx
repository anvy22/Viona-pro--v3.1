"use client";
import { type NodeProps, type Node, Position, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { ChatModelDialog, type ChatModelFormValues, type ProviderKey } from "./dialog";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import Image from "next/image";
import { attachCredentialToNode } from "@/app/credentials/credentials-actions";

type ChatModelNodeData = {
    provider?: ProviderKey;
    model?: string;
    credentialId?: string | null;
};

type ChatModelNodeType = Node<ChatModelNodeData>;

export const ChatModelNode = memo((props: NodeProps<ChatModelNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = async (values: ChatModelFormValues, credentialId: string | null) => {
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
    };

    const nodeData = props.data;
    const providerIcon = nodeData?.provider === "openai"
        ? "/logos/openai.svg"
        : nodeData?.provider === "anthropic"
            ? "/logos/anthropic.svg"
            : "/logos/gemini.svg";

    const description = nodeData?.model
        ? `${nodeData.provider || "gemini"} / ${nodeData.model}`
        : "Not configured";

    return (
        <>
            <ChatModelDialog
                open={open}
                onOpenChange={setOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData as Partial<ChatModelFormValues>}
                defaultCredentialId={nodeData?.credentialId ?? null}
            />
            <WorkflowNode
                name="Chat Model"
                description={description}
                onSettings={handleOpenSettings}
            >
                <BaseNode onDoubleClick={handleOpenSettings}>
                    <BaseNodeContent>
                        <Image src={providerIcon} alt="Chat Model" width={16} height={16} />
                        <BaseHandle position={Position.Top} type="source" id="source-1" />
                    </BaseNodeContent>
                </BaseNode>
            </WorkflowNode>
        </>
    );
});

ChatModelNode.displayName = "ChatModelNode";
