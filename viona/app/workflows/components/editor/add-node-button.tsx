"use client";

import { PlusIcon } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";


export const AddNodeButton = memo(() => {
    return(
        <Button
        variant="outline"
        size="icon"
        className="bg-background"
        onClick={() => {}}
        >
            <PlusIcon/>
        </Button>
    )
});

AddNodeButton.displayName = "AddNodeButton";
