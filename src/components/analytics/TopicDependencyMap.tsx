"use client";

import { useMedMindAnalytics } from "@/hooks/useMedMindAnalytics";
import { getMasteryLevel } from "@/lib/mastery";

interface TopicNode {
  topic: string;
  prerequisites: string[];
}

const TOPIC_GRAPH: TopicNode[] = [
  { topic: "Анатомия ЖКТ", prerequisites: [] },
  { topic: "Физиология пищеварения", prerequisites: ["Анатомия ЖКТ"] },
  { topic: "ГЭРБ", prerequisites: ["Физиология пищеварения"] },
  { topic: "Гастрит", prerequisites: ["Физиология пищеварения"] },
  { topic: "Язвенная болезнь", prerequisites: ["Гастрит"] },
  { topic: "H. pylori", prerequisites: ["Гастрит", "Язвенная болезнь"] },
  { topic: "Функциональная диспепсия", prerequisites: ["Гастрит"] },
  { topic: "Целиакия", prerequisites: ["Физиология пищеварения"] },
  { topic: "ВЗК", prerequisites: ["Физиология пищеварения"] },
  { topic: "Болезнь Крона", prerequisites: ["ВЗК"] },
  { topic: "Язвенный колит", prerequisites: ["ВЗК"] },
  { topic: "СРК", prerequisites: ["Функциональная диспепсия"] },
  { topic: "Панкреатит", prerequisites: ["Физиология пищеварения"] },
  { topic: "Гепатит", prerequisites: ["Физиология пищеварения"] },
  { topic: "Цирроз печени", prerequisites: ["Гепатит"] },
  { topic: "Желчнокаменная болезнь", prerequisites: ["Физиология пищеварения"] },
  { topic: "Колоректальный рак", prerequisites: ["ВЗК", "Язвенный колит"] },
];

export default function TopicDependencyMap() {
  const { topics } = useMedMindAnalytics();

  const masteryMap = new Map(
    topics.map((t) => [t.topic, getMasteryLevel(t)])
  );

  // Group by depth (BFS from roots)
  const visited = new Set<string>();
  const layers: TopicNode[][] = [];
  let currentLayer = TOPIC_GRAPH.filter((n) => n.prerequisites.length === 0);

  while (currentLayer.length > 0) {
    layers.push(currentLayer);
    for (const node of currentLayer) visited.add(node.topic);

    const nextLayer = TOPIC_GRAPH.filter(
      (n) =>
        !visited.has(n.topic) &&
        n.prerequisites.every((p) => visited.has(p))
    );
    if (nextLayer.length === 0) break;
    currentLayer = nextLayer;
  }

  // Add remaining unvisited
  const remaining = TOPIC_GRAPH.filter((n) => !visited.has(n.topic));
  if (remaining.length > 0) layers.push(remaining);

  if (layers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-muted uppercase tracking-widest">
          Нет данных для карты
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {layers.map((layer, layerIdx) => (
        <div key={layerIdx}>
          {layerIdx > 0 && (
            <div className="flex justify-center my-2">
              <svg width="12" height="16" viewBox="0 0 12 16" className="text-border">
                <path d="M6 0v12M2 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-center">
            {layer.map((node) => {
              const mastery = masteryMap.get(node.topic);
              const colorClass = mastery?.color || "text-muted";
              const hasMastery = !!mastery;

              return (
                <div
                  key={node.topic}
                  className={`px-3 py-2 rounded-lg border text-center ${
                    hasMastery
                      ? "border-border bg-surface"
                      : "border-dashed border-border/60 bg-transparent"
                  }`}
                >
                  <p className="text-[11px] text-foreground leading-tight">
                    {node.topic}
                  </p>
                  {mastery && (
                    <p className={`text-[9px] uppercase tracking-widest font-medium mt-1 ${colorClass}`}>
                      {mastery.label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-muted/60 text-center mt-4">
        Пунктирная рамка - тема ещё не изучалась
      </p>
    </div>
  );
}
