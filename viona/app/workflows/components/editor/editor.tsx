"use client";

import { useState, useCallback, useEffect } from 'react';
import {
    ReactFlow,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    type Node,
    type Edge,
    type Connection,
    ConnectionMode,
    Background,
    MiniMap,
    Controls,
    Panel,
    useReactFlow,
    type NodeChange,
    type EdgeChange,
} from "@xyflow/react";

import '@xyflow/react/dist/style.css';
import { getWorkflowWithNodes } from '../../workflow-actions';
import { nodeComponents } from '@/config/node-components';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AddNodeButton } from './add-node-button';

export const EditorLoading = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
        </div>
    );
};

export const EditorError = () => {
    return (
        <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <h2 className="text-lg font-semibold">Error Loading Editor</h2>
                <p className="text-muted-foreground text-sm mt-2">
                    Failed to load workflow data
                </p>
            </div>
        </div>
    );
};

export const Editor = ({ workflowId }: { workflowId: string }) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadWorkflow() {
            try {
                setIsLoading(true);
                const workflow = await getWorkflowWithNodes(workflowId);

                if (workflow) {
                    setNodes(workflow.nodes);
                    setEdges(workflow.edges);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Failed to load workflow:", err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        }

        loadWorkflow();
    }, [workflowId]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
        [],
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
        [],
    );
    const onConnect = useCallback(
        (params: Connection) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
        [],
    );

    if (isLoading) {
        return <EditorLoading />;
    }

    if (error) {
        return <EditorError />;
    }

    return (
        <div className='size-full'>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                proOptions={{
                    hideAttribution: true,
                }}
                nodeTypes={nodeComponents}
            >
                <Background />
                <Controls />
                <MiniMap />
                <Panel position="top-right" >
                    <AddNodeButton />
                </Panel>
            </ReactFlow>
        </div>
    );
};
