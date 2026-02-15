import { NodeProps  } from "@xyflow/react";
import { MousePointerIcon } from "lucide-react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { ManualTriggerDialog } from "./dialog";

export const ManualTriggerNode = memo((props: NodeProps) => {
    const [open, setOpen] = useState(false);
    const nodeStatus = "initial";
    const handleOpenSettings = () => setOpen(true);
    return (
        <>
        <ManualTriggerDialog 
            open={open} 
            onOpenChange={setOpen} 
            />
           <BaseTriggerNode
               {...props} 
               icon={MousePointerIcon} 
               name="When clicking 'Execute workflow" 
               status={nodeStatus}
               onSettings={handleOpenSettings}
               onDoubleClick={handleOpenSettings}
            />
        </>
    )
});