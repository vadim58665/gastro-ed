"use client";

import { useMedMindAnalytics } from "@/hooks/useMedMindAnalytics";
import { getMasteryLevel, ALL_MASTERY_LEVELS } from "@/lib/mastery";
import MasteryBadge from "./MasteryBadge";

export default function MasteryDashboard() {
  const { topics: topicAnalyses } = useMedMindAnalytics();

  if (topicAnalyses.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-muted uppercase tracking-widest">
          Начните отвечать на вопросы, чтобы увидеть мастерство
        </p>
      </div>
    );
  }

  const grouped = ALL_MASTERY_LEVELS.map((level) => {
    const topics = topicAnalyses.filter(
      (a) => getMasteryLevel(a).level === level.level
    );
    return { ...level, topics };
  }).filter((g) => g.topics.length > 0);

  const totalTopics = topicAnalyses.length;
  const masteryDistribution = ALL_MASTERY_LEVELS.map((level) => {
    const count = topicAnalyses.filter(
      (a) => getMasteryLevel(a).level === level.level
    ).length;
    return { ...level, count, percent: totalTopics ? Math.round((count / totalTopics) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      {/* Distribution bar */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
          Распределение по уровням
        </p>
        <div className="flex h-2 rounded-full overflow-hidden bg-surface">
          {masteryDistribution.map((d) =>
            d.percent > 0 ? (
              <div
                key={d.level}
                className={`h-full ${
                  d.level === "student" ? "bg-danger" :
                  d.level === "resident" ? "bg-warning" :
                  d.level === "doctor" ? "bg-primary" :
                  d.level === "professor" ? "bg-success" :
                  "bg-foreground"
                }`}
                style={{ width: `${d.percent}%` }}
              />
            ) : null
          )}
        </div>
        <div className="flex justify-between mt-2">
          {masteryDistribution.filter((d) => d.count > 0).map((d) => (
            <span key={d.level} className={`text-[10px] ${d.color}`}>
              {d.label} {d.count}
            </span>
          ))}
        </div>
      </div>

      {/* Topics grouped by mastery */}
      {grouped.map((group) => (
        <div key={group.level}>
          <p className={`text-[10px] uppercase tracking-[0.15em] font-medium mb-2 ${group.color}`}>
            {group.label}
          </p>
          <div className="space-y-1">
            {group.topics.map((topic) => (
              <div
                key={topic.topic}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-surface"
              >
                <span className="text-xs text-foreground">{topic.topic}</span>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        topic.errorRate > 0.40 ? "bg-danger" :
                        topic.errorRate > 0.20 ? "bg-warning" :
                        "bg-success"
                      }`}
                      style={{ width: `${Math.round(topic.masteryScore * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted w-8 text-right">
                    {Math.round(topic.masteryScore * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
