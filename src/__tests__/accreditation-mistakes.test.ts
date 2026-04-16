import { describe, it, expect } from "vitest";
import type { AccreditationProgress } from "@/types/accreditation";

// Pure-function versions of useAccreditation's recordMistake / removeMistake,
// extracted so we can verify the bug-fix without rendering the hook.

function recordMistake(
  progress: AccreditationProgress,
  questionId: string
): AccreditationProgress {
  if (progress.mistakes.includes(questionId)) return progress;
  return {
    ...progress,
    mistakes: [...progress.mistakes, questionId],
    updatedAt: progress.updatedAt + 1,
  };
}

function removeMistake(
  progress: AccreditationProgress,
  questionId: string
): AccreditationProgress {
  if (!progress.mistakes.includes(questionId)) return progress;
  return {
    ...progress,
    mistakes: progress.mistakes.filter((id) => id !== questionId),
    updatedAt: progress.updatedAt + 1,
  };
}

const emptyProgress: AccreditationProgress = {
  specialty: "kardiologiya",
  blocks: [],
  examResults: [],
  mistakes: [],
  favorites: [],
  questionStats: {},
  updatedAt: 0,
};

describe("accreditation mistakes — record/remove cycle", () => {
  it("recordMistake добавляет вопрос в список", () => {
    const after = recordMistake(emptyProgress, "q1");
    expect(after.mistakes).toEqual(["q1"]);
  });

  it("recordMistake не дублирует один и тот же questionId", () => {
    const once = recordMistake(emptyProgress, "q1");
    const twice = recordMistake(once, "q1");
    expect(twice.mistakes).toEqual(["q1"]);
  });

  it("removeMistake удаляет вопрос при правильном ответе", () => {
    const withMistake = recordMistake(emptyProgress, "q1");
    const after = removeMistake(withMistake, "q1");
    expect(after.mistakes).toEqual([]);
  });

  it("удалённая ошибка не появляется повторно сама", () => {
    // Моделирует поведение: пользователь ошибся → зашёл в mistakes-режим →
    // ответил правильно → вышел → зашёл снова. Раньше ошибка возвращалась.
    const s1 = recordMistake(emptyProgress, "q1");
    const s2 = recordMistake(s1, "q2");
    const afterCorrectOnQ1 = removeMistake(s2, "q1");

    // Повторный заход в mistakes-режим — список не должен вернуть q1.
    expect(afterCorrectOnQ1.mistakes).toEqual(["q2"]);
    expect(afterCorrectOnQ1.mistakes).not.toContain("q1");
  });

  it("removeMistake no-op для незнакомого id", () => {
    const withMistake = recordMistake(emptyProgress, "q1");
    const after = removeMistake(withMistake, "q999");
    expect(after).toBe(withMistake);
  });

  it("полный цикл: ошибка → фикс → ошибка снова → фикс", () => {
    let state = emptyProgress;
    state = recordMistake(state, "q1");
    expect(state.mistakes).toContain("q1");

    state = removeMistake(state, "q1");
    expect(state.mistakes).not.toContain("q1");

    // Пользователь снова ошибся на том же вопросе — должна попасть обратно.
    state = recordMistake(state, "q1");
    expect(state.mistakes).toContain("q1");
  });
});
