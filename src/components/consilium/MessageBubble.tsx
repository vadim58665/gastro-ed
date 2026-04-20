"use client";

import PatientAvatar from "./PatientAvatar";

interface Props {
  role: "user" | "assistant";
  content: string;
  showAvatar?: boolean;
}

export default function MessageBubble({ role, content, showAvatar = true }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed text-white whitespace-pre-wrap"
          style={{
            background: "var(--aurora-gradient-primary)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 18px -8px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent)",
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start items-end gap-2">
      {showAvatar ? <PatientAvatar size={26} /> : <div style={{ width: 26 }} aria-hidden />}
      <div
        className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md text-sm leading-relaxed text-foreground aurora-hairline whitespace-pre-wrap"
        style={{
          background:
            "linear-gradient(180deg, var(--color-card) 0%, var(--aurora-violet-soft) 100%)",
        }}
      >
        {content}
      </div>
    </div>
  );
}
