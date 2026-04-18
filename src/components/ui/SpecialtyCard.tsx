"use client";

export interface TopicStats {
  name: string;
  total: number;
  answered: number;
}

interface SpecialtyCardProps {
  name: string;
  initial: string;
  cardCount: number;
  answeredCount: number;
  topics?: TopicStats[];
  expanded?: boolean;
  /** Клик по header: toggle accordion или направить в ленту специальности. */
  onHeaderClick?: () => void;
  /** Клик по конкретной теме (name - имя темы). */
  onTopicClick?: (topicName: string) => void;
  /** Клик по «Все темы специальности». */
  onAllTopicsClick?: () => void;
}

export default function SpecialtyCard({
  name,
  initial,
  cardCount,
  answeredCount,
  topics,
  expanded = false,
  onHeaderClick,
  onTopicClick,
  onAllTopicsClick,
}: SpecialtyCardProps) {
  const percent = cardCount > 0 ? Math.round((answeredCount / cardCount) * 100) : 0;

  return (
    <div className="bg-card aurora-hairline rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onHeaderClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left btn-press"
      >
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-semibold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, var(--aurora-indigo-soft), var(--aurora-violet-soft))",
            color: "var(--color-aurora-indigo)",
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-foreground font-normal tracking-tight truncate">
            {name}
          </div>
          <div className="text-[9px] text-muted mt-0.5 tracking-wide uppercase">
            {cardCount} карточек · {percent}%
          </div>
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
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          style={{
            color: expanded ? "var(--color-aurora-indigo)" : "var(--color-muted)",
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {expanded && topics && (
        <div
          className="px-3 pb-2.5 pt-1"
          style={{
            background:
              "linear-gradient(180deg, var(--aurora-indigo-soft), transparent)",
            borderTop: "1px solid var(--aurora-indigo-border)",
          }}
        >
          <button
            type="button"
            onClick={onAllTopicsClick}
            className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press mb-1"
            style={{
              background:
                "linear-gradient(180deg, var(--aurora-indigo-soft), var(--aurora-violet-soft))",
              border: "1px solid var(--aurora-indigo-border)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-foreground font-medium">
                Все темы специальности
              </div>
              <div
                className="h-[2px] rounded-full mt-1 overflow-hidden"
                style={{ background: "var(--aurora-indigo-soft)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                  }}
                />
              </div>
              <div className="text-[8px] text-muted mt-0.5 tracking-wide">
                {answeredCount} / {cardCount}
              </div>
            </div>
            <span className="text-[14px] font-extralight min-w-[28px] text-right tracking-tight aurora-text">
              {cardCount}
            </span>
          </button>

          {topics.map((topic) => {
            const topicPct = topic.total > 0 ? (topic.answered / topic.total) * 100 : 0;
            return (
              <button
                key={topic.name}
                type="button"
                onClick={() => onTopicClick?.(topic.name)}
                className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press hover:bg-surface"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-foreground font-normal">{topic.name}</div>
                  <div className="h-[2px] rounded-full mt-1 overflow-hidden" style={{ background: "var(--aurora-indigo-soft)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topicPct}%`,
                        background: "linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet))",
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-muted mt-0.5 tracking-wide">
                    {topic.answered} / {topic.total}
                  </div>
                </div>
                <span className="text-[14px] font-extralight text-foreground min-w-[28px] text-right tracking-tight">
                  {topic.total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
