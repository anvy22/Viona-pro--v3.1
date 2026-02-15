"use client";
import type { NodeProps, Node } from "@xyflow/react";
import { GlobeIcon } from "lucide-react";
import { BaseExecutionNode } from "@/app/workflows/components/executions/base-execution-node";
import { memo } from "react";

type HttpRequestNodeData =  {
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" ;
    body?: string;
    [key: string]: unknown;
};

type HttpRequestNodeType = Node<HttpRequestNodeData>;

export const HttpRequestNode = memo((props: NodeProps<HttpRequestNodeType>) => {
    const nodeData = props.data;
    const description = nodeData?.endpoint
       ? `${nodeData.method || "GET"}: ${nodeData.endpoint}`
       : "Not configured";

       return (
           <>
                 <BaseExecutionNode
                    {...props}
                    id={props.id}
                    icon={GlobeIcon}
                    name="HTTP Request"
                    description={description}
                    onSettings={ () => {}}
                    onDoubleClick={ () => {}}

                />
            </>
       );

});

HttpRequestNode.displayName = "HttpRequestNode";
