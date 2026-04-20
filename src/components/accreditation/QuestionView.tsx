"use client";

import { useState, useEffect, useRef } from "react";
import type { TestQuestion } from "@/types/accreditation";
import HintButton from "@/components/feed/HintButton";
import AutoExplain from "@/components/feed/AutoExplain";
import { useMedMind } from "@/contexts/MedMindContext";

interface Props {
  question: TestQuestion;
  /**
   * `learn` — правильный показывается сразу, можно кликать (обучающий режим).
   * `test` — после ответа подсветка правильного + разбор.
   * `exam` — результат скрыт до конца экзамена, виден только выбранный вариант.
   * `browse` — просмотр без прорешивания: правильный подсвечен индиго сразу,
   *   варианты нельзя выбрать, onAnswer не вызывается, прогресс не трогается.
   */
  mode: "learn" | "test" | "exam" | "browse";
  specialtyId?: string;
  onAnswer?: (isCorrect: boolean, selectedIndex: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoPrevious?: boolean;
  existingSelectedIndex?: number | null;
}

export default function QuestionView({
  question,
  mode,
  specialtyId,
  onAnswer,
  onNext,
  onPrevious,
  canGoPrevious,
  existingSelectedIndex = null,
}: Props) {
  const hasExisting = existingSelectedIndex !== null && existingSelectedIndex !== undefined;
  const isBrowse = mode === "browse";
  const [selected, setSelected] = useState<number | null>(hasExisting ? existingSelectedIndex! : null);
  const [showResult, setShowResult] = useState(mode === "learn" || isBrowse || hasExisting);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setScreen } = useMedMind();

  // Publish current screen context to MedMind so the AI assistant knows
  // which question is open, in which mode, and whether it's been answered.
  useEffect(() => {
    setScreen({
      kind: "accred_question",
      question,
      specialtyId: specialtyId ?? question.specialty,
      mode,
      isAnswered: selected !== null,
      selectedIndex: selected ?? undefined,
    });
  }, [question, mode, specialtyId, selected, setScreen]);

  const handleNext = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    setSelected(null);
    // browse: правильный снова подсвечен сразу при переходе к следующему.
    setShowResult(mode === "learn" || isBrowse);
    onNext?.();
  };

  const handlePrevious = () => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
    onPrevious?.();
  };

  const handleSelect = (index: number) => {
    // В режиме просмотра варианты нельзя выбрать — правильный уже подсвечен,
    // прогресс не трогается.
    if (isBrowse) return;
    if (hasExisting) return; // already answered, locked in review mode
    if (selected !== null && mode !== "learn") return;
    setSelected(index);

    if (mode !== "learn") {
      // В «test» режиме сразу показываем верный ответ и разбор.
      // В «exam» режиме результат скрыт до конца экзамена — виден только
      // нейтральный индикатор выбора, но не правильный/неправильный вариант.
      if (mode === "test") {
        setShowResult(true);
      }
      const isCorrect = index === question.correctIndex;
      onAnswer?.(isCorrect, index);
      // Без auto-advance: пользователь видит результат и разбор, нажимает
      // «Следующий вопрос» сам. Так можно зафиксировать ответ и прочитать
      // объяснение без спешки.
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // После ответа всегда показываем «Следующий вопрос» — пользователь
  // нажимает сам, когда готов двигаться дальше (авто-переход убран).
  // В browse — кнопка доступна всегда, чтобы листать без выбора.
  const showNextButton = selected !== null || mode === "learn" || isBrowse || hasExisting;

  return (
    <div className="px-6 py-5">
      <p className="text-sm text-foreground leading-relaxed mb-6">
        {question.question}
      </p>

      <div className="space-y-2">
        {question.options.map((option, index) => {
          let style: React.CSSProperties = {};

          if (showResult && index === question.correctIndex) {
            style = {
              borderColor: "var(--color-aurora-violet)",
              background: "var(--aurora-violet-soft)",
            };
          } else if (showResult && selected === index && index !== question.correctIndex) {
            style = {
              borderColor: "var(--color-aurora-pink)",
              background: "var(--aurora-pink-soft)",
            };
          } else if (selected === index) {
            style = {
              borderColor: "color-mix(in srgb, var(--color-aurora-violet) 50%, transparent)",
            };
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={isBrowse || (selected !== null && mode !== "learn") || hasExisting}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-card transition-all text-sm"
              style={style}
            >
              {option}
            </button>
          );
        })}
      </div>

      {mode !== "exam" && (
        // Подсказка доступна всё время работы с вопросом (до и после
        // ответа), кроме экзамена. Пользователь может вернуться к
        // пройденному вопросу и перечитать подсказку.
        <HintButton
          entityId={question.id}
          entityType="accreditation_question"
          context={question.question}
          topic={specialtyId ? `${specialtyId}:${question.id}` : question.id}
          specialty={question.specialty}
        />
      )}

      {showResult && question.explanation && selected !== null && (
        <div className="mt-4 px-4 py-3 bg-surface rounded-xl animate-result">
          <p className="text-xs text-muted leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Auto-explain для подписчиков после ЛЮБОГО ответа (не только
          ошибочного). В exam-режиме не раскрываем правильный вариант
          до конца экзамена. В browse — показываем сразу, без ожидания
          ответа: режим и есть просмотр с полным разбором. */}
      {mode !== "exam" && (showResult || isBrowse) && (selected !== null || isBrowse) && (
        <AutoExplain
          entityId={question.id}
          entityType="accreditation_question"
          trigger={true}
          context={question.question}
          topic={specialtyId ? `${specialtyId}:${question.id}` : question.id}
          specialty={question.specialty}
        />
      )}

      {/* В режиме просмотра кнопок навигации нет — ожидается, что родитель
          рендерит все вопросы в виде ленты, а пользователь листает скроллом. */}
      {!isBrowse && (
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className="btn-press shrink-0 w-14 h-14 rounded-2xl bg-surface border border-border text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-default hover:bg-card transition-colors"
            aria-label="Предыдущий вопрос"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          {showNextButton && (
            <button
              onClick={handleNext}
              className="btn-press btn-premium-dark flex-1 h-14 rounded-2xl text-xs uppercase tracking-[0.2em] font-semibold"
            >
              Следующий вопрос
            </button>
          )}
        </div>
      )}
    </div>
  );
}
