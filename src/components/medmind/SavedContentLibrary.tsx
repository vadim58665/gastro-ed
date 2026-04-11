"use client";

import { useState } from "react";
import { useSavedContent, type SavedContentItem } from "@/hooks/useSavedContent";

const CONTENT_TYPES = [
  { key: "", label: "Все" },
  { key: "mnemonic", label: "Мнемоники" },
  { key: "poem", label: "Стишки" },
  { key: "image", label: "Картинки" },
  { key: "explanation", label: "Объяснения" },
  { key: "learning_plan", label: "Планы" },
] as const;

export default function SavedContentLibrary() {
  const [selectedType, setSelectedType] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const { items, loading, toggleFavorite, deleteContent } = useSavedContent({
    type: selectedType || undefined,
    favoritesOnly: showFavoritesOnly,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium">
          Мои материалы
        </p>
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`text-[10px] uppercase tracking-widest transition-colors ${
            showFavoritesOnly ? "text-primary" : "text-muted"
          }`}
        >
          Избранное
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {CONTENT_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className={`shrink-0 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest transition-colors ${
              selectedType === key
                ? "bg-primary text-white"
                : "border border-border text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-border" />

      {/* Content list */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted">Загрузка...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted">
            {showFavoritesOnly
              ? "Нет избранных материалов"
              : "Пока нет сохранённых материалов"}
          </p>
          <p className="text-[10px] text-muted/60 mt-1">
            Создавайте мнемоники и стишки через AI-помощника
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SavedContentCard
              key={item.id}
              item={item}
              onToggleFavorite={() =>
                toggleFavorite(item.id, !item.is_favorite)
              }
              onDelete={() => deleteContent(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SavedContentCard({
  item,
  onToggleFavorite,
  onDelete,
}: {
  item: SavedContentItem;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeLabels: Record<string, string> = {
    mnemonic: "МНЕМОНИКА",
    poem: "СТИШОК",
    image: "КАРТИНКА",
    explanation: "ОБЪЯСНЕНИЕ",
    learning_plan: "ПЛАН",
    tip: "ПОДСКАЗКА",
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-primary font-medium">
            {typeLabels[item.content_type] ?? item.content_type}
          </p>
          <p className="text-xs text-foreground truncate mt-0.5">
            {item.topic}
          </p>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-muted transition-transform shrink-0 ml-2 ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-border/50">
          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.topic}
              className="w-full rounded-lg mt-3 mb-2"
            />
          )}
          <p className="text-sm text-foreground leading-relaxed mt-2 whitespace-pre-line">
            {item.content_ru}
          </p>
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/30">
            <button
              onClick={onToggleFavorite}
              className={`text-[10px] uppercase tracking-widest transition-colors ${
                item.is_favorite ? "text-primary" : "text-muted"
              }`}
            >
              {item.is_favorite ? "В избранном" : "В избранное"}
            </button>
            <button
              onClick={onDelete}
              className="text-[10px] uppercase tracking-widest text-muted hover:text-danger transition-colors"
            >
              Удалить
            </button>
            <p className="text-[9px] text-muted/50 ml-auto">
              {new Date(item.created_at).toLocaleDateString("ru-RU")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
