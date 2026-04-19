import type { Card } from "@/types/card";
import type { TestQuestion } from "@/types/accreditation";

/**
 * Serializes a card to a multi-line human-readable text block so the MedMind
 * assistant sees the FULL content of what the user is looking at — not just
 * the question stem. Handles all 11 card types with their specific fields
 * (dose_calc params/formula/unit, fill_blank textBefore/textAfter, red_flags
 * options, match_pairs pairs, etc).
 *
 * Used by CompanionOverlay when building chat prompts ("Дай подсказку: …").
 */
export function serializeCardForAssistant(card: Card): string {
  const head = [
    `Тип карточки: ${card.type}`,
    `Специальность: ${card.specialty}`,
    `Тема: ${card.topic}`,
  ].join("\n");

  switch (card.type) {
    case "clinical_case": {
      const opts = card.options
        .map(
          (o, i) =>
            `  ${i + 1}. ${o.text}${o.isCorrect ? " [правильный]" : ""}`
        )
        .join("\n");
      return [
        head,
        `Клиническая ситуация: ${card.scenario}`,
        `Вопрос: ${card.question}`,
        `Варианты:\n${opts}`,
      ].join("\n");
    }

    case "myth_or_fact":
      return [
        head,
        `Утверждение: ${card.statement}`,
        `Это ${card.isMyth ? "МИФ" : "ФАКТ"}`,
        `Объяснение: ${card.explanation}`,
      ].join("\n");

    case "build_scheme": {
      const comps = card.components
        .map(
          (c, i) =>
            `  ${i + 1}. ${c.text}${c.isCorrect ? " [нужен]" : " [лишний]"}`
        )
        .join("\n");
      return [
        head,
        `Заголовок: ${card.title}`,
        `Задача: ${card.instruction}`,
        `Компоненты:\n${comps}`,
      ].join("\n");
    }

    case "visual_quiz": {
      const opts = card.options
        .map(
          (o, i) =>
            `  ${i + 1}. ${o.text}${o.isCorrect ? " [правильный]" : ""}`
        )
        .join("\n");
      return [
        head,
        `Тип задачи: визуальный квиз (с изображением)`,
        `Вопрос: ${card.question}`,
        `Варианты:\n${opts}`,
        `Объяснение: ${card.explanation}`,
      ].join("\n");
    }

    case "blitz_test": {
      const qs = card.questions
        .map(
          (q, i) =>
            `  ${i + 1}. ${q.question} — ${q.correctAnswer ? "Да" : "Нет"}. ${q.explanation}`
        )
        .join("\n");
      return [
        head,
        `Заголовок: ${card.title}`,
        `Вопросы блица:\n${qs}`,
      ].join("\n");
    }

    case "fill_blank":
      return [
        head,
        `Заполни пропуск: ${card.textBefore}[___]${card.textAfter}`,
        `Правильный ответ: ${card.correctAnswer}`,
        card.hint ? `Подсказка к карточке: ${card.hint}` : "",
        `Объяснение: ${card.explanation}`,
      ]
        .filter(Boolean)
        .join("\n");

    case "red_flags": {
      const opts = card.options
        .map(
          (o, i) =>
            `  ${i + 1}. ${o.text}${o.isDanger ? " [КРАСНЫЙ ФЛАГ]" : ""}`
        )
        .join("\n");
      return [
        head,
        `Клиническая ситуация: ${card.scenario}`,
        `Выбери красные флаги:\n${opts}`,
        `Объяснение: ${card.explanation}`,
      ].join("\n");
    }

    case "match_pairs": {
      const pairs = card.pairs
        .map(
          (p, i) =>
            `  ${i + 1}. ${p.left} ↔ ${p.right} — ${p.explanation}`
        )
        .join("\n");
      return [
        head,
        `Заголовок: ${card.title}`,
        `Задача: ${card.instruction}`,
        `Правильные пары:\n${pairs}`,
      ].join("\n");
    }

    case "priority_rank": {
      const items = card.items
        .map((it, i) => `  ${i + 1}. ${it.text}`)
        .join("\n");
      const correct = card.correctOrder
        .map(
          (idx, order) => `  ${order + 1}) ${card.items[idx]?.text ?? "?"}`
        )
        .join("\n");
      return [
        head,
        `Контекст: ${card.context}`,
        `Вопрос: ${card.question}`,
        `Пункты (в произвольном порядке):\n${items}`,
        `Правильный порядок:\n${correct}`,
      ].join("\n");
    }

    case "cause_chain": {
      const steps = card.steps
        .map(
          (s, i) => `  ${i + 1}. ${s.isBlank ? "[___]" : s.text}`
        )
        .join("\n");
      return [
        head,
        `Заголовок: ${card.title}`,
        `Цепочка причин:\n${steps}`,
        `Варианты для пропусков: ${card.options.join(", ")}`,
        `Объяснение: ${card.explanation}`,
      ].join("\n");
    }

    case "dose_calc": {
      const params = card.params
        .map((p) => `  - ${p.label}: ${p.value}`)
        .join("\n");
      return [
        head,
        `Клиническая ситуация: ${card.scenario}`,
        `Известные параметры:\n${params}`,
        `Вопрос: ${card.question}`,
        `Единицы измерения ответа: ${card.unit}`,
        `Формула расчёта: ${card.formula}`,
        `Правильный ответ: ${card.correctAnswer} ${card.unit}`,
        `Объяснение: ${card.explanation}`,
      ].join("\n");
    }
  }
}

/**
 * Serializes an accreditation TestQuestion with all its options — so the
 * assistant can discuss "Почему ответ №3 правильный, а №1 — нет".
 */
export function serializeQuestionForAssistant(q: TestQuestion): string {
  const opts = q.options
    .map((o, i) => `  ${i + 1}. ${o}${i === q.correctIndex ? " [правильный]" : ""}`)
    .join("\n");
  return [
    `Специальность: ${q.specialty}`,
    `Блок: ${q.blockNumber}`,
    `Вопрос: ${q.question}`,
    `Варианты:\n${opts}`,
    q.explanation ? `Объяснение: ${q.explanation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
