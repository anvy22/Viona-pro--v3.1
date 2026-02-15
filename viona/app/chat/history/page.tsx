"use client";

import DesktopSidebar from "@/components/DesktopSidebar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { SearchBar } from "@/components/SearchBar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { Separator } from "@/components/ui/separator";
import { SignedIn, UserButton } from "@clerk/nextjs";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { ChatSummary } from "../types";

const dummyChats: ChatSummary[] = [
  { id: "1", title: "Inventory Assistant", createdAt: "2024-01-01" },
  { id: "2", title: "Warehouse Planning", createdAt: "2024-01-02" },
];

export default function ChatHistoryPage() {
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar />

      <div className="flex flex-col flex-1 min-h-0">
        <header className="flex items-center justify-between px-6 py-4 h-[50px] gap-4">
          <BreadcrumbHeader />
          <SearchBar />
          <NotificationDropdown />
          <div className="flex items-center gap-4">
            <ModeToggle />
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </header>

        <Separator />

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
      </div>
    </div>
  );
}
