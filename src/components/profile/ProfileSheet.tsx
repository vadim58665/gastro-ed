"use client";

import { useEffect, useState } from "react";
import {
  useTheme,
  type ThemeId,
  type LanguageId,
  type CompanionKind,
  type CompanionVisibility,
  type CompanionSize,
} from "@/contexts/ThemeContext";
import CharacterAvatarPreview from "@/components/medmind/CharacterAvatarPreview";
import { STORAGE_KEY as AVATAR_POS_KEY, DEFAULT_POSITION } from "@/components/medmind/CharacterAvatar";


interface Props {
  open: boolean;
  kind: "settings" | "styles" | "companion" | null;
  onClose: () => void;
}

const themes: Array<{
  id: ThemeId;
  name: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    id: "default",
    name: "Лаванда",
    description: "Светлый минимализм",
    swatches: ["#f8f9fc", "#6366f1", "#a855f7"],
  },
  {
    id: "mocha",
    name: "Мокка",
    description: "Тёплый кофе и крем",
    swatches: ["#f3ead9", "#8b5e3c", "#c7923a"],
  },
  {
    id: "graphite",
    name: "Графит",
    description: "Глубокий серый",
    swatches: ["#17181c", "#3a3d46", "#8792a3"],
  },
];

const languages: Array<{
  id: LanguageId;
  name: string;
  native: string;
  enabled: boolean;
}> = [
  { id: "ru", name: "Русский", native: "Русский", enabled: true },
  { id: "en", name: "Английский", native: "English", enabled: false },
  { id: "uz", name: "Узбекский", native: "O'zbek", enabled: false },
  { id: "kk", name: "Казахский", native: "Қазақша", enabled: false },
  { id: "tk", name: "Туркменский", native: "Türkmen", enabled: false },
  { id: "zh", name: "Китайский", native: "中文", enabled: false },
  { id: "hi", name: "Хинди", native: "हिन्दी", enabled: false },
  { id: "ar", name: "Арабский", native: "العربية", enabled: false },
  { id: "fa", name: "Фарси", native: "فارسی", enabled: false },
  { id: "tg", name: "Таджикский", native: "Тоҷикӣ", enabled: false },
  { id: "fr", name: "Французский", native: "Français", enabled: false },
];

const companions: Array<{
  id: CompanionKind;
  name: string;
  description: string;
}> = [
  { id: "orb", name: "Нео", description: "Дружелюбный AI-орб" },
  { id: "doctor", name: "Доктор", description: "Коллега в белом халате" },
  { id: "mouse", name: "Пик", description: "Лабораторная мышка" },
  { id: "owl", name: "Мудрый", description: "Сова-наставник" },
];

type View = "menu" | "language" | "styles" | "companion";

export default function ProfileSheet({ open, kind, onClose }: Props) {
  const { theme, setTheme, language, setLanguage, companion, setCompanion, companionVisibility, setCompanionVisibility, companionSize, setCompanionSize } = useTheme();
  const [view, setView] = useState<View>("menu");

  // Sync internal view when the sheet opens with a specific kind.
  useEffect(() => {
    if (!open) return;
    if (kind === "settings") setView("menu");
    else if (kind === "styles") setView("styles");
    else if (kind === "companion") setView("companion");
  }, [open, kind]);


  const currentLang = languages.find((l) => l.id === language);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !kind) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-result"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_-20px_rgba(17,24,39,0.35)] animate-result"
        role="dialog"
        aria-modal="true"
      >
        {/* Handle */}
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-6 pt-5 pb-8 max-h-[85vh] sm:max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {view !== "menu" && kind === "settings" && (
                <button
                  onClick={() => setView("menu")}
                  className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0"
                  aria-label="Назад"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <p
                  className="text-[10px] uppercase tracking-[0.28em] font-semibold"
                  style={{ color: "var(--color-aurora-violet)" }}
                >
                  {view === "menu"
                    ? "Настройки"
                    : view === "language"
                      ? "Язык"
                      : view === "styles"
                        ? "Стиль интерьера"
                        : "Компаньон"}
                </p>
                <p className="text-2xl font-extralight text-foreground tracking-tight mt-1.5 truncate">
                  {view === "menu"
                    ? "Персонализация"
                    : view === "language"
                      ? "Язык интерфейса"
                      : view === "styles"
                        ? "Тема оформления"
                        : "AI-персонаж"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground transition-colors shrink-0"
              aria-label="Закрыть"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="w-full divider-soft mb-5 shrink-0" />

          {view === "menu" ? (
            <div className="flex flex-col gap-3">
              <MenuRow
                onClick={() => setView("language")}
                icon={<GlobeIcon />}
                title="Язык"
                value={currentLang?.native ?? "Русский"}
              />
              <MenuRow
                onClick={() => setView("styles")}
                icon={<PaletteIcon />}
                title="Стиль"
                value={themes.find((t) => t.id === theme)?.name ?? ""}
              />
              <MenuRow
                onClick={() => setView("companion")}
                icon={<SparkleIcon />}
                title="Компаньон"
                value={companions.find((c) => c.id === companion)?.name ?? ""}
              />
            </div>
          ) : view === "companion" ? (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] overscroll-contain">
              {companions.map((c) => {
                const active = c.id === companion;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCompanion(c.id)}
                    className={`btn-press w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      active
                        ? "border-foreground/40 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-6px_rgba(17,24,39,0.18)]"
                        : "border-border hover:border-foreground/20 bg-card"
                    }`}
                  >
                    <div className="shrink-0 w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center overflow-hidden">
                      <CharacterAvatarPreview kind={c.id} size={56} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{c.name}</div>
                      <div className="text-[11px] text-muted mt-0.5">{c.description}</div>
                    </div>
                    {active && (
                      <div
                        className="shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center"
                        style={{ background: "var(--aurora-gradient-primary)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Position hint */}
              <div className="mt-2 rounded-2xl border border-border bg-surface p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted font-semibold mb-2">
                  Положение
                </p>
                <p className="text-[10px] text-muted leading-relaxed">
                  Перетащите персонажа в любое место на экране.
                </p>
              </div>

              {/* Size controls */}
              <div className="mt-2 rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted font-semibold">
                  Размер
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "small" as CompanionSize, label: "Маленький", px: 40 },
                    { id: "medium" as CompanionSize, label: "Средний", px: 56 },
                    { id: "large" as CompanionSize, label: "Большой", px: 72 },
                  ]).map((opt) => {
                    const active = companionSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setCompanionSize(opt.id)}
                        className={`btn-press flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-colors text-xs font-semibold ${
                          active
                            ? "border-foreground/40 bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                            : "border-border bg-transparent text-muted hover:text-foreground"
                        }`}
                      >
                        <CharacterAvatarPreview kind={companion} size={opt.px / 2} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility controls */}
              <div className="mt-2 rounded-2xl border border-border bg-surface p-4 flex flex-col gap-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted font-semibold">
                  Видимость
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "visible" as CompanionVisibility, label: "Виден", icon: "eye" },
                    { id: "half" as CompanionVisibility, label: "Прячется", icon: "half" },
                    { id: "hidden" as CompanionVisibility, label: "Скрыт", icon: "hidden" },
                  ]).map((opt) => {
                    const active = companionVisibility === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setCompanionVisibility(opt.id)}
                        className={`btn-press flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-colors text-xs font-semibold ${
                          active
                            ? "border-foreground/40 bg-card text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                            : "border-border bg-transparent text-muted hover:text-foreground"
                        }`}
                      >
                        {opt.icon === "eye" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                        {opt.icon === "half" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                            <line x1="2" y1="2" x2="12" y2="12" />
                          </svg>
                        )}
                        {opt.icon === "hidden" && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        )}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-muted leading-relaxed">
                  {companionVisibility === "hidden"
                    ? "Персонаж полностью скрыт со всех страниц"
                    : companionVisibility === "half"
                      ? "Персонаж выглядывает из-за края экрана"
                      : "Персонаж полностью виден на экране"}
                </p>
              </div>

              <button
                onClick={() => {
                  try {
                    localStorage.setItem(AVATAR_POS_KEY, JSON.stringify(DEFAULT_POSITION));
                  } catch {}
                  window.dispatchEvent(new CustomEvent("medmind-avatar-reset"));
                }}
                className="btn-press w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-surface text-xs uppercase tracking-[0.22em] text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                Вернуть на место
              </button>
            </div>
          ) : view === "styles" ? (
            <div className="flex flex-col gap-3">
              {themes.map((t) => {
                const active = t.id === theme;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`btn-press w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      active
                        ? "border-foreground/40 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-6px_rgba(17,24,39,0.18)]"
                        : "border-border hover:border-foreground/20 bg-card"
                    }`}
                  >
                    {/* Swatches */}
                    <div className="flex -space-x-2 shrink-0">
                      {t.swatches.map((c, i) => (
                        <span
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-card shadow-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{t.name}</div>
                      <div className="text-[11px] text-muted mt-0.5">{t.description}</div>
                    </div>
                    {active && (
                      <div
                        className="shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center"
                        style={{ background: "var(--aurora-gradient-primary)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] overscroll-contain">
              {languages.map((l) => {
                const active = l.id === language;
                return (
                  <button
                    key={l.id}
                    disabled={!l.enabled}
                    onClick={() => l.enabled && setLanguage(l.id)}
                    className={`btn-press w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                      active
                        ? "border-foreground/40 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_4px_16px_-6px_rgba(17,24,39,0.18)]"
                        : "border-border hover:border-foreground/20 bg-card"
                    } ${!l.enabled ? "opacity-45 cursor-not-allowed" : ""}`}
                  >
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-[10px] uppercase tracking-widest text-foreground/70 font-semibold">
                      {l.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{l.native}</div>
                      <div className="text-[11px] text-muted mt-0.5">
                        {l.name}
                        {!l.enabled && " · скоро"}
                      </div>
                    </div>
                    {active && (
                      <div
                        className="shrink-0 w-6 h-6 rounded-full text-white flex items-center justify-center"
                        style={{ background: "var(--aurora-gradient-primary)" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Menu primitives =====

function MenuRow({
  onClick,
  icon,
  title,
  value,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-press w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-foreground/20 transition-all text-left"
    >
      <div className="shrink-0 w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted mt-0.5 truncate">{value}</div>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted shrink-0"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.8 3.8 5.8 3.8 9s-1.3 6.2-3.8 9c-2.5-2.8-3.8-5.8-3.8-9s1.3-6.2 3.8-9z" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 0 0 18 2 2 0 0 0 1.6-3.2 2 2 0 0 1 1.6-3.2H18a3 3 0 0 0 3-3c0-4.97-4.03-8.6-9-8.6z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.4a3 3 0 0 0 1.8 1.8L21 12l-5.4 1.8a3 3 0 0 0-1.8 1.8L12 21l-1.8-5.4a3 3 0 0 0-1.8-1.8L3 12l5.4-1.8a3 3 0 0 0 1.8-1.8L12 3z" />
      <path d="M19 3v3" />
      <path d="M17.5 4.5h3" />
      <path d="M5 17v3" />
      <path d="M3.5 18.5h3" />
    </svg>
  );
}

