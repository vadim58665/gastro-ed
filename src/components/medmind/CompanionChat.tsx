"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import QuickActions, { type QuickAction } from "./QuickActions";
import MarkdownResponse from "./MarkdownResponse";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface CompanionChatProps {
  contextTopic?: string;
  contextQuestion?: string;
}

export default function CompanionChat({
  contextTopic,
  contextQuestion,
}: CompanionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
      ]);

      try {
        abortRef.current = new AbortController();

        const history = messages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/medmind/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            contextTopic,
            history,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, contextTopic]
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      if (action === "free_question") {
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => inputRef.current?.focus(), 300);
        return;
      }
      const prompts: Record<Exclude<QuickAction, "free_question">, string> = {
        explain: contextQuestion
          ? `Объясни подробно этот вопрос:\n\n${contextQuestion}`
          : "Объясни последний вопрос подробно",
        mnemonic: contextQuestion
          ? `Создай мнемонику для запоминания ответа на этот вопрос:\n\n${contextQuestion}`
          : "Создай мнемонику для последней темы",
        poem: contextQuestion
          ? `Придумай стишок для запоминания:\n\n${contextQuestion}`
          : "Придумай стишок для запоминания последней темы",
        image: contextQuestion
          ? `Опиши визуальную ассоциацию для запоминания:\n\n${contextQuestion}`
          : "Опиши визуальную ассоциацию для последней темы",
        session: "Проанализируй мою текущую сессию: какие темы были, где ошибки, что повторить",
      };
      sendMessage(prompts[action]);
    },
    [contextQuestion, sendMessage]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context badge */}
      {contextTopic && (
        <div className="px-4 py-2 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted font-medium">
            Тема: {contextTopic}
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl font-extralight text-foreground tracking-tight mb-3">
              MedMind
            </div>
            <div className="w-8 h-px bg-border mb-4" />
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4">
              ИИ-компаньон врача
            </p>
            <p className="text-sm text-muted leading-relaxed max-w-[280px] mb-6">
              Задайте любой медицинский вопрос или выберите действие
            </p>
            <QuickActions onAction={handleQuickAction} />
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground"
              }`}
            >
              {msg.role === "assistant" && !msg.content && isStreaming ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.3s" }} />
                </span>
              ) : msg.role === "assistant" ? (
                <MarkdownResponse content={msg.content} streaming={isStreaming && msg === messages[messages.length - 1]} />
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="text-center">
            <p className="text-xs" style={{ color: "var(--color-aurora-pink)" }}>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[10px] uppercase tracking-widest text-muted mt-1"
            >
              Закрыть
            </button>
          </div>
        )}
      </div>

      {/* Quick actions (when conversation started) */}
      {messages.length > 0 && !isStreaming && (
        <div className="px-4 pb-2">
          <QuickActions onAction={handleQuickAction} compact />
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 pb-4 pt-2 border-t border-border"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите что угодно по медицине..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/40 transition-colors"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-30 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
