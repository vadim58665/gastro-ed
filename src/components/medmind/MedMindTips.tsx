"use client";

import { useState, useCallback } from "react";
import { useMedMindAnalytics } from "@/hooks/useMedMindAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import type { ContentType, GeneratedContent } from "@/types/medmind";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "mnemonic_acronym", label: "Акроним" },
  { value: "mnemonic_story", label: "История" },
  { value: "mnemonic_rhyme", label: "Рифма" },
  { value: "memory_poem", label: "Стихи" },
  { value: "tip", label: "Подсказка" },
];

async function getToken(): Promise<string | null> {
  const { getSupabase } = await import("@/lib/supabase/client");
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

export default function MedMindTips() {
  const { weakTopics, topics } = useMedMindAnalytics();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [selectedType, setSelectedType] = useState<ContentType>("mnemonic_rhyme");

  const handleGenerate = useCallback(
    async (topic: string) => {
      setGenerating(true);
      setGenerated(null);

      const token = await getToken();
      if (!token) {
        setGenerating(false);
        return;
      }

      try {
        const res = await fetch("/api/medmind/generate", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type: selectedType, topic }),
        });

        if (res.ok) {
          const data = await res.json();
          setGenerated({
            id: data.id,
            topic,
            contentType: selectedType,
            contentRu: data.contentRu,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        // Network error
      }
      setGenerating(false);
    },
    [selectedType]
  );

  if (topics.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted text-sm">
          Ответьте на несколько карточек, чтобы MedMind проанализировал ваши знания
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
          ТИП ГЕНЕРАЦИИ
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                selectedType === value
                  ? "bg-primary text-white"
                  : "border border-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-border" />

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
            СЛАБЫЕ ТЕМЫ
          </p>
          <div className="space-y-2">
            {weakTopics.slice(0, 5).map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between border border-border rounded-xl px-4 py-3"
              >
                <div>
                  <p className="text-sm text-foreground">{topic.topic}</p>
                  <p className="text-[10px] text-danger">
                    {Math.round(topic.errorRate * 100)}% ошибок
                  </p>
                </div>
                <button
                  onClick={() => handleGenerate(topic.topic)}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-full border border-primary text-primary text-[11px] btn-press disabled:opacity-50"
                >
                  {generating ? "..." : "Создать"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated content */}
      {generated && (
        <>
          <div className="w-full h-px bg-border" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
              СГЕНЕРИРОВАНО
            </p>
            <div className="border border-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary mb-2">
                {generated.topic}
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {generated.contentRu}
              </p>
            </div>
          </div>
        </>
      )}

      {/* All topics overview */}
      <div className="w-full h-px bg-border" />
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
          ВСЕ ТЕМЫ
        </p>
        <div className="space-y-2">
          {topics.slice(0, 10).map((t) => (
            <div key={t.topic} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{t.topic}</p>
              </div>
              <div className="w-24 h-1.5 bg-surface rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    t.masteryScore > 0.85
                      ? "bg-success"
                      : t.isWeak
                        ? "bg-danger"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.round(t.masteryScore * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted w-8 text-right">
                {Math.round(t.masteryScore * 100)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
