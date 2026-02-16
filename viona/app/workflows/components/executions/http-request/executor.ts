import type { NodeExecutor } from "../../executions/types";
import { NonRetriableError } from "inngest";
import ky, { Options } from "ky";
import Handlebars from "handlebars";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    const safeString = new Handlebars.SafeString(jsonString);
    
    return safeString;
});

type HttpRequestData = {
    variableName: string;
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: Record<string, string>;
}

export const httpRequestExecutor: NodeExecutor<HttpRequestData> = async ({ data, nodeId, context, step }) => {

    if (!data.endpoint) {
        throw new NonRetriableError("HTTP Request node: No endpoint configured");
    }

    if (!data.variableName) {
        throw new NonRetriableError("HTTP Request node: No variable name configured");
    }

    if (!data.method) {
        throw new NonRetriableError("HTTP Request node: No method configured");
    }

    const result = await step.run("http-request", async () => {
        const endpoint = Handlebars.compile(data.endpoint)(context);
        const method = data.method;

        const options: Options = { method };

        if (["POST", "PUT", "PATCH"].includes(method)) {
            const resolved = Handlebars.compile(data.body || "{}")(context);
            options.json = JSON.parse(resolved);
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
            httpResponse: {
                status: response.status,
                statusText: response.statusText,
                data: responceData,
            },
        }

        return {
            ...context,
            [data.variableName]: responsePayload,
        };
    });
    return result;
};