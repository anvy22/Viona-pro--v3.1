"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import DesktopSidebar from "@/components/DesktopSidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";

import { getWorkflowWithNodes, WorkflowWithNodesAndEdges } from "../workflow-actions";
import { Editor } from "../components/editor/editor";

export default function WorkflowPage() {
    const params = useParams();
    const router = useRouter();
    const workflowId = params.workflowId as string;

    const [workflow, setWorkflow] = useState<WorkflowWithNodesAndEdges | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWorkflow = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getWorkflowWithNodes(workflowId);
            setWorkflow(data);
        } catch {
            toast.error("Failed to load workflow");
        } finally {
            setIsLoading(false);
        }
    }, [workflowId]);

    useEffect(() => {
        fetchWorkflow();
    }, [fetchWorkflow]);

    return (
        <div className="flex h-screen bg-muted/40">
            <DesktopSidebar />

            <div className="flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-center gap-4 px-8 py-4 bg-background border-b">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>

                    <h1 className="text-xl font-semibold tracking-tight">
                        {workflow?.name || "Workflow"}
                    </h1>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full">
                            <LoadingSpinner />
                        </div>
                    )}

                    {!isLoading && !workflow && (
                        <div className="flex items-center justify-center h-full">
                            <Card className="p-8 text-center max-w-md shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Workflow Not Found
                                </h2>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    The workflow you are looking for does not exist.
                                </p>

                                <Button
                                    variant="outline"
                                    className="mt-6"
                                    onClick={() => router.push("/workflows")}
                                >
                                    Back to Workflows
                                </Button>
                            </Card>
                        </div>
                    )}

                    {!isLoading && workflow && (
                        <Editor workflowId={workflowId} />
                    )}
                </div>
            </div>
        </div>
    );
}
