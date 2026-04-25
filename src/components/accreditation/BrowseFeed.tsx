"use client";

import { memo, useEffect, useRef, useState } from "react";
import type { TestQuestion } from "@/types/accreditation";
import QuestionView from "./QuestionView";

interface Props {
  questions: TestQuestion[];
  specialtyId?: string;
  /**
   * Опциональный заголовок ленты (например, «Блок 1» или «Печень»).
   * Рендерится над первой карточкой.
   */
  label?: string;
}

interface BrowseItemProps {
  q: TestQuestion;
  index: number;
  total: number;
  specialtyId?: string;
  isActive: boolean;
}

const BrowseItem = memo(function BrowseItem({
  q,
  index,
  total,
  specialtyId,
  isActive,
}: BrowseItemProps) {
  return (
    <div
      data-browse-index={index}
      className="w-full max-w-lg mx-auto bg-card rounded-3xl aurora-hairline browse-item"
    >
      <div className="px-6 pt-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted font-medium">
          Вопрос {index + 1}
          <span className="text-muted/60"> / {total}</span>
        </p>
      </div>
      <QuestionView
        question={q}
        mode="browse"
        specialtyId={specialtyId}
        canGoPrevious={false}
        isActive={isActive}
      />
    </div>
  );
});

/**
 * Вертикальная лента всех вопросов блока (до 100 карточек) в режиме
 * просмотра. Каждая карточка — самодостаточная: подсвеченный правильный
 * ответ, доступная подсказка, разбор.
 *
 * Без виртуализации: блок ограничен 100 вопросами, и пользователю удобнее
 * быстрый скролл без подгрузки на лету. Все 100 карточек рендерятся сразу,
 * картинки внутри ленятся через `loading="lazy"`. React.memo на каждой
 * карточке предотвращает лишние перерисовки при изменении состояния
 * соседей.
 *
 * Активная карточка определяется по IntersectionObserver — это нужно,
 * чтобы только одна (видимая) карточка публиковала свой контекст в
 * MedMind. Иначе все 100 mounted QuestionView дёргают setScreen, и
 * подсказка показывается не к тому вопросу, который видит пользователь.
 */
export default function BrowseFeed({ questions, specialtyId, label }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const els = Array.from(
      root.querySelectorAll<HTMLDivElement>("[data-browse-index]")
    );
    if (els.length === 0) return;

    // Храним последние ratios всех элементов и выбираем максимальный.
    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number(
            (entry.target as HTMLElement).dataset.browseIndex ?? "0"
          );
          ratios.set(idx, entry.intersectionRatio);
        }
        let bestIdx = 0;
        let bestRatio = -1;
        for (const [idx, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIdx = idx;
          }
        }
        if (bestRatio > 0) {
          setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx));
        }
      },
      {
        root,
        // Порог 50% — карточка активна, когда она видна хотя бы наполовину.
        // Несколько порогов дают плавное переключение при скролле.
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [questions.length]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {label && (
        <div className="px-6 pt-4 pb-1">
          <p
            className="text-[10px] uppercase tracking-[0.28em] font-semibold"
            style={{ color: "var(--color-aurora-violet)" }}
          >
            Просмотр
          </p>
          <h1 className="text-2xl font-extralight aurora-text tracking-tight mt-1">
            {label}
          </h1>
          <p className="text-[11px] text-muted mt-1">
            {questions.length} вопросов · пролистайте и изучите разбор
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 px-3 pb-8">
        {questions.map((q, i) => (
          <BrowseItem
            key={q.id}
            q={q}
            index={i}
            total={questions.length}
            specialtyId={specialtyId}
            isActive={i === activeIndex}
          />
        ))}
      </div>
    </div>
  );
}
