"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "gastro_exam_date";

export default function ExamCountdown() {
  const [examDate, setExamDate] = useState<string>("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setExamDate(saved);
  }, []);

  function save(date: string) {
    setExamDate(date);
    localStorage.setItem(STORAGE_KEY, date);
    setEditing(false);
  }

  function clear() {
    setExamDate("");
    localStorage.removeItem(STORAGE_KEY);
    setEditing(false);
  }

  if (!examDate && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full py-3 rounded-xl border border-dashed border-border text-xs text-muted hover:border-primary/30 transition-colors"
      >
        Установить дату аккредитации
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3">
        <input
          type="date"
          defaultValue={examDate}
          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") save((e.target as HTMLInputElement).value);
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={(e) => {
            const input = (e.target as HTMLElement)
              .parentElement?.querySelector("input") as HTMLInputElement;
            if (input?.value) save(input.value);
          }}
          className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium"
        >
          OK
        </button>
        {examDate && (
          <button
            onClick={clear}
            className="px-3 py-2 rounded-lg text-xs text-danger"
          >
            Убрать
          </button>
        )}
      </div>
    );
  }

  const now = new Date();
  const target = new Date(examDate + "T00:00:00");
  const diffMs = target.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return (
      <div className="text-center">
        <p className="text-xs text-muted">Аккредитация прошла</p>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-primary mt-1"
        >
          Обновить дату
        </button>
      </div>
    );
  }

  return (
    <div
      className="text-center cursor-pointer"
      onClick={() => setEditing(true)}
    >
      <div className="text-4xl font-extralight text-foreground tracking-tight leading-none">
        {daysLeft}
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted mt-2 font-medium">
        {daysLeft === 1 ? "день до аккредитации" : "дней до аккредитации"}
      </p>
      <p className="text-[10px] text-muted/60 mt-1">
        {target.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
