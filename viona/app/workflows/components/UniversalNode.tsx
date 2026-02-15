import { memo } from "react";
import { NodeProps } from "reactflow";
import FlowNode, { FlowNodeData } from "./nodes/FlowNode"; // Correct path
import { getNodeDefinition } from "../action"; // Correct path
import { WorkflowNode, NodePort } from "../types"; // Correct path

export default memo(function UniversalNode({ data, id, selected }: NodeProps<{ node: WorkflowNode }>) {
    const definition = getNodeDefinition(data.node.type);

    if (!definition) {
        return (
            <div className="border border-red-500 p-2 rounded bg-red-50 text-red-500 text-xs">
                Unknown Node Type: {data.node.type}
            </div>
        );
    }

    // Map specific data to label/description if needed, or use default from definition
    // For now, we use the definition's icon and color, and the node's label/data

    const flowNodeData: FlowNodeData = {
        label: definition.label,
        description: definition.description,
        icon: definition.icon,
        color: definition.color,
        category: definition.category, // Pass category
        status: "idle",
        ports: definition.ports, // Pass ports definition
        // We can pass handlers here if we want them on the node actions
    };

    return (
        <FlowNode
            id={id}
            data={flowNodeData}
            selected={selected}
            type={data.node.type} // pass type if needed by FlowNode, though FlowNode doesn't use it yet
            zIndex={100}
            isConnectable={true}
            xPos={0}
            yPos={0}
            dragging={false}
        />
    );
});
