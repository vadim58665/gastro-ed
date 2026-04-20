"use client";

import { useState } from "react";

export interface ExtractedData {
  symptoms: string[];
  anamnesis: string[];
  orders: string[];
}

interface Props {
  data: ExtractedData;
}

const SECTIONS: { key: keyof ExtractedData; label: string }[] = [
  { key: "symptoms", label: "Симптомы" },
  { key: "anamnesis", label: "Анамнез" },
  { key: "orders", label: "Назначения" },
];

export default function ExtractedDataPanel({ data }: Props) {
  const [open, setOpen] = useState(false);
  const total = data.symptoms.length + data.anamnesis.length + data.orders.length;

  if (total === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl aurora-hairline text-xs transition-colors hover:bg-[var(--aurora-violet-soft)]"
        style={{
          background:
            "linear-gradient(180deg, var(--color-card) 0%, color-mix(in srgb, var(--aurora-violet-soft) 60%, transparent) 100%)",
        }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            className="uppercase tracking-[0.18em] font-semibold"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Собранные данные
          </span>
          <span
            className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[10px] font-medium text-white"
            style={{ background: "var(--aurora-gradient-primary)" }}
          >
            {total}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
            color: "var(--color-muted)",
          }}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="mt-2 p-3.5 rounded-xl aurora-hairline space-y-3"
          style={{ background: "var(--color-card)" }}
        >
          {SECTIONS.map(({ key, label }) => {
            const items = data[key];
            return (
              <section key={key}>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  {label}
                  <span className="ml-1.5 text-muted font-normal normal-case tracking-normal">
                    {items.length}
                  </span>
                </p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted italic">не упомянуто</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="text-xs text-foreground leading-relaxed flex gap-2"
                      >
                        <span
                          className="shrink-0 mt-[7px] w-1 h-1 rounded-full"
                          style={{ background: "var(--color-aurora-violet)" }}
                          aria-hidden
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
