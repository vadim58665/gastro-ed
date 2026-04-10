"use client";

import { useState, useRef, useEffect } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSubscription } from "@/hooks/useSubscription";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `Ты AI-пациент на приёме у врача-гастроэнтеролога. Играй роль пациента с гастроэнтерологической патологией (выбери случайное заболевание).

Правила:
- Отвечай как реальный пациент: используй бытовой язык, не медицинские термины
- Не раскрывай диагноз - врач должен его установить сам
- Отвечай только на заданные вопросы, не давай лишней информации
- Если врач спрашивает о симптомах, описывай их так, как описал бы обычный человек
- Будь последовательным в своих ответах
- Начни с краткой жалобы (1-2 предложения)

После того как врач поставит диагноз, оцени его работу: правильность диагноза, полноту сбора анамнеза, качество вопросов.`;

export default function ConsiliumPage() {
  const router = useRouter();
  const { isPro } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [started, setStarted] = useState(false);
  const [diagnosed, setDiagnosed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isPro) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pt-24 pb-20 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-sm text-foreground mb-2">Режим Консилиум</p>
            <p className="text-xs text-muted mb-6 leading-relaxed">
              Ведите приём AI-пациента, собирайте анамнез и ставьте диагноз
            </p>
            <button
              onClick={() => router.push("/subscription")}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"
            >
              Подключить подписку
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  async function startSession() {
    setStarted(true);
    setMessages([]);
    setDiagnosed(false);

    const systemMsg: Message = { role: "system", content: SYSTEM_PROMPT };
    const userInit: Message = { role: "user", content: "Начни приём. Представься как пациент и опиши свою жалобу." };

    await streamResponse([systemMsg, userInit]);
  }

  async function sendDiagnosis() {
    if (!input.trim()) return;
    const userMsg: Message = {
      role: "user",
      content: `Мой диагноз: ${input.trim()}\n\nОцени правильность диагноза, полноту сбора анамнеза и качество моих вопросов. Раскрой, каким заболеванием страдал пациент.`,
    };
    setInput("");
    setDiagnosed(true);
    await streamResponse([...messages, userMsg], userMsg);
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setInput("");
    await streamResponse([...messages, userMsg], userMsg);
  }

  async function streamResponse(history: Message[], newUserMsg?: Message) {
    setIsStreaming(true);
    if (newUserMsg) {
      setMessages((prev) => [...prev, newUserMsg]);
    }

    try {
      abortRef.current = new AbortController();
      const session = await getSupabase().auth.getSession();
      const token = session.data.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/medmind/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: history[history.length - 1].content,
          contextTopic: "Консилиум",
          history: history.slice(0, -1).map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              accumulated += parsed.text;
              const text = accumulated;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: text };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ошибка соединения. Попробуйте ещё раз." },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  if (!started) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar />
        <main className="flex-1 pt-24 pb-20 flex items-center justify-center px-6">
          <div className="text-center max-w-xs">
            <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-6">
              Консилиум
            </p>
            <p className="text-sm text-foreground mb-2">
              Ведите приём AI-пациента
            </p>
            <p className="text-xs text-muted mb-8 leading-relaxed">
              Собирайте анамнез, задавайте вопросы, назначайте обследования и поставьте диагноз. AI оценит вашу работу.
            </p>
            <button
              onClick={startSession}
              className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-medium"
            >
              Начать приём
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-4 overflow-y-auto">
        <div className="px-4 pt-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium mb-4 text-center">
            Консилиум - приём пациента
          </p>

          <div className="space-y-3">
            {messages
              .filter((m) => m.role !== "system")
              .map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-surface text-foreground border border-border rounded-bl-md"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}

            {isStreaming && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-surface border border-border rounded-bl-md">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.3s" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-background">
        {diagnosed ? (
          <div className="text-center space-y-3">
            <button
              onClick={startSession}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium"
            >
              Новый пациент
            </button>
            <button
              onClick={() => router.push("/topics")}
              className="text-xs text-muted hover:text-foreground transition-colors"
            >
              К учёбе
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Задайте вопрос пациенту..."
              disabled={isStreaming}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-medium disabled:opacity-30 transition-opacity"
            >
              OK
            </button>
          </div>
        )}
        {!diagnosed && messages.length > 4 && (
          <button
            onClick={() => {
              if (!input.trim()) {
                setInput("");
              }
              sendDiagnosis();
            }}
            className="w-full mt-2 py-2 rounded-lg text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors"
          >
            Поставить диагноз
          </button>
        )}
      </div>
    </div>
  );
}
