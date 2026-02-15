"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSelectedOrg } from "@/hooks/useOrgStore";
import ChatMessage from "./ChatMessages";
import ChatInput from "./ChatInput";
import type { ChatMessage as Message, AgentOutput } from "../types";
import { Plus, History, X, Trash2, MessageSquare } from "lucide-react";
import {
    fetchSessions,
    fetchSession,
    deleteSession,
    type ChatSession
} from "../lib/sessions";

// WebSocket message types
type WSMessageType = "connected" | "stream" | "complete" | "tool_update" | "error";

interface WSMessage {
    type: WSMessageType;
    session_id?: string;
    message_id?: string;
    output?: AgentOutput;
    delta?: string;
    tool?: string;
    status?: string;
    message?: string;
}

const AI_AGENT_WS_URL = process.env.NEXT_PUBLIC_AI_AGENT_WS_URL || "ws://localhost:8000";

interface ChatWindowProps {
    chatId: string;
    onNewChat?: () => void;
}

export default function ChatWindow({ chatId, onNewChat }: ChatWindowProps) {
    const { getToken } = useAuth();
    const selectedOrgId = useSelectedOrg();

    const [messages, setMessages] = useState<Message[]>([]);
    const [streamingContent, setStreamingContent] = useState<string>("");
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Session state - persist in sessionStorage to avoid creating new sessions on page revisit
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return sessionStorage.getItem('chat_session_id');
        }
        return null;
    });
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const currentSessionIdRef = useRef<string | null>(
        typeof window !== 'undefined' ? sessionStorage.getItem('chat_session_id') : null
    );
    const streamingMessageIdRef = useRef<string | null>(null);
    const tokenRef = useRef<string | null>(null);
    const hasInitializedRef = useRef(false);
    const selectedOrgIdRef = useRef(selectedOrgId);

    // Keep ref in sync with state
    useEffect(() => {
        selectedOrgIdRef.current = selectedOrgId;
    }, [selectedOrgId]);

    // Smart scroll - only auto-scroll if user is near the bottom
    const scrollToBottomIfNeeded = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const threshold = 150; // pixels from bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;

        if (isNearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, []);

    // Scroll on new messages only if near bottom
    useEffect(() => {
        scrollToBottomIfNeeded();
    }, [messages, streamingContent, scrollToBottomIfNeeded]);

    // Load sessions when history panel is opened
    const loadSessions = useCallback(async () => {
        if (!selectedOrgId) return;

        try {
            setLoadingSessions(true);
            const token = await getToken();
            if (!token) return;

            tokenRef.current = token;
            const sessionList = await fetchSessions(token, selectedOrgId);
            setSessions(sessionList);
        } catch (err) {
            console.error("Failed to load sessions:", err);
        } finally {
            setLoadingSessions(false);
        }
    }, [getToken, selectedOrgId]);

    // Load sessions when sidebar opens
    useEffect(() => {
        if (showHistory) {
            loadSessions();
        }
    }, [showHistory, loadSessions]);

    // Persist session ID to sessionStorage
    const persistSessionId = (sessionId: string) => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('chat_session_id', sessionId);
        }
        setCurrentSessionId(sessionId);
        currentSessionIdRef.current = sessionId;
    };

    // Clear session from storage (for new chat)
    const clearPersistedSession = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('chat_session_id');
        }
        setCurrentSessionId(null);
        currentSessionIdRef.current = null;
    };

    // Handle incoming WebSocket messages
    const handleWSMessage = (data: WSMessage) => {
        switch (data.type) {
            case "connected":
                // Store session_id from server and persist it
                if (data.session_id) {
                    persistSessionId(data.session_id);
                }
                break;

            case "stream":
                // Append streaming text
                if (data.delta) {
                    setStreamingContent(prev => prev + data.delta);
                }
                break;

            case "tool_update":
                // Show tool status in streaming
                if (data.status === "running") {
                    setStreamingContent(`Analyzing ${data.tool?.replace(/_/g, " ")}...`);
                }
                break;

            case "complete":
                setIsLoading(false);
                setStreamingContent("");
                if (data.output) {
                    const output = data.output;
                    setMessages(prev => [
                        ...prev,
                        {
                            id: data.message_id || crypto.randomUUID(),
                            role: "assistant",
                            content: output.summary,
                            agentOutput: output
                        }
                    ]);
                }
                // Update session_id if provided and persist it
                if (data.session_id) {
                    persistSessionId(data.session_id);
                }
                streamingMessageIdRef.current = null;
                break;

            case "error":
                setIsLoading(false);
                setStreamingContent("");
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: data.message || "An error occurred"
                    }
                ]);
                break;
        }
    };

    // Load existing session if we have a persisted one
    const loadExistingSession = async (sessionId: string, token: string) => {
        if (!selectedOrgIdRef.current) return;

        try {
            const detail = await fetchSession(token, selectedOrgIdRef.current, sessionId);

            // Convert to Message type
            const loadedMessages: Message[] = detail.messages.map((m, i) => ({
                id: `${sessionId}-${i}`,
                role: m.role as "user" | "assistant",
                content: m.content,
                agentOutput: m.agent_output as AgentOutput | undefined
            }));

            setMessages(loadedMessages);
        } catch (err) {
            console.error("Failed to load existing session:", err);
            // Session might be invalid, clear it
            clearPersistedSession();
        }
    };

    // Connect to WebSocket - standalone function, not useCallback
    const connectWebSocket = async (token: string, sessionId?: string) => {
        if (!selectedOrgIdRef.current) return;

        if (wsRef.current) {
            wsRef.current.close();
        }

        // Use provided sessionId, or fall back to stored session
        const sessionToUse = sessionId ?? currentSessionIdRef.current;

        // Include session_id in connection if we have one
        let wsUrl = `${AI_AGENT_WS_URL}/ws/chat?token=${token}&org_id=${selectedOrgIdRef.current}`;
        if (sessionToUse) {
            wsUrl += `&session_id=${sessionToUse}`;
        }

        const ws = new WebSocket(wsUrl);

        // Ping interval to keep connection alive
        let pingInterval: NodeJS.Timeout | null = null;

        ws.onopen = () => {
            setIsConnected(true);
            setError(null);

            // Start ping keepalive every 3 seconds
            pingInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "ping" }));
                }
            }, 3000);
        };

        ws.onmessage = (event) => {
            const data: WSMessage = JSON.parse(event.data);
            // Ignore pong messages
            if ((data as any).type === "pong") return;
            handleWSMessage(data);
        };

        ws.onerror = () => {
            setError("Connection error");
            setIsConnected(false);
            if (pingInterval) clearInterval(pingInterval);
        };

        ws.onclose = () => {
            setIsConnected(false);
            if (pingInterval) clearInterval(pingInterval);

            // Reconnect after 5 seconds if not intentionally closed
            reconnectTimeoutRef.current = setTimeout(async () => {
                if (selectedOrgIdRef.current && tokenRef.current) {
                    await connectWebSocket(tokenRef.current, currentSessionIdRef.current || undefined);
                }
            }, 5000);
        };

        wsRef.current = ws;
    };

    // Store getToken in a ref to avoid dependency issues
    const getTokenRef = useRef(getToken);
    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    // Initialize on mount - only runs once when selectedOrgId is available
    useEffect(() => {
        if (hasInitializedRef.current) return;
        if (!selectedOrgId) return;

        hasInitializedRef.current = true;

        const initializeChat = async () => {
            try {
                const token = await getTokenRef.current();
                if (!token) {
                    setError("Authentication required");
                    return;
                }

                tokenRef.current = token;

                // If we have a persisted session, load its messages first
                if (currentSessionIdRef.current) {
                    await loadExistingSession(currentSessionIdRef.current, token);
                }

                // Then connect (will use persisted session if available)
                await connectWebSocket(token);
            } catch (err) {
                console.error("Failed to initialize chat:", err);
                setError("Failed to connect");
            }
        };

        initializeChat();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOrgId]);

    // Handle sending messages
    const handleSend = (content: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            setError("Not connected");
            return;
        }

        // Add user message
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content
        };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setStreamingContent("");
        streamingMessageIdRef.current = crypto.randomUUID();

        // Send to server with session_id
        wsRef.current.send(JSON.stringify({
            type: "message",
            content,
            session_id: currentSessionId,
            message_id: streamingMessageIdRef.current
        }));
    };

    // Handle new chat - only this should create a new session
    const handleNewChat = async () => {
        setMessages([]);
        setStreamingContent("");
        setError(null);
        clearPersistedSession();

        // Clear reconnect timeout to prevent old session reconnection
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        // Reconnect without session_id to get a new session  
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Get fresh token and connect without session
        try {
            const token = await getToken();
            if (token) {
                tokenRef.current = token;
                await connectWebSocket(token, undefined);
            }
        } catch (err) {
            console.error("Failed to create new chat:", err);
            setError("Failed to create new chat");
        }

        onNewChat?.();
    };

    // Handle selecting a session from history
    const handleSelectSession = async (session: ChatSession) => {
        if (!selectedOrgId) return;

        try {
            // Get fresh token
            const token = await getToken();
            if (!token) {
                setError("Authentication required");
                return;
            }
            tokenRef.current = token;

            // Load the session messages
            const detail = await fetchSession(token, selectedOrgId, session.id);

            // Convert to Message type
            const loadedMessages: Message[] = detail.messages.map((m, i) => ({
                id: `${session.id}-${i}`,
                role: m.role as "user" | "assistant",
                content: m.content,
                agentOutput: m.agent_output as AgentOutput | undefined
            }));

            setMessages(loadedMessages);
            persistSessionId(session.id);
            setShowHistory(false);

            // Clear reconnect timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            // Reconnect with this session
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            await connectWebSocket(token, session.id);
        } catch (err) {
            console.error("Failed to load session:", err);
            setError("Failed to load session");
        }
    };

    // Handle deleting a session
    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!selectedOrgId || !tokenRef.current) return;

        try {
            await deleteSession(tokenRef.current, selectedOrgId, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));

            // If we deleted the current session, start a new one
            if (sessionId === currentSessionId) {
                handleNewChat();
            }
        } catch (err) {
            console.error("Failed to delete session:", err);
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex flex-1 min-h-0 relative">
            {/* Main chat area */}
            <div className="flex flex-col flex-1 min-h-0">
                {/* Header with New Chat and History */}
                <div className="flex items-center justify-between px-6 py-3">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </button>

                    {/* History button */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-muted/50 ${showHistory ? 'text-foreground bg-muted/50' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        History
                    </button>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="px-6 py-2 text-sm text-red-500 text-center">
                        {error}
                    </div>
                )}

                {/* Messages area - clean, no boxed panels */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                        {/* Empty state */}
                        {messages.length === 0 && !streamingContent && (
                            <div className="text-center py-20">
                                <h2 className="text-2xl font-semibold text-foreground mb-2">
                                    How can I help you today?
                                </h2>
                                <p className="text-muted-foreground">
                                    Ask me about your inventory, orders, or business analytics.
                                </p>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.map(msg => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}

                        {/* Streaming content */}
                        {streamingContent && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">Viona</div>
                                <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                                    {streamingContent}
                                    <span className="inline-block w-2 h-4 bg-foreground/60 ml-1 animate-pulse" />
                                </div>
                            </div>
                        )}

                        {/* Loading indicator */}
                        {isLoading && !streamingContent && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">Viona</div>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        )}

                        <div ref={bottomRef} className="h-8" />
                    </div>
                </div>

                {/* Input area - subtle separator only */}
                <div className="border-t border-border/30">
                    <div className="max-w-3xl mx-auto px-6 py-4">
                        <ChatInput
                            onSend={handleSend}
                            disabled={isLoading || !isConnected}
                        />
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div
                className={`absolute right-0 top-0 bottom-0 w-80 bg-background border-l border-border/50 shadow-lg transform transition-transform duration-300 ease-in-out z-10 ${showHistory ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* History header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                        <h3 className="text-sm font-semibold text-foreground">Chat History</h3>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* History list */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {loadingSessions ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No chat history yet</p>
                                <p className="text-xs mt-1">Start a conversation to see history</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        onClick={() => handleSelectSession(session)}
                                        className={`group p-3 rounded-lg cursor-pointer transition-colors ${session.id === currentSessionId
                                            ? 'bg-muted'
                                            : 'hover:bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-foreground truncate">
                                                    {session.title}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {session.message_count} messages • {formatDate(session.updated_at)}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteSession(e, session.id)}
                                                className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Overlay when history is open on mobile */}
            {showHistory && (
                <div
                    className="absolute inset-0 bg-black/20 z-0 lg:hidden"
                    onClick={() => setShowHistory(false)}
                />
            )}
        </div>
    );
}
