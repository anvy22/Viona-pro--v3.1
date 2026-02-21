import type { NodeExecutor } from "../types";

// Chat Model is a config-only sub-node.
// It does NOT execute independently — the AI Agent reads its data.
export const chatModelExecutor: NodeExecutor = async ({ context }) => {
    return context;
};
