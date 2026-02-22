import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { scheduledTriggerChannel } from "./channels/scheduled-trigger";
import { NodeType } from "@prisma/client";


export const scheduledWorkflowTick = inngest.createFunction(
    {
        id: "scheduled-workflow-tick",
        retries: 0,
    },
    {
        cron: "* * * * *", 
        channels: [scheduledTriggerChannel()],
    },
    async ({ step }) => {
        const matchingWorkflows = await step.run("find-scheduled-workflows", async () => {
            const nodes = await prisma.node.findMany({
                where: { type: NodeType.SCHEDULED_TRIGGER },
                include: { workflow: { select: { id: true, status: true } } },
            });

           
            const now = new Date();
            const results: Array<{ workflowId: string; nodeId: string; cronExpression: string }> = [];

            for (const node of nodes) {
                if (node.workflow.status === "deleted") continue;

                const data = node.data as any;
                const cronExpr = data?.cronExpression;
                if (!cronExpr) continue;

                if (cronMatchesNow(cronExpr, now)) {
                    results.push({
                        workflowId: node.workflow.id,
                        nodeId: node.id,
                        cronExpression: cronExpr,
                    });
                }
            }

            return results;
        });

        
        for (const match of matchingWorkflows) {
            await step.run(`trigger-${match.workflowId}`, async () => {
                await inngest.send({
                    name: "workflows/execute.workflow",
                    data: {
                        workflowId: match.workflowId,
                        initialData: {
                            schedule: {
                                triggeredAt: new Date().toISOString(),
                                cronExpression: match.cronExpression,
                            },
                        },
                    },
                });
            });
        }

        return { triggered: matchingWorkflows.length };
    },
);


function cronMatchesNow(expression: string, now: Date): boolean {
    const parts = expression.trim().split(/\s+/);
    if (parts.length < 5) return false;

    const fields = [
        now.getMinutes(), 
        now.getHours(),   
        now.getDate(),  
        now.getMonth() + 1, 
        now.getDay(),       
    ];

    for (let i = 0; i < 5; i++) {
        if (!fieldMatches(parts[i], fields[i])) return false;
    }
    return true;
}

function fieldMatches(pattern: string, value: number): boolean {
    const alternatives = pattern.split(",");
    return alternatives.some((alt) => singleFieldMatches(alt.trim(), value));
}

function singleFieldMatches(pattern: string, value: number): boolean {
    if (pattern === "*") return true;


    if (pattern.includes("/")) {
        const [rangePart, stepStr] = pattern.split("/");
        const stepVal = parseInt(stepStr, 10);
        if (isNaN(stepVal) || stepVal <= 0) return false;

        if (rangePart === "*") {
            return value % stepVal === 0;
        }
        if (rangePart.includes("-")) {
            const [startStr, endStr] = rangePart.split("-");
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            return value >= start && value <= end && (value - start) % stepVal === 0;
        }
        return false;
    }


    if (pattern.includes("-")) {
        const [startStr, endStr] = pattern.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        return value >= start && value <= end;
    }


    return parseInt(pattern, 10) === value;
}
