# Aurora Redesign - Phase 3 Implementation Plan (/feed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** применить aurora-язык к `/feed`. Aurora-hairline на активной карточке, aurora violet-glow на correct / aurora pink на wrong, aurora-indigo/pink для панелей объяснения, полупрозрачный TopBar.

**Architecture:** 2 новых примитива (AnswerOption, ExplanationPanel) + aurora CSS-классы + обновление 11 типов карточек и FeedCard wrapper. Логика ответов не трогается.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, vitest.

**Ветка:** `feat/aurora-phase-3` (уже создана, основа Phase 2).

---

## Правила проекта (строго)

- Нет em-dash `—`, только `-`
- Нет emoji на страницах, только SVG stroke-иконки
- Все страницы `"use client"`
- Русские UI-тексты, английский код
- Цвета: только aurora (`#6366F1`, `#A855F7`, `#EC4899`, `#1A1A2E`)

---

## Task 1: Aurora feed CSS классы в globals.css

**Файлы:**
- Modify: `src/app/globals.css` (добавить aurora-опции-states и aurora-explanation блоки)

**Назначение:** добавить utility-классы для aurora-answer buttons и explanation panels, чтобы их можно было применять декларативно в 11 card-компонентах.

- [ ] **Step 1: Добавить в конец `globals.css` (после существующих aurora utilities, ДО html[data-theme="mocha"]):**

```css
/* ===========================================================
   Aurora feed utilities (Phase 3, 2026-04-18)
   =========================================================== */

/* Answer options (pill buttons) */
.aurora-opt {
  position: relative;
  width: 100%;
  text-align: left;
  padding: 11px 18px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  background: #fff;
  border: 1.5px solid rgba(99, 102, 241, 0.18);
  color: #1A1A2E;
  transition: all 0.15s ease;
}
.aurora-opt:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.04);
  border-color: rgba(99, 102, 241, 0.3);
}

.aurora-opt-correct {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(99, 102, 241, 0.1));
  border: 1.5px solid #A855F7;
  color: #6b21a8;
  font-weight: 600;
  box-shadow:
    0 0 0 3px rgba(168, 85, 247, 0.12),
    0 6px 18px -6px rgba(168, 85, 247, 0.35);
}

.aurora-opt-wrong {
  background: rgba(236, 72, 153, 0.08);
  border: 1.5px solid #EC4899;
  color: #9f1239;
  font-weight: 600;
}

.aurora-opt-dim { opacity: 0.4; }

/* Explanation panels */
.aurora-explanation {
  position: relative;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 13px;
  line-height: 1.55;
  color: #1A1A2E;
}
.aurora-explanation-correct {
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.06), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.2);
}
.aurora-explanation-wrong {
  background: linear-gradient(180deg, rgba(236, 72, 153, 0.06), rgba(168, 85, 247, 0.04));
  border: 1px solid rgba(236, 72, 153, 0.2);
}
.aurora-explanation-head {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 6px;
}
.aurora-explanation-correct .aurora-explanation-head { color: #6366F1; }
.aurora-explanation-wrong .aurora-explanation-head { color: #EC4899; }

/* Scenario panel (question context box) */
.aurora-scenario {
  background: linear-gradient(180deg, #ffffff 0%, rgba(99, 102, 241, 0.04) 100%);
  border: 1px solid rgba(99, 102, 241, 0.08);
  border-radius: 12px;
  padding: 14px;
  font-size: 14px;
  line-height: 1.55;
  color: #1A1A2E;
}

/* Card type label (top of each card) */
.aurora-card-type {
  font-size: 11px;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #6366F1;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.aurora-card-type::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #A855F7;
}
```

- [ ] **Step 2:** Запустить `npm test` - все 445 тестов должны остаться зелёными (CSS не влияет на тесты).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): aurora-классы для /feed - opt-states + explanation + scenario

Добавляет утилитарные классы для aurora-редизайна ленты:
.aurora-opt (+ correct/wrong/dim), .aurora-explanation (+ correct/wrong/head),
.aurora-scenario, .aurora-card-type. Используется в 11 card-типах
и FeedCard wrapper-е.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: AnswerOption примитив

**Файлы:**
- Create: `src/components/ui/AnswerOption.tsx`
- Test: `src/__tests__/answerOption.test.tsx`

**Назначение:** pill-button с 4 состояниями (neutral / correct / wrong / dim). Подключается через CSS-классы из Task 1.

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AnswerOption from "@/components/ui/AnswerOption";

describe("AnswerOption", () => {
  it("рендерит текст", () => {
    render(<AnswerOption state="neutral" onClick={() => {}}>Ответ А</AnswerOption>);
    expect(screen.getByText("Ответ А")).toBeInTheDocument();
  });

  it("применяет aurora-opt-correct при state=correct", () => {
    const { container } = render(
      <AnswerOption state="correct" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-correct")).toBeTruthy();
  });

  it("применяет aurora-opt-wrong при state=wrong", () => {
    const { container } = render(
      <AnswerOption state="wrong" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-wrong")).toBeTruthy();
  });

  it("применяет aurora-opt-dim при state=dim", () => {
    const { container } = render(
      <AnswerOption state="dim" onClick={() => {}}>A</AnswerOption>
    );
    expect(container.querySelector(".aurora-opt-dim")).toBeTruthy();
  });

  it("вызывает onClick при клике", () => {
    const onClick = vi.fn();
    render(<AnswerOption state="neutral" onClick={onClick}>A</AnswerOption>);
    fireEvent.click(screen.getByText("A"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disabled при state=correct/wrong/dim", () => {
    render(<AnswerOption state="correct" onClick={() => {}}>A</AnswerOption>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- answerOption
```

- [ ] **Step 3: Component**

```tsx
"use client";

import { ReactNode } from "react";

type AnswerState = "neutral" | "correct" | "wrong" | "dim";

interface AnswerOptionProps {
  state: AnswerState;
  onClick: () => void;
  children: ReactNode;
  /** Дополнительные классы для кастомизации. */
  className?: string;
}

const stateClass: Record<AnswerState, string> = {
  neutral: "aurora-opt",
  correct: "aurora-opt aurora-opt-correct",
  wrong: "aurora-opt aurora-opt-wrong",
  dim: "aurora-opt aurora-opt-dim",
};

/**
 * Кнопка ответа в aurora-палитре. 4 состояния: neutral (до клика),
 * correct (правильный выбор - violet-glow), wrong (неверный выбор - pink),
 * dim (не выбран, не правильный - приглушён).
 */
export default function AnswerOption({
  state,
  onClick,
  children,
  className = "",
}: AnswerOptionProps) {
  const isAnswered = state !== "neutral";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isAnswered}
      className={`${stateClass[state]} btn-press ${className}`}
    >
      {children}
      {state === "correct" && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
          style={{ color: "#A855F7" }}
        >
          ✓
        </span>
      )}
      {state === "wrong" && (
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 font-bold"
          style={{ color: "#EC4899" }}
        >
          ✗
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test** → 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AnswerOption.tsx src/__tests__/answerOption.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): AnswerOption - pill-кнопка ответа в aurora-палитре

4 state-а: neutral (до ответа), correct (violet-glow + ✓),
wrong (pink + ✗), dim (приглушён). Disabled после ответа.
Используется всеми 11 типами карточек.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ExplanationPanel примитив

**Файлы:**
- Create: `src/components/ui/ExplanationPanel.tsx`
- Test: `src/__tests__/explanationPanel.test.tsx`

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

describe("ExplanationPanel", () => {
  it("рендерит заголовок «Верно!» при correct", () => {
    render(
      <ExplanationPanel correct>Text</ExplanationPanel>
    );
    expect(screen.getByText(/Верно/i)).toBeInTheDocument();
  });

  it("рендерит заголовок «Неверно» при correct=false", () => {
    render(
      <ExplanationPanel correct={false}>Text</ExplanationPanel>
    );
    expect(screen.getByText(/Неверно/i)).toBeInTheDocument();
  });

  it("рендерит кастомный заголовок", () => {
    render(
      <ExplanationPanel correct title="Отлично">Text</ExplanationPanel>
    );
    expect(screen.getByText("Отлично")).toBeInTheDocument();
  });

  it("рендерит children контент", () => {
    render(
      <ExplanationPanel correct>Это объяснение</ExplanationPanel>
    );
    expect(screen.getByText("Это объяснение")).toBeInTheDocument();
  });

  it("применяет aurora-explanation-correct при correct=true", () => {
    const { container } = render(
      <ExplanationPanel correct>Text</ExplanationPanel>
    );
    expect(container.querySelector(".aurora-explanation-correct")).toBeTruthy();
  });

  it("применяет aurora-explanation-wrong при correct=false", () => {
    const { container } = render(
      <ExplanationPanel correct={false}>Text</ExplanationPanel>
    );
    expect(container.querySelector(".aurora-explanation-wrong")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

- [ ] **Step 3: Component**

```tsx
"use client";

import { ReactNode } from "react";

interface ExplanationPanelProps {
  correct: boolean;
  /** Кастомный заголовок. По умолчанию: «Верно!» или «Неверно». */
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Панель объяснения после ответа. Aurora-indigo для правильных,
 * aurora-pink для неверных. Заголовок uppercase в том же цвете.
 */
export default function ExplanationPanel({
  correct,
  title,
  children,
  className = "",
}: ExplanationPanelProps) {
  const modifier = correct ? "aurora-explanation-correct" : "aurora-explanation-wrong";
  const defaultTitle = correct ? "Верно!" : "Неверно";

  return (
    <div className={`aurora-explanation ${modifier} animate-result ${className}`}>
      <div className="aurora-explanation-head">{title ?? defaultTitle}</div>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4: Run test** → 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ExplanationPanel.tsx src/__tests__/explanationPanel.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): ExplanationPanel - aurora-панель объяснения после ответа

Aurora-indigo для correct, aurora-pink для wrong. Заголовок
uppercase в том же цвете. Используется во всех 11 card-типах.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: FeedCard wrapper aurora-hairline + TopBar прозрачный + Feed label-row

**Файлы:**
- Modify: `src/components/feed/CardFeed.tsx` (1 строка: класс wrapper-а)
- Modify: `src/components/ui/TopBar.tsx` (добавить prop `transparent`)
- Modify: `src/app/feed/page.tsx` (label-row в aurora, TopBar transparent)

**Цель:** активная карточка получает aurora-hairline вместо `surface-raised`; TopBar на /feed становится полупрозрачным; label-row переходит на aurora классы.

### 4a. CardFeed wrapper

- [ ] **Step 1: В `src/components/feed/CardFeed.tsx` строка 216:**

Было:
```tsx
className="w-full max-w-lg mx-auto h-full rounded-3xl card-protected surface-raised overflow-y-auto"
```

Стало:
```tsx
className="w-full max-w-lg mx-auto h-full rounded-3xl card-protected aurora-hairline bg-white overflow-y-auto"
```

### 4b. TopBar transparent prop

- [ ] **Step 2: В `src/components/ui/TopBar.tsx` добавить prop:**

В интерфейсе `TopBarProps`:
```ts
/** На странице /feed - полупрозрачный фон для TikTok-вайба. */
transparent?: boolean;
```

В signature:
```tsx
export default function TopBar({
  showBack = false,
  premium = false,
  showSettings = false,
  onSettingsClick,
  transparent = false,
}: TopBarProps) {
```

В styles header-а:
```tsx
<header
  className="fixed top-0 left-0 right-0 z-50 overflow-hidden"
  style={{
    background: transparent ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.82)",
    borderBottom: "1px solid rgba(99,102,241,0.08)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  }}
>
```

### 4c. Feed page label-row + TopBar transparent

- [ ] **Step 3: В `src/app/feed/page.tsx`:**

Заменить `<TopBar />` на `<TopBar transparent />`.

Обновить label-row (строки 82-107) - заменить на aurora-стилизованный блок. Можно оставить разметку но обновить классы:

```tsx
<div className="flex-none w-full max-w-lg mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
  <div className="flex items-center gap-2 min-w-0 flex-1">
    {(topicFilter || activeSpecialty) && (
      <button
        onClick={handleExit}
        className="text-muted hover:text-foreground transition-colors -ml-1 shrink-0"
        aria-label="Выйти из специальности"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    )}
    {label && (
      <p className="text-[9px] uppercase tracking-[0.22em] text-muted font-medium truncate min-w-0">
        {label} · {cards.length}
      </p>
    )}
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <span
      className="text-[9px] font-medium tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: "rgba(99,102,241,0.08)", color: "#6366F1" }}
    >
      {rank.title}
    </span>
    <QuestionSearch cards={demoCards} />
  </div>
</div>
```

- [ ] **Step 4: Все тесты** - `npm test` - остаются зелёными (существующие feed-тесты не должны сломаться).

- [ ] **Step 5: Build** - `npm run build` - successful.

- [ ] **Step 6: Commit**

```bash
git add src/components/feed/CardFeed.tsx src/components/ui/TopBar.tsx src/app/feed/page.tsx
git commit -m "$(cat <<'EOF'
feat(feed): aurora-hairline wrapper + transparent TopBar + aurora label-row

Активная карточка в /feed получает aurora-hairline gradient-бордер
вместо surface-raised. TopBar получает prop transparent (0.6 opacity
вместо 0.82) для TikTok-вайба. Rank-chip и label-row переходят
на aurora классы.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Обновить 4 simple card-типа на AnswerOption + ExplanationPanel

**Файлы:**
- Modify: `src/components/cards/MythOrFact.tsx`
- Modify: `src/components/cards/ClinicalCase.tsx`
- Modify: `src/components/cards/RedFlags.tsx`
- Modify: `src/components/cards/FillBlank.tsx`

**Цель:** заменить inline success/danger кнопки и объяснения на AnswerOption + ExplanationPanel. Логика ответов (useState, onAnswer callback) НЕ меняется.

### Пример (ClinicalCase.tsx) - паттерн для остальных

**Было:**
```tsx
{shuffledIndices.map((i) => {
  const opt = card.options[i];
  let style = "border-border bg-card hover:bg-surface text-foreground";
  if (answered) {
    if (opt.isCorrect) style = "border-success bg-success/10 text-success";
    else if (i === selected) style = "border-danger bg-danger/10 text-danger";
    else style = "border-border bg-card opacity-40 text-foreground";
  }
  return (
    <button ... className={`... ${style}...`}>
      {opt.text}
    </button>
  );
})}
{answered && (
  <div className={`animate-result ... ${card.options[selected].isCorrect ? "bg-success/10 ..." : "bg-danger/10 ..."}`}>
    <div className="font-bold mb-1">
      {card.options[selected].isCorrect ? "Верно!" : "Неверно"}
    </div>
    {card.options[selected].explanation}
  </div>
)}
```

**Стало:**
```tsx
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";

// ...

{shuffledIndices.map((i) => {
  const opt = card.options[i];
  let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
  if (answered) {
    if (opt.isCorrect) state = "correct";
    else if (i === selected) state = "wrong";
    else state = "dim";
  }
  return (
    <AnswerOption key={i} state={state} onClick={() => handleSelect(i)}>
      {opt.text}
    </AnswerOption>
  );
})}
{answered && (
  <ExplanationPanel correct={card.options[selected].isCorrect}>
    {card.options[selected].explanation}
  </ExplanationPanel>
)}
```

Также обновить:
- Заголовок типа карточки: `<div className="text-xs font-bold text-muted uppercase tracking-widest">Клиническая задачка</div>` → `<div className="aurora-card-type">Клиническая задачка</div>`
- Scenario panel (если есть): `<div className="bg-surface rounded-2xl p-4 ...">` → `<div className="aurora-scenario">`
- Убрать inline `style = "border-border..."` строки

### MythOrFact специфика
- Два варианта ответа «Миф» / «Факт» - сделать 2 AnswerOption
- `isCorrect = (choice === "myth") === card.isMyth`

### RedFlags специфика
- Множественный выбор флагов - каждый флаг как AnswerOption со своим state

### FillBlank специфика
- Variant с input/dropdown - логика остаётся, только цвета ошибки/правильности в aurora

- [ ] **Step 1: Обновить все 4 файла по паттерну выше**

- [ ] **Step 2: Запустить тесты**

```bash
npm test
```
Ожидаемо: все тесты проходят. Если какой-то existing feed-тест сломался из-за изменений UI - починить тест под новую структуру (но сохранить тест-интенцию).

- [ ] **Step 3: Commit**

```bash
git add src/components/cards/MythOrFact.tsx src/components/cards/ClinicalCase.tsx src/components/cards/RedFlags.tsx src/components/cards/FillBlank.tsx
git commit -m "$(cat <<'EOF'
refactor(cards): 4 simple card-types - AnswerOption + ExplanationPanel

MythOrFact, ClinicalCase, RedFlags, FillBlank: inline success/danger
заменены на AnswerOption (4 state-а aurora) + ExplanationPanel
(aurora-indigo/pink). Заголовки типов - через .aurora-card-type,
scenario - через .aurora-scenario.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Обновить 4 complex card-типа

**Файлы:**
- Modify: `src/components/cards/BlitzTest.tsx`
- Modify: `src/components/cards/MatchPairs.tsx`
- Modify: `src/components/cards/PriorityRank.tsx`
- Modify: `src/components/cards/CauseChain.tsx`

**Цель:** те же принципы что в Task 5 - AnswerOption + ExplanationPanel, aurora-card-type, aurora-scenario. Логика не меняется.

### BlitzTest специфика
- Серия вопросов последовательно (n карточек внутри)
- Каждый subquestion - набор AnswerOption
- Progress bar через вопросы - **оставить как есть** (это не answer-состояние, а прогресс)

### MatchPairs
- Drag-and-drop или клик-пары
- После сопоставления - pair-rows в aurora (correct pair = aurora-opt-correct, wrong pair = aurora-opt-wrong)
- ExplanationPanel в конце

### PriorityRank / CauseChain
- Drag-to-order - каждый элемент в списке в aurora-opt (neutral), после submit - final state
- ExplanationPanel в конце

- [ ] **Step 1: Update all 4 files following the pattern**

- [ ] **Step 2: `npm test`** - зелёное.

- [ ] **Step 3: Commit**

```bash
git add src/components/cards/BlitzTest.tsx src/components/cards/MatchPairs.tsx src/components/cards/PriorityRank.tsx src/components/cards/CauseChain.tsx
git commit -m "$(cat <<'EOF'
refactor(cards): 4 complex card-types - aurora answer states

BlitzTest, MatchPairs, PriorityRank, CauseChain: inline emerald/rose
заменены на AnswerOption + ExplanationPanel в aurora-палитре.
Логика drag/step-by-step не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Обновить 3 оставшихся card-типа

**Файлы:**
- Modify: `src/components/cards/DoseCalc.tsx`
- Modify: `src/components/cards/BuildScheme.tsx`
- Modify: `src/components/cards/VisualQuiz.tsx`

### DoseCalc специфика
- Numeric input или slider
- Submit-кнопка в `.btn-premium-dark`
- Result панель - aurora-explanation (correct/wrong по численной близости)

### BuildScheme
- Палитра симптомов/препаратов - каждый как aurora-opt
- Построение схемы - drag или click-to-add

### VisualQuiz
- Изображение + варианты - AnswerOption для вариантов
- **Note:** сейчас VisualQuiz исключён из ленты (`src/app/feed/page.tsx` line 71: `base.filter((c) => c.type !== "visual_quiz")`). Всё равно обновляем визуал на случай если включат обратно.

- [ ] **Step 1: Update all 3 files**

- [ ] **Step 2: `npm test`** - зелёное.

- [ ] **Step 3: Commit**

```bash
git add src/components/cards/DoseCalc.tsx src/components/cards/BuildScheme.tsx src/components/cards/VisualQuiz.tsx
git commit -m "$(cat <<'EOF'
refactor(cards): DoseCalc/BuildScheme/VisualQuiz - aurora answer states

Последние 3 card-типа переведены на AnswerOption + ExplanationPanel.
DoseCalc submit-кнопка - btn-premium-dark. Логика (numeric,
drag-scheme, image-quiz) не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Финальная верификация + PR

- [ ] **Step 1: Все тесты**

```bash
npm test
```
Ожидаемо: все тесты проходят.

- [ ] **Step 2: Билд**

```bash
npm run build
```
Ожидаемо: successful.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/aurora-phase-3
```

- [ ] **Step 4: PR**

```bash
gh pr create --base feat/aurora-phase-2 --title "feat(feed): Aurora redesign Phase 3 - /feed" --body "$(cat <<'EOF'
## Summary
- Aurora-ребрендинг `/feed`: активная карточка с aurora-hairline, violet-glow на правильных ответах, pink на неверных, aurora-indigo/pink для объяснений
- **2 новых примитива**: `AnswerOption` (4 state-а aurora), `ExplanationPanel` (aurora-indigo/pink)
- **Aurora CSS-классы** в globals.css: `.aurora-opt*`, `.aurora-explanation*`, `.aurora-scenario`, `.aurora-card-type`
- **11 типов карточек** обновлены на новые примитивы (MythOrFact, ClinicalCase, RedFlags, FillBlank, BlitzTest, MatchPairs, PriorityRank, CauseChain, DoseCalc, BuildScheme, VisualQuiz)
- **TopBar** получает prop `transparent` (на /feed 60% opacity вместо 82%)
- **FeedCard wrapper** переходит на aurora-hairline вместо surface-raised
- **Логика ответов не изменена** - только визуал

> **Base:** этот PR базируется на `feat/aurora-phase-2`. Мержить после #7 и #8.

План: [docs/superpowers/plans/2026-04-18-aurora-phase-3-feed.md](docs/superpowers/plans/2026-04-18-aurora-phase-3-feed.md)

## Test plan
- [x] `npm test` - все тесты зелёные (+ 12 новых: 6 AnswerOption, 6 ExplanationPanel)
- [x] `npm run build` - successful
- [ ] Визуальная проверка `/feed` - правильный ответ подсвечивается violet, неверный pink
- [ ] Карточка активная - aurora-hairline бордер виден
- [ ] TopBar полупрозрачный на /feed
- [ ] Объяснение отображается в aurora-панели (не emerald)

## Дальше
- Phase 4: /daily-case (флагман)
- Phase 5: /welcome + /subscription

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Aurora CSS feed classes (Task 1)
- ✅ AnswerOption (Task 2)
- ✅ ExplanationPanel (Task 3)
- ✅ FeedCard aurora-hairline + TopBar transparent + Feed label-row (Task 4)
- ✅ 11 card-типов обновлены (Tasks 5-7)
- ✅ Final verify + PR (Task 8)

**Placeholder scan:** нет TBD/TODO.

**Type consistency:**
- AnswerState: `"neutral" | "correct" | "wrong" | "dim"` - используется единообразно
- ExplanationPanel API: `correct: boolean`, `title?: string`, `children: ReactNode`

**Что НЕ покрыто (осознанно):**
- HintButton визуальный апгрейд - можно сделать в отдельном коммите если нужно (вместо отдельной задачи)
- AutoExplain компонент - его внутренности не трогаем, только внешний стиль через существующие классы
