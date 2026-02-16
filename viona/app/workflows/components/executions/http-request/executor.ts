import type { NodeExecutor } from "../../executions/types";
import { NonRetriableError } from "inngest";
import ky, { Options } from "ky";

type HttpRequestData = {
    variableName?: string;
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: Record<string, string>;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({ data, nodeId, context, step }) => {

    if (!data.endpoint) {
        throw new NonRetriableError("HTTP Request node: No endpoint configured");
    }

    if (!data.variableName) {
        throw new NonRetriableError("HTTP Request node: No variable name configured");
    }

    const result = await step.run("http-request", async () => {
        const endpoint = data.endpoint!;
        const method = data.method || "GET";

        const options: Options = { method };

        if (["POST", "PUT", "PATCH"].includes(method)) {
            options.json = data.body;
            options.headers = {
                "Content-Type": "application/json",
            };
        }

        const response = await ky(endpoint, options);
        const contentType = response.headers.get("content-type");
        const responceData = contentType?.includes("application/json")
            ? await response.json()
            : await response.text();

        const responsePayload = {
            httpResponce: {
                status: response.status,
                statusText: response.statusText,
                data: responceData,
            },
        }

       if (data.variableName) {
           return {
               ...context,
               [data.variableName]: responsePayload,
           }
       }

       return{
          ...context,
          ...responsePayload,
       }
    });
    return result;
};