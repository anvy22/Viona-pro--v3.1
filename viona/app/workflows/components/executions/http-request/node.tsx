"use client";
import { type NodeProps, type Node, useReactFlow } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { BaseExecutionNode } from "@/app/workflows/components/executions/base-execution-node";
import { memo, useState } from "react";
import { HttpRequestDialog } from "./dialog";

type HttpRequestNodeData =  {
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" ;
    body?: string;
    [key: string]: unknown;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
    const [open, setOpen] = useState(false);
    const { setNodes  } = useReactFlow();

    const nodeStatus = "initial"

    const handleOpenSettings = () => setOpen(true);

    const handleSubmit = (values: { endpoint: string; method: string, body?: string}) => {
        setNodes((nodes) => {
            return nodes.map((node) => {
                if (node.id === props.id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            endpoint: values.endpoint,
                            method: values.method,
                            body: values.body,
                        },
                    };
                }
                return node;
            });
        });
    }

    const nodeData = props.data;
    const description = nodeData?.endpoint
       ? `${nodeData.method || "GET"}: ${nodeData.endpoint}`
       : "Not configured";

       

       return (
           <>
               <HttpRequestDialog 
                   open={open} 
                   onOpenChange={setOpen} 
                   onSubmit={handleSubmit}
                   defaultEndpoint={nodeData.endpoint}
                   defaultMethod={nodeData.method}
                   defaultBody={nodeData.body}
               />
                 <BaseExecutionNode
                    {...props}
                    id={props.id}
                    icon={GlobeIcon}
                    name="HTTP Request"
                    status={nodeStatus}
                    description={description}
                    onSettings={handleOpenSettings}
                    onDoubleClick={handleOpenSettings}

                />
            </>
       );

});

HttpRequestNode.displayName = "HttpRequestNode";
