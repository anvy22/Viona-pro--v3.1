"use client";
import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { BaseExecutionNode } from "@/app/workflows/components/executions/base-execution-node";
import { memo, useState } from "react";
import { OpenAiDialog, type OpenAiFormValues } from "./dialog";
import { useNodeStatus } from "@/app/workflows/components/executions/hooks/use-node-status";
import { OPENAI_CHANNEL_NAME} from "@/inngest/channels/openai";
import { fetchOpenAIRealtimeToken } from "@/app/workflows/components/executions/openai/actions";
import { AVAILABLE_MODELS } from "./dialog";

type OpenAiNodeData = {
    variableName?: string;
    model?: string;
    systemPrompt?: string;
    userPrompt?: string;
};

type OpenAiNodeType = Node<OpenAiNodeData>;

export const OpenAiNode = memo((props: NodeProps<OpenAiNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
        nodeId: props.id,
        channel: OPENAI_CHANNEL_NAME,      
        topic: "status",
        refreshToken: fetchOpenAIRealtimeToken,
    });

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = (values: OpenAiFormValues) => {
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
    }

    const nodeData = props.data;
    const description = nodeData?.userPrompt
        ? `${nodeData.model || AVAILABLE_MODELS[0]}: ${nodeData.userPrompt.slice(0, 50)}...`
        : "Not configured";



    return (
        <>
            <OpenAiDialog
                open={open}
                onOpenChange={setOpen}
                onSubmit={handleSubmit}
                defaultValues={nodeData}
            />
            <BaseExecutionNode
                {...props}
                id={props.id}
                icon="/logos/openai.svg"
                name="OpenAI"
                status={nodeStatus}
                description={description}
                onSettings={handleOpenSettings}
                onDoubleClick={handleOpenSettings}

            />
        </>
    );

});

OpenAiNode.displayName = "OpenAiNode";
