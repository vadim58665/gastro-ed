"use client";

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

/**
 * Вертикальная лента вопросов в режиме просмотра. Каждый вопрос
 * рендерится как самодостаточная карточка с подсвеченным правильным
 * ответом, доступной подсказкой и разбором. Пользователь просто
 * листает скроллом — ничего не прорешивается и не засчитывается.
 */
export default function BrowseFeed({ questions, specialtyId, label }: Props) {
  return (
    <div className="flex flex-col gap-4 px-3 pb-8">
      {label && (
        <div className="px-3 pt-2">
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
      {questions.map((q, index) => (
        <div
          key={q.id}
          className="w-full max-w-lg mx-auto bg-card rounded-3xl aurora-hairline"
        >
          <div className="px-6 pt-4">
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted font-medium">
              Вопрос {index + 1}
              <span className="text-muted/60"> / {questions.length}</span>
            </p>
          </div>
          <QuestionView
            question={q}
            mode="browse"
            specialtyId={specialtyId}
            canGoPrevious={false}
          />
        </div>
      ))}
    </div>
  );
}
