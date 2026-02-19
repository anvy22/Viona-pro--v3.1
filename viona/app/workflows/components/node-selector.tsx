"use client"

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import {
    GlobeIcon,
    MousePointerIcon,
} from "lucide-react"
import { useCallback } from "react";
import { toast } from "sonner";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { NodeType } from "@prisma/client"
import { Separator } from "@/components/ui/separator";


export type NodeTypeOption = {
    type: NodeType,
    label: string,
    description: string,
    icon: React.ComponentType<{ className?: string }> | string;
};

const triggerNodes: NodeTypeOption[] = [
    {
        type: NodeType.MANUAL_TRIGGER,
        label: "Trigger manually",
        description: "Runs the flow on clicking a button",
        icon: MousePointerIcon,
    },
    {
        type: NodeType.GOOGLE_FORM_TRIGGER,
        label: "Google Form Trigger",
        description: "Runs the flow when a Google Form is submitted",
        icon: "/logos/googleform.svg",
    },
    {
        type: NodeType.STRIPE_TRIGGER,
        label: "Stripe Event",
        description: "Runs the flow when a Stripe event is triggered",
        icon: "/logos/stripe.svg",
    },

];

const executionNodes: NodeTypeOption[] = [
    {
        type: NodeType.HTTP_REQUEST,
        label: "HTTP Request",
        description: "Send an HTTP request",
        icon: GlobeIcon,
    },
];

interface NodeSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function NodeSelector({
    open,
    onOpenChange,
    children,
}: NodeSelectorProps) {
    const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();


    const handleNodeSelect = useCallback((selection: NodeTypeOption) => {
        if(selection.type === NodeType.MANUAL_TRIGGER){
            const nodes = getNodes();
            const hasManualTrigger = nodes.some(node => node.type === NodeType.MANUAL_TRIGGER);
            if(hasManualTrigger){
                toast.error("Only one manual trigger node is allowed per workflow");
                return;
            }}
            setNodes((nodes) => {
                const hasInitialTrigger = nodes.some(node => node.type === NodeType.INITIAL);
                
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2

                const flowPosition = screenToFlowPosition({
                    x: centerX + (Math.random() - 0.5) * 200,
                    y: centerY + (Math.random() - 0.5) * 200,
                });

                const newNode = {
                    id: createId(),
                    type: selection.type,
                    position: flowPosition,
                    data: {},
                };

                if(hasInitialTrigger){
                    return [newNode];
                }
                
                return [...nodes, newNode];
            });
         onOpenChange(false);
    },[setNodes, onOpenChange, getNodes, screenToFlowPosition]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>What triggers this workflow?</SheetTitle>
                    <SheetDescription>
                        A trigger node is the first node in a workflow. It is the node that starts the workflow.
                    </SheetDescription>
                </SheetHeader>
                <div>
                    {triggerNodes.map((nodeType) => {
                        const Icon = nodeType.icon;

                        return (
                            <div
                                key={nodeType.type}
                                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                                onClick={() => handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof Icon === "string" ? (
                                        <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                                    ) : (
                                        <Icon className="size-5" />
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">{nodeType.label}</span>
                                        <span className="text-muted-foreground text-xs">{nodeType.description}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Separator />
                <div>
                    {executionNodes.map((nodeType) => {
                        const Icon = nodeType.icon;

                        return (
                            <div
                                key={nodeType.type}
                                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                                onClick={() => handleNodeSelect(nodeType)}
                            >
                                <div className="flex items-center gap-6 w-full overflow-hidden">
                                    {typeof Icon === "string" ? (
                                        <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                                    ) : (
                                        <Icon className="size-5" />
                                    )}
                                    <div className="flex flex-col items-start text-left">
                                        <span className="font-medium text-sm">{nodeType.label}</span>
                                        <span className="text-muted-foreground text-xs">{nodeType.description}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </SheetContent>
        </Sheet>
    )
}