"use client";

import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { ChatSummary } from "../types";

const dummyChats: ChatSummary[] = [
  { id: "1", title: "Inventory Assistant", createdAt: "2024-01-01" },
  { id: "2", title: "Warehouse Planning", createdAt: "2024-01-02" },
];

export default function ChatHistoryPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6 space-y-3">
      {dummyChats.map(chat => (
        <Card key={chat.id} className="p-4 hover:bg-muted">
          <Link href={`/chat/${chat.id}`}>
            <div className="font-medium">{chat.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(chat.createdAt).toLocaleDateString()}
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
