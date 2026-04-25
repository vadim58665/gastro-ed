"use client";

import { memo } from "react";
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
 * Вертикальная лента всех вопросов блока (до 100 карточек) в режиме
 * просмотра. Каждая карточка — самодостаточная: подсвеченный правильный
 * ответ, доступная подсказка, разбор.
 *
 * Без виртуализации: блок ограничен 100 вопросами, и пользователю удобнее
 * быстрый скролл без подгрузки на лету. Все 100 карточек рендерятся сразу,
 * картинки внутри ленятся через `loading="lazy"`. React.memo на каждой
 * карточке предотвращает лишние перерисовки при изменении состояния
 * соседей.
 */
export default function BrowseFeed({ questions, specialtyId, label }: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
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
          />
        ))}
      </div>
    </div>
  );
}
