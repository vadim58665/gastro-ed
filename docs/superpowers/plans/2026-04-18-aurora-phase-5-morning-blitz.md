# Aurora Redesign - Phase 5 Implementation Plan (/morning-blitz)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** перевести `/morning-blitz` на aurora-язык. Серия из 5 быстрых вопросов утром. Переиспользуем готовые примитивы: `AnswerOption`, `ExplanationPanel`. Progress-bar и result-dots через новые aurora-classes + aurora-text на ключевых цифрах + `.btn-premium-dark` для CTA.

**Architecture:** 1 небольшая CSS-добавка (aurora-blitz-progress + aurora-blitz-dot) + рефактор `src/app/morning-blitz/page.tsx`. Логика (state, shuffle, localStorage, gamification) НЕ меняется.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, vitest.

**Ветка:** `feat/aurora-phase-5` (уже создана, основа `feat/aurora-phase-4`).

---

## Правила проекта (строго)

- Нет em-dash `—`, только `-`
- Нет emoji на страницах, только SVG stroke-иконки (есть `✓` в already-done - заменить на SVG)
- Все страницы `"use client"`
- Русские UI-тексты, английский код
- **Все цвета через CSS vars (var(--color-aurora-indigo) и др.)** - не hardcoded hex
- Respect `prefers-reduced-motion`

### CSS vars (зафиксированы в Phase 4 theme-foundation)

| Назначение | Var |
|---|---|
| Акцент 1 | `var(--color-aurora-indigo)` |
| Акцент 2 | `var(--color-aurora-violet)` |
| Акцент 3 | `var(--color-aurora-pink)` |
| Ink | `var(--color-ink)` |
| Soft bg | `var(--aurora-indigo-soft)`, `-violet-soft`, `-pink-soft` |
| 3-цветный gradient | `var(--aurora-gradient-primary)` |
| Text-clip gradient | `var(--aurora-gradient-text)` |

### Существующие примитивы (переиспользуем)

- `AnswerOption` (`@/components/ui/AnswerOption`) - 4 state (`neutral` | `correct` | `wrong` | `dim`)
- `ExplanationPanel` (`@/components/ui/ExplanationPanel`) - `correct: boolean`, children
- Utility classes: `.aurora-text`, `.btn-premium-dark`, `.aurora-hairline`, `.aurora-scenario`, `.btn-press`, `.animate-result`

---

## Task 1: Aurora blitz CSS (progress + dot)

**Файлы:**
- Modify: `src/app/globals.css` (добавить блок `Aurora morning-blitz utilities` после `Aurora daily-case utilities`)

**Назначение:** aurora-gradient для progress-сегментов и result-dots на done-экране.

- [ ] **Step 1: Добавить в `globals.css` после `.aurora-divider-dark { ... }` блока (перед `@media (prefers-reduced-motion)` и перед `html[data-theme="mocha"]`):**

```css
/* ===========================================================
   Aurora morning-blitz utilities (Phase 5, 2026-04-18)
   =========================================================== */

/* Segment of progress-bar (5 segments) */
.aurora-blitz-seg {
  flex: 1;
  height: 3px;
  border-radius: 9999px;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.aurora-blitz-seg--correct {
  background: linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet));
}
.aurora-blitz-seg--wrong {
  background: var(--color-aurora-pink);
}
.aurora-blitz-seg--current {
  background: var(--aurora-gradient-primary);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent);
}
.aurora-blitz-seg--future {
  background: var(--aurora-indigo-soft);
}

/* Result dot (on done-screen, 5 circles) */
.aurora-blitz-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition: all 0.2s ease;
}
.aurora-blitz-dot--correct {
  background: var(--aurora-gradient-primary);
  color: #ffffff;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 4px 12px -4px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent);
}
.aurora-blitz-dot--wrong {
  background: color-mix(in srgb, var(--color-aurora-pink) 14%, transparent);
  border: 1.5px solid var(--color-aurora-pink);
  color: var(--color-aurora-pink);
}

@media (prefers-reduced-motion: reduce) {
  .aurora-blitz-seg,
  .aurora-blitz-dot {
    transition: none;
  }
}
```

- [ ] **Step 2:** `npm test -- --run` - 475 passed (CSS не влияет).

- [ ] **Step 3: Commit:**

```
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): aurora morning-blitz классы - progress segments + result dots

.aurora-blitz-seg (+ correct/wrong/current/future) для 5-сегментного
прогресс-бара, .aurora-blitz-dot (+ correct/wrong) для result-кружков
на done-экране. Все цвета через CSS vars - адаптируется под темы.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Рефактор `src/app/morning-blitz/page.tsx`

**Файлы:**
- Modify: `src/app/morning-blitz/page.tsx`

**Цель:** заменить semantic success/danger/primary на aurora, переиспользовать AnswerOption + ExplanationPanel, добавить aurora-text на цифрах.

- [ ] **Step 1: Добавить импорты:**

```tsx
import AnswerOption from "@/components/ui/AnswerOption";
import ExplanationPanel from "@/components/ui/ExplanationPanel";
```

### 1a. Already-done screen

Заменить:
- `✓` emoji → SVG checkmark:
```tsx
<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4" style={{ color: "var(--color-aurora-violet)" }}>
  <polyline points="20 6 9 17 4 12" />
</svg>
```

Удалить старый `<div className="text-5xl ...">✓</div>`.

- "Блиц пройден сегодня" → сохранить `text-sm text-foreground mb-2`
- "Приходите завтра утром" → `text-xs text-muted mb-6`
- CTA "К учёбе": заменить `bg-primary text-white` на `.btn-premium-dark`:
```tsx
<button
  onClick={() => router.push("/topics")}
  className="btn-premium-dark px-6 py-2.5 rounded-xl text-sm font-medium"
>
  К учёбе
</button>
```

### 1b. Done screen (results)

- Big number "3/5": добавить `aurora-text` к классам:
```tsx
<div className="text-5xl font-extralight tracking-tight leading-none mb-2 aurora-text tabular-nums">
  {correct}/{BLITZ_COUNT}
</div>
```

- Label "правильных ответов": сохранить.

- **5 result-кружков**: заменить inline success/danger classes на `.aurora-blitz-dot--{state}`:
```tsx
<div className="flex justify-center gap-2 mb-8">
  {results.map((r, i) => (
    <div
      key={i}
      className={`aurora-blitz-dot ${r ? "aurora-blitz-dot--correct" : "aurora-blitz-dot--wrong"}`}
    >
      {i + 1}
    </div>
  ))}
</div>
```

- CTA "К учёбе" → `.btn-premium-dark` (как в 1a).

### 1c. Active question screen

- **TopBar:** оставить `<TopBar showBack />` без изменений.

- **Header-row** (Утренний блиц + N / 5): сохранить structure, убедиться что цвета muted остаются. Небольшая правка: добавить aurora-акцент на заголовке:
```tsx
<p
  className="text-xs uppercase tracking-[0.2em] font-medium"
  style={{ color: "var(--color-aurora-violet)" }}
>
  Утренний блиц
</p>
```

- **Progress bar (5 segments)**: заменить inline ternary на aurora-classes. Было:
```tsx
<div
  key={i}
  className={`flex-1 h-1 rounded-full ${
    i < current
      ? results[i] ? "bg-success" : "bg-danger"
      : i === current ? "bg-primary" : "bg-border"
  }`}
/>
```

Стало:
```tsx
<div
  key={i}
  className={`aurora-blitz-seg ${
    i < current
      ? results[i] ? "aurora-blitz-seg--correct" : "aurora-blitz-seg--wrong"
      : i === current ? "aurora-blitz-seg--current" : "aurora-blitz-seg--future"
  }`}
/>
```

Удалить `h-1` (высота теперь в CSS 3px). Flex gap-1 сохранить.

- **Scenario panel** (если `q.scenario`): добавить `.aurora-scenario`:
```tsx
{q.scenario && (
  <div className="aurora-scenario mb-4">{q.scenario}</div>
)}
```

- **Question text**: оставить как есть.

- **Options block**: заменить inline button + bg-success/bg-danger на AnswerOption:
```tsx
<div className="space-y-2 mb-6">
  {q.options.map((opt, idx) => {
    const isSelected = selected === idx;
    const showResult = selected !== null;
    let state: "neutral" | "correct" | "wrong" | "dim" = "neutral";
    if (showResult) {
      if (opt.isCorrect) state = "correct";
      else if (isSelected) state = "wrong";
      else state = "dim";
    }
    return (
      <AnswerOption key={idx} state={state} onClick={() => handleSelect(idx)}>
        {opt.text}
      </AnswerOption>
    );
  })}
</div>
```

- **Explanation + "Дальше" CTA**: заменить на ExplanationPanel + btn-premium-dark:
```tsx
{selected !== null && (
  <div className="mb-6">
    <ExplanationPanel correct={q.options[selected].isCorrect}>
      {q.options.find((o) => o.isCorrect)?.explanation}
    </ExplanationPanel>
    <button
      onClick={handleNext}
      className="btn-premium-dark w-full py-2.5 rounded-xl text-sm font-medium mt-4"
    >
      {current + 1 < BLITZ_COUNT ? "Дальше" : "Результаты"}
    </button>
  </div>
)}
```

- [ ] **Step 2:** Тесты + билд.

```bash
npm test -- --run
npm run build
```

Ожидаемо: 475 passed. Билд успешный. Существующие тесты morning-blitz (если есть) должны пройти - если сломались из-за селекторов, обновить минимально сохранив интенцию.

- [ ] **Step 3: Commit:**

```
git add src/app/morning-blitz/page.tsx
git commit -m "$(cat <<'EOF'
refactor(blitz): /morning-blitz - aurora через CSS vars + примитивы

AnswerOption (4 state-а) вместо inline success/danger. ExplanationPanel
для пояснения после ответа. .btn-premium-dark вместо bg-primary для CTA.
Progress-bar (5 сегментов) и result-dots - новые классы .aurora-blitz-*
через CSS vars. Header-заголовок «Утренний блиц» в aurora-violet.
SVG-checkmark вместо ✓ emoji на already-done экране. Big-number
3/5 - aurora-text. Логика (state, shuffle, gamification, localStorage)
не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Push + PR

- [ ] **Step 1:** `git push -u origin feat/aurora-phase-5`

- [ ] **Step 2:** PR с base `feat/aurora-phase-4`:

```bash
gh pr create --base feat/aurora-phase-4 --title "feat(blitz): Aurora redesign Phase 5 - /morning-blitz" --body "..."
```

Описание PR - что изменилось, test plan, следующая фаза.

---

## Self-Review

**Spec coverage:**
- ✅ Progress-bar в aurora-gradient - Task 1+2
- ✅ Options через AnswerOption (переиспользуется из Phase 3) - Task 2
- ✅ Explanation через ExplanationPanel - Task 2
- ✅ CTA `.btn-premium-dark` - Task 2
- ✅ Result-dots и big-number в aurora - Task 2
- ✅ No emoji (✓ заменен на SVG) - Task 2
- ✅ Все цвета через CSS vars - обе таски

**Out of scope:**
- Gamification logic (useGamification) - не трогаем
- StreakHero интеграция - не добавляем в этой фазе (есть в спеке, но не критично для /morning-blitz)
- Analytics events - не трогаем

**Placeholder scan:** нет TBD/TODO.

**Risks:**
- Existing morning-blitz тестов вроде нет в `src/__tests__/` - grep показывает только card-тесты и новые. Проверить и если есть - адаптировать.
- MorningBlitz не использует gradient-text на большом числе раньше - aurora-text на светлом фоне должен смотреться хорошо (он уже проверен на profile).
