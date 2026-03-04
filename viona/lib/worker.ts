import { Worker, type Job } from "bullmq";
import { NodeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { topologicalSort } from "./workflow-utils";
import { getExecutor } from "@/app/(dashboard)/workflows/components/executions/lib/executor-registry";
import { broadcastStatus } from "./status-broadcaster";
import type { WorkflowJobData } from "./queue";

// ---------- Connection config ----------
const connection = {
    host: new URL(process.env.REDIS_URL || "redis://localhost:6379").hostname,
    port: Number(new URL(process.env.REDIS_URL || "redis://localhost:6379").port) || 6379,
};

// ---------- Worker ----------
let workerInstance: Worker | null = null;

export function startWorker() {
    if (workerInstance) return workerInstance;

    workerInstance = new Worker<WorkflowJobData>(
        "workflow-execution",
        async (job: Job<WorkflowJobData>) => {
            const { workflowId, initialData } = job.data;

            // 1. Load & sort workflow nodes
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: { id: workflowId },
                include: { nodes: true, connections: true },
            });
            const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);

            // 2. Build a publish function scoped to this workflow
            const publish = async (nodeId: string, status: "loading" | "success" | "error") => {
                await broadcastStatus(workflowId, nodeId, status);
            };

            // 3. Execute nodes in order
            let context: Record<string, unknown> = initialData || {};
            for (const node of sortedNodes) {
                const executor = getExecutor(node.type as NodeType);
                context = await executor({
                    data: node.data as Record<string, unknown>,
                    nodeId: node.id,
                    context,
                    publish,
                });
            }

            return { workflowId, result: context };
        },
        { connection, concurrency: 5 },
    );

    workerInstance.on("completed", (job) => {
        console.log(`✅ Workflow ${job.data.workflowId} completed`);
    });

    workerInstance.on("failed", (job, err) => {
        console.error(`❌ Workflow ${job?.data.workflowId} failed:`, err.message);
    });

    return workerInstance;
}
