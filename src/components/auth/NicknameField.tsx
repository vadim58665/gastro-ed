"use client";

import { useEffect, useState } from "react";
import { validateNickname } from "@/lib/validation/nickname";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onValidityChange: (ok: boolean) => void;
}

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export default function NicknameField({ value, onChange, onValidityChange }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const v = validateNickname(value);
    if (!v.ok) {
      setStatus(value === "" ? "idle" : "invalid");
      setMessage(value === "" ? "" : v.error);
      onValidityChange(false);
      return;
    }

    setStatus("checking");
    setMessage("Проверяем...");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-nickname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: v.value }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (data.available) {
          setStatus("available");
          setMessage("Свободен");
          onValidityChange(true);
        } else {
          setStatus("taken");
          setMessage(data.error ?? "Занят");
          onValidityChange(false);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setStatus("invalid");
          setMessage("Ошибка проверки");
          onValidityChange(false);
        }
      }
    }, 400);

    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [value, onValidityChange]);

  const color =
    status === "available" ? "text-emerald-600" :
    status === "taken" || status === "invalid" ? "text-rose-600" :
    "text-muted";

  return (
    <div className="flex flex-col gap-1">
      <input
        className="input-refined w-full px-4 py-3.5 rounded-2xl text-base font-light text-foreground placeholder:text-muted/60"
        type="text"
        autoComplete="off"
        inputMode="text"
        placeholder="Никнейм"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        maxLength={20}
      />
      <span className={`text-[11px] px-1 ${color}`}>
        {message || "3-20 символов: a-z, 0-9, _"}
      </span>
    </div>
  );
}
