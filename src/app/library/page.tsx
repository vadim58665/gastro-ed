"use client";

import { useState } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSavedContent, type SavedContentItem } from "@/hooks/useSavedContent";

type ContentType = "" | "mnemonic" | "poem" | "image" | "explanation" | "learning_plan";

const CONTENT_TYPES: { key: ContentType; label: string }[] = [
  { key: "", label: "Все" },
  { key: "mnemonic", label: "Мнемоники" },
  { key: "poem", label: "Стишки" },
  { key: "image", label: "Картинки" },
  { key: "explanation", label: "Объяснения" },
  { key: "learning_plan", label: "Планы" },
];

const TYPE_LABELS: Record<string, string> = {
  mnemonic: "Мнемоника",
  poem: "Стишок",
  image: "Картинка",
  explanation: "Объяснение",
  learning_plan: "План",
  tip: "Подсказка",
};

const TYPE_GRADIENTS: Record<string, string> = {
  mnemonic: "linear-gradient(135deg, var(--color-aurora-violet), var(--color-aurora-pink))",
  poem: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
  image: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
  explanation: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
  learning_plan: "linear-gradient(135deg, var(--color-aurora-pink), var(--color-aurora-violet))",
  tip: "linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-pink))",
};

const BRAIN_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 0 4 3 3 0 0 0 2 5 3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M15 2a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1 0 4 3 3 0 0 1-2 5 3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
  </svg>
);
const MUSIC_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
const IMAGE_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const BULB_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.8.7 1 1.3 1 2.3v1h6v-1c0-1 .2-1.6 1-2.3A7 7 0 0 0 12 2z" />
  </svg>
);
const CHECKLIST_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const DOC_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const TYPE_ICONS: Record<string, React.ReactNode> = {
  mnemonic: BRAIN_SVG,
  poem: MUSIC_SVG,
  image: IMAGE_SVG,
  explanation: BULB_SVG,
  learning_plan: CHECKLIST_SVG,
  tip: DOC_SVG,
};

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

export default function LibraryPage() {
  const [selectedType, setSelectedType] = useState<ContentType>("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const { items, loading, toggleFavorite, deleteContent } = useSavedContent({
    type: selectedType || undefined,
    favoritesOnly,
  });

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        <div className="px-6 max-w-lg mx-auto">
          {/* Hero */}
          <div className="text-center pt-4 pb-6">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-2"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Моя библиотека
            </p>
            <div className="text-[64px] font-extralight tracking-tight leading-none aurora-text tabular-nums">
              {items.length}
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] mt-2 font-medium text-muted">
              {pluralize(items.length, "материал", "материала", "материалов")}
            </p>
            <div className="w-12 h-px bg-border mx-auto mt-6" />
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] uppercase tracking-[0.25em] font-semibold text-muted">
              Мои материалы
            </p>
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className="btn-press text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full font-medium transition-all"
              style={
                favoritesOnly
                  ? {
                      background: "var(--aurora-gradient-premium)",
                      color: "#fff",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 12px -4px color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent)",
                    }
                  : {
                      background: "var(--aurora-pink-soft)",
                      color: "var(--color-aurora-pink)",
                      border: "1px solid var(--aurora-pink-border)",
                    }
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill={favoritesOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15 9 22 9 17 14 19 22 12 18 5 22 7 14 2 9 9 9" />
                </svg>
                Избранное
              </span>
            </button>
          </div>

          {/* Chip filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mb-5 -mx-6 px-6">
            {CONTENT_TYPES.map(({ key, label }) => {
              const isActive = selectedType === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all btn-press ${
                    isActive
                      ? "text-white"
                      : "bg-surface text-foreground aurora-hairline"
                  }`}
                  style={
                    isActive
                      ? {
                          background: "var(--aurora-gradient-premium)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 24px -10px color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent)",
                        }
                      : { boxShadow: "0 1px 2px rgba(17,24,39,0.03)" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center py-12">
              <div
                className="w-6 h-6 rounded-full border-2 border-t-transparent mx-auto animate-spin"
                style={{ borderColor: "var(--color-aurora-indigo)", borderTopColor: "transparent" }}
              />
              <p className="text-[11px] text-muted mt-3">Загрузка…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <div
                className="text-[10px] uppercase tracking-[0.22em] font-medium mb-2"
                style={{ color: "var(--color-aurora-violet)" }}
              >
                {favoritesOnly ? "Избранного нет" : "Пусто"}
              </div>
              <p className="text-[13px] text-muted max-w-[260px] mx-auto leading-relaxed">
                {favoritesOnly
                  ? "Отметь материалы звёздочкой, чтобы быстро возвращаться к ним"
                  : "Создавай мнемоники, стишки и объяснения через Ассистента, они появятся здесь"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  onToggleFavorite={() => toggleFavorite(item.id, !item.is_favorite)}
                  onDelete={() => deleteContent(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

interface LibraryCardProps {
  item: SavedContentItem;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function LibraryCard({ item, onToggleFavorite, onDelete }: LibraryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = TYPE_ICONS[item.content_type] ?? DOC_SVG;
  const gradient = TYPE_GRADIENTS[item.content_type] ?? TYPE_GRADIENTS.tip;
  const typeLabel = TYPE_LABELS[item.content_type] ?? item.content_type;
  const dateStr = new Date(item.created_at).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className="relative rounded-2xl aurora-hairline bg-card overflow-hidden"
      style={{ boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="btn-press w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: gradient,
            color: "#fff",
            boxShadow: "0 4px 10px -3px color-mix(in srgb, var(--color-aurora-violet) 35%, transparent)",
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[9px] tracking-[0.22em] uppercase font-medium"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              {typeLabel}
            </span>
            {item.is_favorite && (
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ color: "var(--color-aurora-pink)" }}
              >
                <polygon points="12 2 15 9 22 9 17 14 19 22 12 18 5 22 7 14 2 9 9 9" />
              </svg>
            )}
          </div>
          <div className="text-[14px] font-medium text-foreground mt-0.5 truncate">
            {item.topic}
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--aurora-indigo-border)" }}>
          {item.image_url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.image_url}
              alt={item.topic}
              className="w-full rounded-xl mt-3 mb-2"
            />
          )}
          <p className="text-[13px] text-foreground mt-3 leading-relaxed whitespace-pre-line">
            {item.content_ru}
          </p>
          <div
            className="flex items-center gap-3 mt-4 pt-3"
            style={{ borderTop: "1px solid var(--aurora-indigo-border)" }}
          >
            <button
              onClick={onToggleFavorite}
              className="btn-press text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full font-medium transition-all"
              style={
                item.is_favorite
                  ? {
                      background: "var(--aurora-pink-soft)",
                      color: "var(--color-aurora-pink)",
                      border: "1px solid var(--aurora-pink-border)",
                    }
                  : {
                      background: "var(--aurora-indigo-soft)",
                      color: "var(--color-aurora-indigo)",
                      border: "1px solid var(--aurora-indigo-border)",
                    }
              }
            >
              {item.is_favorite ? "В избранном" : "В избранное"}
            </button>
            <button
              onClick={onDelete}
              className="btn-press text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full font-medium text-muted hover:text-foreground transition-colors"
            >
              Удалить
            </button>
            <span className="ml-auto text-[10px] text-muted tabular-nums">{dateStr}</span>
          </div>
        </div>
      )}
    </div>
  );
}
