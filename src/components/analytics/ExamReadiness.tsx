"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useProgress } from "@/hooks/useProgress";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { demoCards } from "@/data/cards";
import {
  computeExamReadiness,
  type TopicReadiness,
} from "@/lib/examReadiness";
import MagicCard from "@/components/ui/MagicCard";

export default function ExamReadiness() {
  const { progress } = useProgress();
  const { activeSpecialty } = useSpecialty();
  const router = useRouter();

  const report = useMemo(() => {
    if (!activeSpecialty) return null;
    return computeExamReadiness(
      progress.cardHistory,
      activeSpecialty.name,
      demoCards
    );
  }, [progress.cardHistory, activeSpecialty]);

  // Edge case: no specialty selected
  if (!activeSpecialty || !report) {
    return (
      <div className="text-center py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted mb-4">
          Выберите специальность, чтобы увидеть готовность
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem("return-to-profile", "1");
            } catch {}
            router.push("/topics");
          }}
          className="inline-block px-7 py-3 rounded-full btn-premium-dark text-sm font-medium btn-press"
        >
          Выбрать специальность
        </button>
      </div>
    );
  }

  // Edge case: specialty has no cards at all
  if (report.totalTopics === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">
          В специальности «{report.specialty}» пока нет карточек
        </p>
      </div>
    );
  }

  const hasAttempts = report.totalAttempts > 0;
  const weakTopics = report.topics.filter((t) => t.status === "weak");
  const developingTopics = report.topics.filter(
    (t) => t.status === "developing" && t.weight < 1
  );

  return (
    <div className="space-y-6">
      {/* Hero: readiness percent */}
      <MagicCard
        className="rounded-3xl"
        gradientFrom="#6366f1"
        gradientTo="#10b981"
        spotlightColor="rgba(16, 185, 129, 0.14)"
      >
        <div className="px-6 py-8 text-center">
          <div className="text-6xl md:text-7xl font-extralight tracking-tight leading-none aurora-text tabular-nums">
            {report.readinessPercent}
            <span className="text-3xl md:text-4xl">%</span>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem("return-to-profile", "1");
              } catch {}
              router.push("/topics");
            }}
            className="inline-flex items-center gap-1.5 mt-3 btn-press"
          >
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted font-medium">
              готовность · {report.specialty}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {/* Progress bar */}
          <div className="w-full h-1.5 mt-6 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${report.readinessPercent}%`,
                background: "linear-gradient(90deg, #6366f1, #10b981)",
              }}
            />
          </div>
          <p className="text-[10px] text-muted/70 mt-4 leading-relaxed">
            тема даёт полный вклад при 5+ попытках и высокой точности
          </p>
        </div>
      </MagicCard>

      {/* Key facts row */}
      <div className="grid grid-cols-3 gap-2">
        <FactCell
          value={`${report.touchedTopics}/${report.totalTopics}`}
          label="тем затронуто"
        />
        <FactCell
          value={hasAttempts ? `${report.averageAccuracy}%` : "—"}
          label="средняя точность"
        />
        <FactCell
          value={`${report.cardsSeen}/${report.totalCards}`}
          label="карточек"
        />
      </div>

      {/* Smart priority section */}
      {!hasAttempts ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted">
            Начните проходить карточки — данные появятся после первых ответов
          </p>
        </div>
      ) : weakTopics.length > 0 ? (
        <PrioritySection
          title="Приоритет — проработать"
          topics={weakTopics.slice(0, 5)}
          onOpen={(t) => router.push(`/feed?topic=${encodeURIComponent(t)}`)}
          variant="weak"
        />
      ) : developingTopics.length > 0 ? (
        <PrioritySection
          title="Добрать практику"
          topics={[...developingTopics]
            .sort((a, b) => a.weight - b.weight)
            .slice(0, 5)}
          onOpen={(t) => router.push(`/feed?topic=${encodeURIComponent(t)}`)}
          variant="developing"
        />
      ) : (
        <div className="text-center py-4 px-3 rounded-lg bg-surface">
          <p className="text-xs text-foreground">
            Все темы освоены. Поддерживай форму через повторения.
          </p>
        </div>
      )}

      {/* All topics disclosure */}
      <details className="group" open={!hasAttempts}>
        <summary className="cursor-pointer list-none flex items-center justify-between py-2">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted font-medium">
            Все темы специальности
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted transition-transform group-open:rotate-180"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="mt-3 space-y-1">
          {report.topics.map((t) => (
            <AllTopicsRow key={t.topic} topic={t} />
          ))}
        </div>
      </details>
    </div>
  );
}

function FactCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center py-3 rounded-lg bg-surface">
      <div className="text-lg font-extralight tracking-tight leading-none text-foreground">
        {value}
      </div>
      <p className="text-[9px] uppercase tracking-[0.12em] text-muted mt-1.5 font-medium">
        {label}
      </p>
    </div>
  );
}

function PrioritySection({
  title,
  topics,
  onOpen,
  variant,
}: {
  title: string;
  topics: TopicReadiness[];
  onOpen: (topic: string) => void;
  variant: "weak" | "developing";
}) {
  return (
    <div>
      <p
        className={`text-[10px] uppercase tracking-[0.15em] font-medium mb-2 ${
          variant === "weak" ? "text-danger" : "text-warning"
        }`}
      >
        {title}
      </p>
      <div className="space-y-1">
        {topics.map((t) => (
          <button
            key={t.topic}
            onClick={() => onOpen(t.topic)}
            className="w-full flex items-center gap-3 py-2 px-3 rounded-lg bg-surface hover:bg-surface/70 transition-colors text-left btn-press"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{t.topic}</p>
              <p className="text-[10px] text-muted mt-0.5">
                {t.attempts}{" "}
                {pluralize(t.attempts, "попытка", "попытки", "попыток")} ·{" "}
                {Math.round(t.accuracy * 100)}% точность
              </p>
            </div>
            <div className="w-16 h-1 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  variant === "weak" ? "bg-danger" : "bg-warning"
                }`}
                style={{ width: `${Math.round(t.contribution * 100)}%` }}
              />
            </div>
            <svg
              width="14"
              height="14"
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
        ))}
      </div>
    </div>
  );
}

function AllTopicsRow({ topic: t }: { topic: TopicReadiness }) {
  const isUntouched = t.status === "untouched";
  const barColor =
    t.status === "weak"
      ? "bg-danger"
      : t.status === "strong"
        ? "bg-success"
        : "bg-primary";

  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
        isUntouched
          ? "border border-dashed border-border/60 bg-transparent"
          : "bg-surface"
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground truncate">{t.topic}</p>
        <p className="text-[10px] text-muted mt-0.5">
          {isUntouched ? "—" : `${t.cardsSeen}/${t.totalCards} карточек`}
        </p>
      </div>
      {!isUntouched && (
        <>
          <div className="w-14 h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor}`}
              style={{ width: `${Math.round(t.contribution * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted w-9 text-right tabular-nums">
            {Math.round(t.accuracy * 100)}%
          </span>
        </>
      )}
    </div>
  );
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}
