"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import PatientAvatar from "./PatientAvatar";
import ConsultTimer from "./ConsultTimer";
import DiagnosisComposer from "./DiagnosisComposer";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  startedAt: number;
  canDiagnose: boolean;
  onSend: (text: string) => void;
  onDiagnose: (text: string) => void;
}

export default function ConsiliumChat({
  messages,
  isStreaming,
  startedAt,
  canDiagnose,
  onSend,
  onDiagnose,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const lastMsg = messages[messages.length - 1];
  const showTyping = isStreaming && (!lastMsg || lastMsg.content === "");

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 py-3"
        style={{
          background: "var(--color-background)",
          borderBottom: "1px solid var(--aurora-indigo-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PatientAvatar size={32} />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">Пациент</span>
              <span
                className="text-[9px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                Приём
              </span>
            </div>
          </div>
          <ConsultTimer startedAt={startedAt} running={!canDiagnose || isStreaming} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            showAvatar={
              msg.role === "assistant" && (i === 0 || messages[i - 1]?.role !== "assistant")
            }
          />
        ))}

        {showTyping && (
          <div className="flex justify-start items-end gap-2">
            <PatientAvatar size={26} />
            <div
              className="px-4 py-3 rounded-2xl rounded-bl-md aurora-hairline"
              style={{
                background:
                  "linear-gradient(180deg, var(--color-card) 0%, var(--aurora-violet-soft) 100%)",
              }}
            >
              <span className="inline-flex gap-1">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--color-aurora-violet)" }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: "var(--color-aurora-violet)",
                    animationDelay: "0.15s",
                  }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    background: "var(--color-aurora-violet)",
                    animationDelay: "0.3s",
                  }}
                />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="shrink-0">
        <DiagnosisComposer
          onSend={onSend}
          onDiagnose={onDiagnose}
          canDiagnose={canDiagnose}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
}
