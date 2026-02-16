import type { NodeExecutor } from "../../executions/types";
import { NonRetriableError } from "inngest";
import ky, { KyOptions } from "ky";

type HttpRequestData = {
    endpoint?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: Record<string, string>;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({ data,  nodeId, context, step }) => {
    
    if(!data.endpoint){
        throw new NonRetriableError("Endpoint is required");
    }

    const result  = await step.run("http-request", async () => {
        const endpoint = data.endpoint!;
        const method = data.method || "GET";
        
        const options: KyOptions = { method };

        if(["POST", "PUT", "PATCH"].includes(method)){
            options.body = data.body;
        }

        const response = await ky(endpoint, options);
        const contentType = response.headers.get("content-type");
        const responceData = contentType?.includes("application/json") 
          ? await response.json() 
          : await response.text();

        return {
            ...context,
            httpResponce: {
                status: response.status,
                statusText: response.statusText,
                data: responceData,
            },
        }
    });
    return result;
};