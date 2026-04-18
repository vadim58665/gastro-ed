import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import React from "react";

import DailyCasePlayer from "@/components/daily/DailyCasePlayer";
import { MedMindProvider } from "@/contexts/MedMindContext";
import { loadSession, SESSION_KEY } from "@/lib/dailyCaseSession";
import { STEP_TIME_LIMIT } from "@/types/dailyCase";
import type { DailyCase } from "@/types/dailyCase";

function renderWithProvider(ui: React.ReactElement) {
  return render(<MedMindProvider>{ui}</MedMindProvider>);
}

const mockCase: DailyCase = {
  id: "test-case-001",
  specialty: "gastro",
  title: "Test case",
  difficulty: "medium",
  steps: [
    {
      type: "complaint",
      title: "Жалобы",
      description: "Step 1",
      options: [
        { text: "A", isCorrect: true, explanation: "" },
        { text: "B", isCorrect: false, explanation: "" },
      ],
    },
    {
      type: "history",
      title: "Анамнез",
      description: "Step 2",
      options: [
        { text: "C", isCorrect: true, explanation: "" },
        { text: "D", isCorrect: false, explanation: "" },
      ],
    },
  ],
  outcome: { correct: "ok", wrong: "bad" },
};

describe("DailyCasePlayer persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("saves session to localStorage on mount and on step advance", () => {
    const onComplete = vi.fn();
    renderWithProvider(
      <DailyCasePlayer
        dailyCase={mockCase}
        dateStr="2026-04-17"
        onComplete={onComplete}
      />
    );
    // Effect runs on mount → persisted immediately.
    act(() => {
      vi.advanceTimersByTime(60);
    });
    const saved = loadSession("2026-04-17", mockCase.id);
    expect(saved).not.toBeNull();
    expect(saved!.currentStep).toBe(0);
    expect(saved!.stepResults).toHaveLength(0);
    expect(typeof saved!.stepStartTime).toBe("number");
  });

  it("restores step, results and timer from initialSession (timer is absolute, not reset)", () => {
    // Simulate: the user was 7s into step 1 of 2 (second step index = 1),
    // already answered step 0 correctly, then switched tabs for 5 seconds.
    const tabGoneMs = 5_000;
    const stepElapsedMs = 7_000;
    const now = Date.now();
    const initialSession = {
      dateStr: "2026-04-17",
      caseId: mockCase.id,
      currentStep: 1,
      stepStartTime: now - stepElapsedMs - tabGoneMs,
      stepResults: [
        {
          isCorrect: true,
          selectedIndex: 0,
          timeMs: 3000,
          points: 400,
          timedOut: false,
        },
      ],
    };

    const onComplete = vi.fn();
    const { getByText } = renderWithProvider(
      <DailyCasePlayer
        dailyCase={mockCase}
        dateStr="2026-04-17"
        initialSession={initialSession}
        onComplete={onComplete}
      />
    );

    // Step 2 content is visible (description "Step 2"), not step 1.
    expect(getByText("Step 2")).toBeTruthy();

    // Timer reflects absolute elapsed time (~12s gone, ~18s left of 30s),
    // NOT 30s reset. Allow ~1s tolerance for render slop.
    act(() => {
      vi.advanceTimersByTime(60);
    });
    const remainingCeiled = Math.ceil(
      (STEP_TIME_LIMIT - stepElapsedMs - tabGoneMs) / 1000
    );
    // The timer dom renders Math.ceil(ms/1000)
    const timerEls = document.querySelectorAll(".tabular-nums");
    const timerTexts = Array.from(timerEls).map((el) => el.textContent);
    // At least one timer node should match the restored value.
    expect(timerTexts.some((t) => t === String(remainingCeiled))).toBe(true);
  });

  it("persists session each time a new answer is picked", () => {
    const onComplete = vi.fn();
    const { container } = renderWithProvider(
      <DailyCasePlayer
        dailyCase={mockCase}
        dateStr="2026-04-17"
        onComplete={onComplete}
      />
    );
    act(() => {
      vi.advanceTimersByTime(60);
    });

    // Click the correct answer on step 0.
    // Buttons now use aurora-opt-dark class and have a letter-index prefix span
    // (e.g. "A" span + option text). Find the button whose option text is "A".
    const buttons = container.querySelectorAll("button.aurora-opt-dark");
    const correctBtn = Array.from(buttons).find((b) => {
      // textContent = letter-index + option-text; option text starts after the first char
      const full = b.textContent?.trim() ?? "";
      return full.slice(1) === "A";
    }) as HTMLButtonElement | undefined;
    expect(correctBtn).toBeDefined();

    act(() => {
      fireEvent.click(correctBtn!);
      vi.advanceTimersByTime(60);
    });

    const saved = loadSession("2026-04-17", mockCase.id);
    expect(saved).not.toBeNull();
    expect(saved!.currentStep).toBe(1);
    expect(saved!.stepResults).toHaveLength(1);
    expect(saved!.stepResults[0].isCorrect).toBe(true);
  });

  it("does not restore from unrelated caseId", () => {
    const now = Date.now();
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        dateStr: "2026-04-17",
        caseId: "different-case",
        currentStep: 5,
        stepStartTime: now,
        stepResults: [],
      })
    );
    expect(loadSession("2026-04-17", mockCase.id)).toBeNull();
  });
});
