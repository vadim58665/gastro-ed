"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import CharacterAvatar from "./CharacterAvatar";
import CharacterBubble from "./CharacterBubble";
import { useMedMindCompanion } from "@/hooks/useMedMindCompanion";
import { useMedMind } from "@/contexts/MedMindContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTheme } from "@/contexts/ThemeContext";
import { saveMnemonic } from "./AnkiExport";
import MarkdownResponse from "./MarkdownResponse";

type QuickAction = "explain" | "mnemonic" | "poem" | "hint" | "free" | "explain_friend" | "why_chain" | "plan";

const HIDDEN_PATHS = ["/welcome", "/auth", "/subscription"];

const ACTIONS: { key: QuickAction; label: string }[] = [
  { key: "free", label: "Свой вопрос" },
  { key: "explain", label: "Объяснить" },
  { key: "mnemonic", label: "Мнемоника" },
  { key: "poem", label: "Стишок" },
  { key: "hint", label: "Подсказка" },
  { key: "explain_friend", label: "Объясни как другу" },
  { key: "why_chain", label: "Почему?" },
  { key: "plan", label: "План обучения" },
];

function getCardText(card: any): string {
  if (!card) return "";
  if (card.question) return card.question;
  if (card.statement) return card.statement;
  if (card.scenario) return card.scenario;
  if (card.title) return card.title;
  return "";
}

export default function CompanionOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const { characterState, bubbleMessage, onThinking, onIdle } = useMedMindCompanion();
  const { currentCard, isOpen, toggle, close } = useMedMind();
  const { isPro } = useSubscription();
  const { companionVisibility } = useTheme();

  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [lastAction, setLastAction] = useState<QuickAction | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);
  const { isListening, isSupported: voiceSupported, toggle: toggleVoice } = useVoiceInput(handleVoiceResult);

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));
  if (isHidden || companionVisibility === "hidden") return null;

  const cardText = getCardText(currentCard);
  const cardTopic = currentCard?.topic;

  const sendMessage = async (text: string, action?: QuickAction) => {
    if (!text.trim() || isStreaming) return;
    setResponse("");
    setIsStreaming(true);
    setShowInput(false);
    if (action) setLastAction(action);
    onThinking();

    let fullResponse = "";

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/medmind/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          contextTopic: cardTopic,
          history: [],
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

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
              fullResponse += parsed.text;
              setResponse((prev) => prev + parsed.text);
            }
          } catch {}
        }
      }

      // Save mnemonic/poem for Anki export
      if (action && ["mnemonic", "poem", "explain"].includes(action) && fullResponse) {
        saveMnemonic({
          topic: cardTopic || "Общее",
          question: cardText.slice(0, 200),
          content: fullResponse,
          type: action === "poem" ? "poem" : action === "mnemonic" ? "mnemonic" : "explanation",
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setResponse("Ошибка соединения. Попробуйте ещё раз.");
      }
    } finally {
      setIsStreaming(false);
      onIdle();
      abortRef.current = null;
    }
  };

  const handleAction = (action: QuickAction) => {
    if (action === "free") {
      setShowInput(true);
      setResponse("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    const prompts: Record<Exclude<QuickAction, "free">, string> = {
      explain: cardText
        ? `Объясни подробно этот вопрос:\n\n${cardText}`
        : "Объясни последний вопрос подробно",
      mnemonic: cardText
        ? `Создай мнемонику для запоминания:\n\n${cardText}`
        : "Создай мнемонику для последней темы",
      poem: cardText
        ? `Придумай короткий стишок для запоминания:\n\n${cardText}`
        : "Придумай стишок для запоминания последней темы",
      hint: cardText
        ? `Дай подсказку (не ответ!) к этому вопросу:\n\n${cardText}`
        : "Дай подсказку к последнему вопросу",
      explain_friend: cardText
        ? `Объясни этот вопрос простым языком, как будто рассказываешь другу без медицинского образования. Используй аналогии и примеры из жизни:\n\n${cardText}`
        : "Объясни последнюю тему простым языком, как другу",
      why_chain: cardText
        ? `Я ответил на этот вопрос. Спроси меня "Почему ты выбрал этот ответ?" и затем разбери мой ход рассуждений. Задавай уточняющие вопросы "Почему?", чтобы я глубже понял тему:\n\n${cardText}`
        : "Спроси меня, почему я ответил именно так на последний вопрос, и разбери мой ход мышления",
      plan: cardTopic
        ? `Составь учебный план по теме: ${cardTopic}`
        : "Составь учебный план по последней теме",
    };
    setShowInput(false);
    sendMessage(prompts[action], action);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = cardText
      ? `${input.trim()}\n\n(Контекст  - текущий вопрос: ${cardText})`
      : input.trim();
    sendMessage(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    setResponse("");
    setShowInput(false);
    setInput("");
    setIsStreaming(false);
    close();
  };

  return (
    <>
      {/* Bubble (когда popup закрыт и персонаж полностью виден) */}
      {!isOpen && companionVisibility === "visible" && <CharacterBubble message={bubbleMessage} />}

      {/* Popup panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={handleClose}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            className="fixed bottom-36 right-4 left-4 sm:left-auto z-50 sm:w-[320px] max-h-[70vh] flex flex-col bg-card rounded-2xl card-shadow border border-border animate-bubble-in overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <p className="text-xs font-medium text-foreground">MedMind</p>
                {cardTopic && (
                  <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5">
                    {cardTopic}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-muted hover:text-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Response area */}
            {(response || isStreaming) && (
              <div className="flex-1 overflow-y-auto px-4 py-3 max-h-[40vh]">
                {response ? (
                  <MarkdownResponse content={response} streaming={isStreaming} />
                ) : (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.15s" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: "0.3s" }} />
                  </span>
                )}
              </div>
            )}

            {/* Quick actions / Paywall */}
            {!response && !isStreaming && !showInput && (
              isPro ? (
                <div className="px-3 py-3 space-y-1.5">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => handleAction(a.key)}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors border border-transparent hover:border-primary/20"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-foreground mb-1">AI-помощник</p>
                  <p className="text-xs text-muted mb-4 leading-relaxed">
                    Подсказки, мнемоники, объяснения и анализ ошибок
                  </p>
                  <button
                    onClick={() => { handleClose(); router.push("/subscription"); }}
                    className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-medium uppercase tracking-widest btn-press"
                  >
                    Подключить
                  </button>
                </div>
              )
            )}

            {/* Free question input */}
            {showInput && !isStreaming && (
              <form onSubmit={handleSubmit} className="px-3 py-3">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Спросите что угодно..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                        isListening
                          ? "text-danger bg-danger/10 animate-pulse"
                          : "text-muted hover:text-primary"
                      }`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="mt-2 w-full py-2 rounded-xl bg-primary text-white text-xs font-medium uppercase tracking-widest disabled:opacity-30 transition-opacity"
                >
                  Отправить
                </button>
              </form>
            )}

            {/* New question after response */}
            {response && !isStreaming && (
              <div className="px-3 py-2 border-t border-border flex gap-1.5">
                <button
                  onClick={() => {
                    setResponse("");
                    setShowInput(false);
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] uppercase tracking-widest text-muted hover:text-primary transition-colors"
                >
                  Назад
                </button>
                <button
                  onClick={() => {
                    setResponse("");
                    setShowInput(true);
                    setTimeout(() => inputRef.current?.focus(), 100);
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-colors"
                >
                  Ещё вопрос
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Character avatar */}
      <CharacterAvatar state={characterState} onClick={toggle} />
    </>
  );
}
