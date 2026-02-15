"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkflowActionsMenu } from "./WorkflowActionsMenu";

import { WorkflowListItem } from "../types";

interface WorkflowCardProps {
  workflow: WorkflowListItem;
  onUpdate: () => void;
  onDelete: () => void;
  canManage: boolean;
}

export function WorkflowCard({ workflow, onUpdate, onDelete, canManage }: WorkflowCardProps) {
  return (
    <Card className="p-4 hover:bg-muted transition cursor-pointer relative">
      <Link href={`/workflows/${workflow.id}`} className="block">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold">{workflow.name}</h3>
          <div className="flex items-center gap-3 left-2">
            <Badge variant="secondary">{workflow.status}</Badge>
          </div>
        </div>

        {workflow.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {workflow.description}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Updated {new Date(workflow.updatedAt).toLocaleString()}
        </p>
      </Link>

      {canManage && (
        <div className="absolute top-3 right-0.5">
          <WorkflowActionsMenu
            workflow={workflow}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}
    </Card>
  );
}
