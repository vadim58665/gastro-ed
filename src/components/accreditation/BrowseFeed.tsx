"use client";

import { memo, useRef } from "react";
import type { TestQuestion } from "@/types/accreditation";
import QuestionView from "./QuestionView";
import { useVirtualWindow } from "@/hooks/useVirtualWindow";

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
}

const BrowseItem = memo(function BrowseItem({
  q,
  index,
  total,
  specialtyId,
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
      />
    </div>
  );
});

/**
 * Вертикальная лента вопросов в режиме просмотра. Каждый вопрос —
 * самодостаточная карточка с подсвеченным правильным ответом, доступной
 * подсказкой и разбором.
 *
 * Виртуализация: для больших блоков (до 100 вопросов) рендерится только
 * окно ±5 вокруг видимой карточки, остальные — пустые распорки.
 * Используется тот же `useVirtualWindow`, что и в основной ленте /feed.
 */
export default function BrowseFeed({ questions, specialtyId, label }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { startIndex, endIndex, topSpacerPx, bottomSpacerPx } = useVirtualWindow({
    itemCount: questions.length,
    // Высота карточек в browse-режиме переменная (зависит от длины вопроса,
    // наличия картинки, раскрытого AutoExplain). `itemHeight: null` сообщает
    // хуку измерять контейнер; внутри хук всё равно считает индекс через
    // округление scrollTop/h, что для разновысоких элементов даёт
    // приблизительную, но плавную навигацию — виртуализатор подстроится
    // когда карточка попадёт в viewport.
    itemHeight: null,
    containerRef: scrollRef,
    overscanBefore: 3,
    overscanAfter: 4,
  });

  const visible = questions.slice(startIndex, endIndex);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
        {topSpacerPx > 0 && (
          <div aria-hidden style={{ height: `${topSpacerPx}px` }} />
        )}
        {visible.map((q, relIdx) => {
          const i = startIndex + relIdx;
          return (
            <BrowseItem
              key={q.id}
              q={q}
              index={i}
              total={questions.length}
              specialtyId={specialtyId}
            />
          );
        })}
        {bottomSpacerPx > 0 && (
          <div aria-hidden style={{ height: `${bottomSpacerPx}px` }} />
        )}
      </div>
    </div>
  );
}
