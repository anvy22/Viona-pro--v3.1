import { Connection , Node } from "@prisma/client";
import  toposort  from "toposort";
import { inngest } from "./client";

export const topologicalSort = (nodes: Node[], connections: Connection[]) => {
    // Case 1: No conections
    if (connections.length === 0) {
        return nodes;
    } 
    
    const edges: [string, string][] = connections.map(connection => [
        connection.fromNodeId,
        connection.toNodeId
    ]);
     
    //Add nodes with no connections as self-edges to ensure they are included
    const  connectedNodeId = new Set<string>();
    for ( const conn of connections) {
        connectedNodeId.add(conn.fromNodeId);
        connectedNodeId.add(conn.toNodeId);
    }
    
    for (const node of nodes) {
        if (!connectedNodeId.has(node.id)) {
            edges.push([node.id, node.id]);
        }
    }

    //perform topological sort
    let sortedNodeIds: string[];
    try{

        sortedNodeIds = toposort(edges);
        sortedNodeIds = [...new Set(sortedNodeIds)];
    }catch(error){
       if(error instanceof Error && error.message.includes("Cyclic")){
           throw new Error("Workflow contains a cycle");
       }
       throw error;
    }
    
    //Map sorted IDs back to node Objects
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return sortedNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);

};

export const sendWorkflowExecution = async(data:{
    workflowId: string;
    [key:string]: any;
}) => {
       
     inngest.send({
        name: "workflows/execute.workflow",
        data,
     });
};
