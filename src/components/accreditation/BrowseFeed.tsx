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

    // IO просто подписывает нас на «что-то изменилось в видимости» —
    // дальше сами выбираем активную карточку по близости её центра
    // к центру viewport. Это даёт детерминированный ответ, когда
    // две карточки видны 50/50: побеждает та, что ближе к центру.
    const recompute = () => {
      const rootRect = root.getBoundingClientRect();
      const viewportCenter = (rootRect.top + rootRect.bottom) / 2;
      let bestIdx = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        // Карточка совсем за пределами — пропускаем.
        if (r.bottom < rootRect.top || r.top > rootRect.bottom) continue;
        const cardCenter = (r.top + r.bottom) / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = Number(el.dataset.browseIndex ?? "0");
        }
      }
      setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx));
    };

    let rafId: number | null = null;
    const onChange = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        recompute();
      });
    };

    // IO даёт нам сигнал «что-то въехало/выехало», без бесконечного цикла
    // scroll-listener'а. Сам выбор активной карточки — выше, по геометрии.
    const observer = new IntersectionObserver(onChange, {
      root,
      threshold: [0, 0.5, 1],
    });
    els.forEach((el) => observer.observe(el));

    // Дополнительно слушаем сам скролл — IO срабатывает только на
    // пересечении порогов, а быстрый скролл между ними не двинет активную.
    root.addEventListener("scroll", onChange, { passive: true });

    // Первичный расчёт.
    recompute();

    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", onChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
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
