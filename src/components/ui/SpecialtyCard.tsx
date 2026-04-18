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
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.02)",
      }}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left btn-press"
      >
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-semibold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.12))",
            color: "#6366F1",
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
          style={{ color: expanded ? "#6366F1" : "#94a3b8" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {expanded && topics && (
        <div
          className="px-3 pb-2.5 pt-1"
          style={{
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.03), transparent)",
            borderTop: "1px solid rgba(99,102,241,0.06)",
          }}
        >
          <button
            type="button"
            onClick={onAllTopicsClick}
            className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press mb-1"
            style={{
              background:
                "linear-gradient(180deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-foreground font-medium">
                Все темы специальности
              </div>
              <div
                className="h-[2px] bg-[rgba(99,102,241,0.08)] rounded-full mt-1 overflow-hidden"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg, #6366F1, #A855F7)",
                  }}
                />
              </div>
              <div className="text-[8px] text-muted mt-0.5 tracking-wide">
                {answeredCount} / {cardCount}
              </div>
            </div>
            <span
              className="text-[14px] font-extralight min-w-[28px] text-right tracking-tight"
              style={{
                background: "linear-gradient(135deg, #1A1A2E, #6366F1)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
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
                className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press hover:bg-[rgba(99,102,241,0.04)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-foreground font-normal">{topic.name}</div>
                  <div className="h-[2px] bg-[rgba(99,102,241,0.08)] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topicPct}%`,
                        background: "linear-gradient(90deg, #6366F1, #A855F7)",
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
