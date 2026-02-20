import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { topologicalSort } from "./utils";
import { NodeType } from "@prisma/client";
import { getExecutor } from "@/app/workflows/components/executions/lib/executor-registry";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { googleFormTriggerChannel } from "./channels/google-form-trigger";
import { stripeTriggerChannel } from "./channels/stripe-trigger";
import { geminiChannel } from "./channels/gemini";
import { openaiChannel } from "./channels/openai";
import { anthropicChannel } from "./channels/anthropic";

export const executeWorkflow = inngest.createFunction(
    { 
        id: "execute-workflow",
        retries: 0,// TODO: Add retries
     },
    {
        event: "workflows/execute.workflow",
        channels: [
            httpRequestChannel(),
            manualTriggerChannel(),
            googleFormTriggerChannel(),
            stripeTriggerChannel(),
            geminiChannel(),
            openaiChannel(),
            anthropicChannel(),
        ],
    },
    async ({ event, step, publish }) => {
        const workflowId = event.data.workflowId;


        if (!workflowId) {
            throw new NonRetriableError("Workflow ID is required");
        }

        const sortedNodes = await step.run("prepare-workflow", async () => {
            const workflow = await prisma.workflow.findUniqueOrThrow({
                where: { id: workflowId },
                include: {
                    nodes: true,
                    connections: true,
                },
            });

            return topologicalSort(workflow.nodes, workflow.connections);
        });

        //Initailize the context with any initail data from the trigger
        let context = event.data.initialData || {};

        for (const node of sortedNodes) {
            const executor = getExecutor(node.type as NodeType);
            context = await executor({
                data: node.data as Record<string, unknown>,
                nodeId: node.id,
                context,
                step,
                publish,
            });
        }

        return {
            workflowId,
            result: context,
        };

    }
);
