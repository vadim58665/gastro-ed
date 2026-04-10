"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types/medmind";

const STORAGE_KEY = "gastro-ed-medmind-chat";

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
}

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function MedMindChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    const token = await getToken();
    if (!token) {
      setStreaming(false);
      return;
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/medmind/chat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              accumulated += parsed.text;
              assistantMsg.content = accumulated;
              setMessages([...updatedMessages, { ...assistantMsg }]);
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      const final = [...updatedMessages, { ...assistantMsg, content: accumulated }];
      setMessages(final);
      saveMessages(final);
    } catch {
      // Network error
    }

    setStreaming(false);
  }, [input, messages, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted">
              Спросите MedMind о любой медицинской теме
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" ? (
              <p className="text-sm text-muted text-right">{msg.content}</p>
            ) : (
              <div className="border-l-2 border-primary/20 pl-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {msg.content}
                  {streaming && msg === messages[messages.length - 1] && (
                    <span className="inline-block w-1 h-4 bg-primary/50 ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос..."
          disabled={streaming}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-card text-foreground placeholder:text-muted focus:outline-none focus:border-primary/50 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
