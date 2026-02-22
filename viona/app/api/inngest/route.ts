import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/function";
import { scheduledWorkflowTick } from "@/inngest/scheduled-workflows";

// Create an API route that serves the Inngest endpoint
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        executeWorkflow,
        scheduledWorkflowTick,
    ],
});
