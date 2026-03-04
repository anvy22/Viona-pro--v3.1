"use client";

import { useParams, useRouter } from "next/navigation";
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
        <ChatWindow chatId={chatId} onNewChat={handleNewChat} />
    );
}
