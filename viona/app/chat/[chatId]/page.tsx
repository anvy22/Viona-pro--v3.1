"use client";

import { useParams, useRouter } from "next/navigation";
import DesktopSidebar from "@/components/DesktopSidebar";
import { BreadcrumbHeader } from "@/components/BreadcrumbHeader";
import { ModeToggle } from "@/components/ThemeModeToggle";
import { SignedIn, UserButton } from "@clerk/nextjs";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
    const { chatId } = useParams<{ chatId: string }>();
    const router = useRouter();

    const handleNewChat = () => {
        // Generate new chat ID and navigate
        const newChatId = crypto.randomUUID().slice(0, 8);
        router.push(`/chat/${newChatId}`);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <DesktopSidebar />

            <div className="flex flex-col flex-1 min-h-0">
                {/* Minimal header */}
                <header className="flex items-center justify-between px-6 py-3 border-b border-border/30">
                    <BreadcrumbHeader />
                    <div className="flex items-center gap-3">
                        <ModeToggle />
                        <SignedIn>
                            <UserButton />
                        </SignedIn>
                    </div>
                </header>

                {/* Chat area - full height, clean */}
                <ChatWindow chatId={chatId} onNewChat={handleNewChat} />
            </div>
        </div>
    );
}
