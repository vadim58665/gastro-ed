"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import CharacterAvatar from "./CharacterAvatar";
import CharacterBubble from "./CharacterBubble";
import { useMedMindCompanion } from "@/hooks/useMedMindCompanion";
import {
  useMedMind,
  deriveModeFromScreen,
  deriveScreenLabel,
} from "@/contexts/MedMindContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { useMedMindUsage } from "@/hooks/useMedMindUsage";
import {
  getQuestionsForSpecialty,
  getBlockCount,
} from "@/data/accreditation";
import { buildAccreditationSnapshot } from "@/lib/accreditationSnapshot";
import { saveMnemonic } from "./AnkiExport";
import MarkdownResponse from "./MarkdownResponse";
import { getSupabase } from "@/lib/supabase/client";

type PrebuiltAction = "hint_prebuilt" | "explain_short" | "explain_long";
type ChatAction =
  | "explain"
  | "mnemonic"
  | "poem"
  | "hint"
  | "free"
  | "explain_friend"
  | "why_chain"
  | "plan";
type QuickAction = PrebuiltAction | ChatAction;

const HIDDEN_PATHS = ["/welcome", "/auth", "/subscription"];

const PREBUILT_TYPE: Record<PrebuiltAction, "hint" | "explain_short" | "explain_long"> = {
  hint_prebuilt: "hint",
  explain_short: "explain_short",
  explain_long: "explain_long",
};

function getCardText(card: unknown): string {
  if (!card || typeof card !== "object") return "";
  const c = card as Record<string, unknown>;
  if (typeof c.question === "string") return c.question;
  if (typeof c.statement === "string") return c.statement;
  if (typeof c.scenario === "string") return c.scenario;
  if (typeof c.title === "string") return c.title;
  return "";
}

export default function CompanionOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const { characterState, bubbleMessage, onThinking, onIdle } = useMedMindCompanion();
  const { screen, isOpen, toggle, close } = useMedMind();
  const { isPro } = useSubscription();
  const { companionVisibility, companionSize } = useTheme();
  const avatarSize =
    companionSize === "small" ? 52 : companionSize === "large" ? 96 : 76;

  const mode = deriveModeFromScreen(screen);
  const screenLabel = deriveScreenLabel(screen);

  // Accreditation snapshot — only built when we are actually on an accreditation
  // question. useAccreditation reads localStorage; we pass a specialtyId only
  // when screen.kind === 'accred_question' to avoid unrelated reads elsewhere.
  const snapshotSpecId =
    screen.kind === "accred_question" ? screen.specialtyId : "";
  const { progress: accProgress } = useAccreditation(snapshotSpecId || "__none__");

  // Today's usage counters (chat / explain). Refetched whenever panel opens
  // and after each streaming chat completes so "8/40" stays accurate.
  const { data: usage, refetch: refetchUsage } = useMedMindUsage(isOpen && isPro);

  // Cached exam-warning opt-in for the session (so we don't re-prompt every click).
  const [examConfirmed, setExamConfirmed] = useState(false);
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleVoiceResult = useCallback((text: string) => {
    setInput(text);
  }, []);
  const {
    isListening,
    isSupported: voiceSupported,
    toggle: toggleVoice,
    level: voiceLevel,
    error: voiceError,
  } = useVoiceInput(handleVoiceResult);

  const isHidden = HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  // Reset exam confirmation when leaving exam.
  useEffect(() => {
    if (!(screen.kind === "accred_question" && screen.mode === "exam")) {
      setExamConfirmed(false);
    }
  }, [screen]);

  const cardText =
    screen.kind === "feed_card"
      ? getCardText(screen.card)
      : screen.kind === "accred_question"
        ? screen.question.question
        : "";
  const cardTopic =
    screen.kind === "feed_card"
      ? screen.card.topic
      : screen.kind === "accred_question"
        ? screen.question.specialty
        : undefined;

  const entityId =
    screen.kind === "feed_card"
      ? screen.card.id
      : screen.kind === "accred_question"
        ? screen.question.id
        : null;
  const entityType: "card" | "accreditation_question" | null =
    screen.kind === "feed_card"
      ? "card"
      : screen.kind === "accred_question"
        ? "accreditation_question"
        : null;

  const isExamMode =
    screen.kind === "accred_question" && screen.mode === "exam";

  const getToken = async (): Promise<string> => {
    const { data: { session } } = await getSupabase().auth.getSession();
    return (
      session?.access_token ??
      (process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : "")
    );
  };

  const getAccreditationSnapshot = () => {
    if (screen.kind !== "accred_question") return undefined;
    const specialtyId = screen.specialtyId;
    const questions = getQuestionsForSpecialty(specialtyId);
    if (questions.length === 0) return undefined;
    const blocksTotal = getBlockCount(specialtyId) || 1;
    return buildAccreditationSnapshot(
      specialtyId,
      screen.question.specialty,
      accProgress,
      questions,
      blocksTotal
    );
  };

  const tryPrebuilt = async (
    action: PrebuiltAction
  ): Promise<{ ok: boolean; content?: string; paywall?: boolean }> => {
    if (!entityId || !entityType) return { ok: false };
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        entityType,
        entityId,
        contentType: PREBUILT_TYPE[action],
      });
      const res = await fetch(`/api/medmind/prebuilt?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, content: data.content };
      }
      if (res.status === 403) return { ok: false, paywall: true };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  };

  const streamChatRequest = useCallback(
    async (text: string, action?: QuickAction) => {
      setResponse("");
      setIsStreaming(true);
      setShowInput(false);
      onThinking();

      let fullResponse = "";
      try {
        abortRef.current = new AbortController();
        const token = await getToken();
        const res = await fetch("/api/medmind/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: text.trim(),
            contextTopic: cardTopic,
            history: [],
            mode,
            accreditationSnapshot: getAccreditationSnapshot(),
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
            } catch {
              /* skip */
            }
          }
        }

        if (
          action &&
          ["mnemonic", "poem", "explain", "explain_long"].includes(action) &&
          fullResponse
        ) {
          saveMnemonic({
            topic: cardTopic || "Общее",
            question: cardText.slice(0, 200),
            content: fullResponse,
            type:
              action === "poem"
                ? "poem"
                : action === "mnemonic"
                  ? "mnemonic"
                  : "explanation",
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
        // Refresh counters after a billable call.
        refetchUsage();
      }
    },
    [cardTopic, cardText, mode, accProgress, screen, onThinking, onIdle, refetchUsage]
  );

  const runPrebuiltWithFallback = useCallback(
    async (action: PrebuiltAction, fallbackPrompt: string) => {
      onThinking();
      setResponse("");
      setShowInput(false);
      const result = await tryPrebuilt(action);
      if (result.ok && result.content) {
        setResponse(result.content);
        onIdle();
        return;
      }
      if (result.paywall) {
        onIdle();
        router.push("/subscription");
        return;
      }
      // No prebuilt yet → fall back to streaming chat with the explicit prompt.
      await streamChatRequest(fallbackPrompt, action);
    },
    [streamChatRequest, router, entityId, entityType, onThinking, onIdle]
  );

  if (isHidden || companionVisibility === "hidden") return null;

  const executeAction = (action: QuickAction) => {
    if (action === "free") {
      setShowInput(true);
      setResponse("");
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    // Prebuilt actions: look up DB first, fall back to chat if missing.
    if (action === "hint_prebuilt") {
      const prompt = cardText
        ? `Дай подсказку (не ответ!) к этому вопросу:\n\n${cardText}`
        : "Дай подсказку к текущему вопросу";
      runPrebuiltWithFallback("hint_prebuilt", prompt);
      return;
    }
    if (action === "explain_short") {
      const prompt = cardText
        ? `Объясни кратко этот вопрос (2–4 предложения):\n\n${cardText}`
        : "Объясни кратко текущий вопрос";
      runPrebuiltWithFallback("explain_short", prompt);
      return;
    }
    if (action === "explain_long") {
      const prompt = cardText
        ? `Дай подробный разбор этого вопроса — патогенез, клиника, почему остальные варианты неверны:\n\n${cardText}`
        : "Дай подробный разбор текущего вопроса";
      runPrebuiltWithFallback("explain_long", prompt);
      return;
    }

    // Chat actions: direct streaming runtime call.
    const prompts: Record<ChatAction, string> = {
      free: "",
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
        ? `Объясни этот вопрос простым языком, как другу без мед.образования, с аналогиями из жизни:\n\n${cardText}`
        : "Объясни последнюю тему простым языком, как другу",
      why_chain: cardText
        ? `Я ответил на этот вопрос. Спроси меня "Почему ты выбрал этот ответ?" и разбери ход моих рассуждений:\n\n${cardText}`
        : "Спроси меня, почему я ответил именно так на последний вопрос",
      plan: cardTopic
        ? `Составь учебный план по теме: ${cardTopic}`
        : "Составь учебный план по последней теме",
    };
    streamChatRequest(prompts[action as ChatAction], action);
  };

  const handleAction = (action: QuickAction) => {
    // Exam mode: warn once per session before doing anything.
    if (isExamMode && !examConfirmed) {
      setPendingAction(action);
      return;
    }
    executeAction(action);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = cardText
      ? `${input.trim()}\n\n(Контекст  - текущий вопрос: ${cardText})`
      : input.trim();
    if (isExamMode && !examConfirmed) {
      setPendingMessage(text);
      setPendingAction("free");
      setInput("");
      return;
    }
    streamChatRequest(text);
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
    setPendingAction(null);
    close();
  };

  // Action list depends on screen kind.
  const hasEntity = entityId !== null;
  const actions: { key: QuickAction; label: string; prebuilt?: boolean }[] = hasEntity
    ? [
        { key: "hint_prebuilt", label: "Подсказка", prebuilt: true },
        { key: "explain_short", label: "Объяснить кратко", prebuilt: true },
        { key: "explain_long", label: "Объяснить подробно", prebuilt: true },
        { key: "free", label: "Свой вопрос" },
        { key: "mnemonic", label: "Мнемоника" },
        { key: "poem", label: "Стишок" },
        { key: "explain_friend", label: "Объясни как другу" },
        { key: "why_chain", label: "Почему?" },
      ]
    : [{ key: "free", label: "Свой вопрос" }];

  return (
    <>
      {/* Bubble (popup closed and character fully visible) */}
      {!isOpen && companionVisibility === "visible" && (
        <CharacterBubble message={bubbleMessage} />
      )}

      {/* Popup panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={handleClose}
          />

          <div
            ref={panelRef}
            className="fixed bottom-36 right-4 left-4 sm:left-auto z-50 sm:w-[340px] max-h-[70vh] flex flex-col bg-card rounded-2xl card-shadow border border-border animate-bubble-in overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">MedMind</p>
                <p className="text-[10px] text-muted uppercase tracking-widest mt-0.5 truncate">
                  {isExamMode
                    ? "экзамен"
                    : mode === "accreditation"
                      ? "подготовка"
                      : mode === "feed"
                        ? "лента"
                        : screenLabel}
                  {isPro && usage && (
                    <>
                      {" · Чат "}
                      <span className="text-foreground/70">
                        {usage.usage.chat.used}/{usage.usage.chat.limit}
                      </span>
                      {" · Разборы "}
                      <span className="text-foreground/70">
                        {usage.usage.explain.used}/{usage.usage.explain.limit}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-muted hover:text-foreground transition-colors shrink-0 ml-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Exam warning modal */}
            {pendingAction && isExamMode && !examConfirmed && (
              <div className="px-4 py-4 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  Сейчас идёт экзамен.
                </p>
                <p className="text-xs text-muted leading-relaxed">
                  Эффективнее разобрать все вопросы подробно после завершения. Если хотите прямо сейчас — я готов помочь.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setExamConfirmed(true);
                      const a = pendingAction;
                      const msg = pendingMessage;
                      setPendingAction(null);
                      setPendingMessage(null);
                      if (a === "free" && msg) {
                        streamChatRequest(msg);
                      } else if (a) {
                        executeAction(a);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-primary text-white text-[10px] uppercase tracking-[0.15em] font-semibold btn-press"
                  >
                    Помогите сейчас
                  </button>
                  <button
                    onClick={() => {
                      setPendingAction(null);
                      setPendingMessage(null);
                    }}
                    className="flex-1 py-2 rounded-xl border border-border text-[10px] uppercase tracking-[0.15em] text-muted btn-press"
                  >
                    Подожду
                  </button>
                </div>
              </div>
            )}

            {/* Response */}
            {!pendingAction && (response || isStreaming) && (
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

            {/* Quick actions / screen hint / paywall */}
            {!pendingAction && !response && !isStreaming && !showInput && (
              isPro ? (
                !hasEntity ? (
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-sm text-foreground">
                      Я вижу, вы на экране «{screenLabel}».
                    </p>
                    <p className="text-xs text-muted leading-relaxed">
                      Откройте карточку или аккредитационный вопрос — я помогу с конкретным содержанием. Или задайте свой вопрос сейчас.
                    </p>
                    <button
                      onClick={() => handleAction("free")}
                      className="w-full py-2.5 rounded-full bg-primary text-white text-xs font-medium uppercase tracking-widest btn-press"
                    >
                      Задать вопрос
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-3 space-y-1.5">
                    {actions.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => handleAction(a.key)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-colors border border-transparent ${
                          a.prebuilt
                            ? "text-foreground bg-primary/5 hover:bg-primary/10 hover:border-primary/20"
                            : "text-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                )
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

            {/* Free input */}
            {!pendingAction && showInput && !isStreaming && (
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
                      aria-label={isListening ? "Остановить запись" : "Голосовой ввод"}
                      className={`absolute right-2 top-2 p-1.5 rounded-lg transition-colors ${
                        isListening
                          ? "text-danger bg-danger/10"
                          : "text-muted hover:text-primary"
                      }`}
                      style={
                        isListening
                          ? {
                              transform: `scale(${1 + voiceLevel * 0.25})`,
                              boxShadow: `0 0 ${Math.round(voiceLevel * 14)}px rgba(239, 68, 68, 0.45)`,
                              transition: "transform 80ms linear, box-shadow 80ms linear",
                            }
                          : undefined
                      }
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
                {voiceError && (
                  <p className="mt-1 text-[10px] text-danger">{voiceError}</p>
                )}
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="mt-2 w-full py-2 rounded-xl bg-primary text-white text-xs font-medium uppercase tracking-widest disabled:opacity-30 transition-opacity"
                >
                  Отправить
                </button>
              </form>
            )}

            {/* Back / new question */}
            {!pendingAction && response && !isStreaming && (
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
      <CharacterAvatar state={characterState} onClick={toggle} size={avatarSize} />
    </>
  );
}
