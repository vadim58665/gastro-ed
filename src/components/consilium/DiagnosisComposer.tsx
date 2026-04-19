"use client";

import { useState } from "react";

interface Props {
  onSend: (text: string) => void;
  onDiagnose: (text: string) => void;
  canDiagnose: boolean;
  isStreaming: boolean;
}

export default function DiagnosisComposer({
  onSend,
  onDiagnose,
  canDiagnose,
  isStreaming,
}: Props) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"question" | "diagnose">("question");

  const placeholder =
    mode === "question"
      ? "Задайте вопрос пациенту"
      : "Введите предполагаемый диагноз";

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (mode === "question") {
      onSend(text);
    } else {
      onDiagnose(text);
    }
    setInput("");
  }

  const buttonDisabled = !input.trim() || isStreaming;
  const isDiagnoseMode = mode === "diagnose";

  return (
    <div
      className="px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
      style={{
        background: "var(--color-background)",
        borderTop: "1px solid var(--aurora-indigo-border)",
      }}
    >
      {canDiagnose && (
        <div className="flex justify-center mb-2">
          <div
            className="inline-flex rounded-full p-0.5 aurora-hairline text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ background: "var(--color-card)" }}
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={!isDiagnoseMode}
              onClick={() => setMode("question")}
              className="px-3.5 py-1.5 rounded-full transition-colors"
              style={{
                background: !isDiagnoseMode
                  ? "var(--aurora-gradient-primary)"
                  : "transparent",
                color: !isDiagnoseMode ? "#fff" : "var(--color-muted)",
              }}
            >
              Вопрос
            </button>
            <button
              role="tab"
              aria-selected={isDiagnoseMode}
              onClick={() => setMode("diagnose")}
              className="px-3.5 py-1.5 rounded-full transition-colors"
              style={{
                background: isDiagnoseMode
                  ? "var(--aurora-gradient-primary)"
                  : "transparent",
                color: isDiagnoseMode ? "#fff" : "var(--color-muted)",
              }}
            >
              Диагноз
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          disabled={isStreaming}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm text-foreground placeholder:text-muted focus:outline-none transition-colors"
          style={{
            background: "var(--color-card)",
            border: `1px solid ${
              isDiagnoseMode
                ? "color-mix(in srgb, var(--color-aurora-violet) 40%, transparent)"
                : "var(--aurora-indigo-border)"
            }`,
          }}
        />
        <button
          onClick={handleSend}
          disabled={buttonDisabled}
          aria-label={isDiagnoseMode ? "Отправить диагноз" : "Отправить вопрос"}
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
          style={{
            background: "var(--aurora-gradient-primary)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 20px -10px color-mix(in srgb, var(--color-aurora-violet) 60%, transparent)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
