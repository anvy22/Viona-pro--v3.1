"use server";

import { prisma } from "@/lib/prisma";
import { type Node, type Edge } from "@xyflow/react";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";

export type WorkflowWithNodesAndEdges = {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
};

export async function getWorkflowWithNodes(
    workflowId: string
): Promise<WorkflowWithNodesAndEdges | null> {
    const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
            nodes: true,
            connections: true,
        },
    });

    if (!workflow) return null;

    // Transform server nodes to react-flow compatible nodes
    const nodes: Node[] = workflow.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: (node.data as Record<string, unknown>) || {},
    }));

    // Transform server connections to react-flow compatible edges
    const edges: Edge[] = workflow.connections.map((connection) => ({
        id: connection.id,
        source: connection.fromNodeId,
        target: connection.toNodeId,
        sourceHandle: connection.fromOutput,
        targetHandle: connection.toInput,
    }));

    return {
        id: workflow.id,
        name: workflow.name,
        nodes,
        edges,
    };
}

async function getUserIdFromClerkId(clerkId: string): Promise<bigint | null> {
    const user = await prisma.user.findUnique({
        where: { clerk_id: clerkId },
        select: { user_id: true },
    });
    return user?.user_id || null;
}

export async function getWorkflowsForOrg(orgId: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const workflows = await prisma.workflow.findMany({
        where: { org_id: BigInt(orgId) },
        orderBy: { updated_at: 'desc' },
        select: {
            id: true,
            name: true,
            // description: true, // UNCOMMENT AFTER RESTARTING SERVER
            // status: true,      // UNCOMMENT AFTER RESTARTING SERVER
            created_at: true,
            updated_at: true,
        },
    });

    return workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: null, // w.description,
        status: "draft",   // w.status || "draft",
        createdAt: w.created_at.toISOString(),
        updatedAt: w.updated_at.toISOString(),
    }));
}

export async function deleteWorkflowById(workflowId: string) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    await prisma.workflow.delete({
        where: { id: workflowId },
    });

    return { success: true };
}

export async function updateWorkflowMetadataDb(
    workflowId: string,
    updates: { name?: string; description?: string }
) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: {
            ...(updates.name && { name: updates.name }),
            ...(updates.description !== undefined && { description: updates.description }),
        },
        select: { id: true, name: true },
    });

    return workflow;
}

export async function createWorkflowWithInitialNode(input: {
    name: string;
    orgId: string;
}) {
    const { userId: clerkId } = await auth();
    if (!clerkId) throw new Error("Unauthorized");

    const userId = await getUserIdFromClerkId(clerkId);
    if (!userId) throw new Error("User not found in database");

    const workflow = await prisma.workflow.create({
        data: {
            name: input.name,
            org_id: BigInt(input.orgId),
            user_id: userId,
            nodes: {
                create: {
                    name: "Start",
                    type: "INITIAL",
                    position: { x: 250, y: 100 },
                    data: {},
                },
            },
        },
        include: {
            nodes: true,
            connections: true,
        },
    });

    return {
        id: workflow.id,
        name: workflow.name,
    };
}

export async function updateWorkflowNodes(
    workflowId: string,
    nodes: Node[],
    edges: Edge[]
) {
    // Delete existing nodes and connections
    await prisma.connection.deleteMany({
        where: { workflowId },
    });

    await prisma.node.deleteMany({
        where: { workflowId },
    });

    // Create new nodes
    await prisma.node.createMany({
        data: nodes.map((node) => ({
            id: node.id,
            workflowId,
            name: (node.data?.label as string) || "Node",
            type: "INITIAL", // TODO: Update Schema to support other types
            position: node.position as Prisma.InputJsonValue,
            data: node.data as Prisma.InputJsonValue,
        })),
    });

    // Create new connections
    if (edges.length > 0) {
        await prisma.connection.createMany({
            data: edges.map((edge) => ({
                id: edge.id,
                workflowId,
                fromNodeId: edge.source,
                toNodeId: edge.target,
                fromOutput: edge.sourceHandle || "main",
                toInput: edge.targetHandle || "main",
            })),
        });
    }

    return { success: true };
}
