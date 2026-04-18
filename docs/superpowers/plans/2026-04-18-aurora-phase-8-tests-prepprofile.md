# Aurora Redesign - Phase 8 Implementation Plan (/tests + PrepProfile)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** prep-режим part 1. `/tests` список категорий - aurora-cycle для left-accents, completion-badges aurora. `PrepProfile.tsx` (аналог FeedProfile для аккредитации) - 38 semantic-color замен на aurora vars.

**Out of scope этой фазы:**
- `/tests/[blockId]` сам по себе чистый (все colors в sub-components), его QuestionView/TestModeSelector/ExamTimer/BlockResults - попадут в Phase 9 вместе с /cases/stations/modes
- `/specialties` - просто redirect на /topics, не трогаем

**Architecture:** рефактор 2 файлов. Логика (useAccreditation, useSpecialty, useTestMode) НЕ меняется.

**Ветка:** `feat/aurora-phase-8`.

---

## Правила

- CSS vars everywhere. Нет em-dash. Русский UI. `"use client"`.

### Unified replacements (те же что Phase 7)

| Было | Стало |
|------|-------|
| `text-success` / `bg-success/*` / `border-success` | inline `var(--color-aurora-indigo)` / `--aurora-indigo-soft` / `--aurora-indigo-border` |
| `text-danger` / `bg-danger/*` / `border-danger` | inline `var(--color-aurora-pink)` / `--aurora-pink-soft` / `--aurora-pink-border` |
| `text-warning` / `bg-warning/*` | inline `var(--color-aurora-violet)` / `--aurora-violet-soft` |
| hex `#10b981` / `#f59e0b` / `#ef4444` / `#f43f5e` | соответствующие aurora vars |
| `text-primary`, `bg-primary/*` | **оставляем** (primary=aurora-indigo) |

---

## Task 1: `/tests/page.tsx` refactor

**Файлы:**
- Modify: `src/app/tests/page.tsx`

### Изменения

**1. CATEGORY_COLORS массив (строки 20-31):**

Было:
```ts
const CATEGORY_COLORS = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#3b82f6", "#14b8a6",
];
```

Стало: aurora-cycle 3 цвета, каждая категория получает один из них:
```ts
const CATEGORY_COLORS = [
  "var(--color-aurora-indigo)",
  "var(--color-aurora-violet)",
  "var(--color-aurora-pink)",
];
```

Все consumers используют `CATEGORY_COLORS[i % CATEGORY_COLORS.length]` - логика остаётся, просто цикл стал 3 вместо 9. Результат: категории раскрашены по круговой aurora-прогрессии.

**2. Completion circle badge (строки 285-293):**

Было:
```tsx
<div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
  isComplete
    ? "border-success bg-success/10 text-success"
    : pct > 0
    ? "border-primary/50 bg-primary/5 text-foreground"
    : "border-border bg-surface text-foreground"
}`}>
```

Стало: isComplete в aurora-indigo через inline style, остальные ветки оставляем:
```tsx
<div
  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-2 transition-all ${
    !isComplete && (pct > 0
      ? "border-primary/50 bg-primary/5 text-foreground"
      : "border-border bg-surface text-foreground")
  }`}
  style={isComplete ? {
    borderColor: "var(--color-aurora-indigo)",
    background: "var(--aurora-indigo-soft)",
    color: "var(--color-aurora-indigo)",
  } : undefined}
>
```

(Либо раздельная логика через ternary renderer - as long as result тот же.)

### Verification + Commit

`npm test -- --run` → 475 passed. `npm run build` → success.

```
git add src/app/tests/page.tsx
git commit -m "$(cat <<'EOF'
refactor(tests): /tests page - aurora CATEGORY_COLORS + completion badge

CATEGORY_COLORS сокращён с 9 произвольных хексов (emerald/amber/red
включительно) до 3 aurora-vars (indigo/violet/pink) с cycled индексированием.
Completion-badge для 100% пройденных блоков: inline style с
var(--color-aurora-indigo) + var(--aurora-indigo-soft) (был text-success
bg-success/10). In-progress и unstarted состояния через primary
(остаётся aurora-indigo). Логика useAccreditation не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `PrepProfile.tsx` refactor

**Файлы:**
- Modify: `src/components/profile/PrepProfile.tsx`

### Изменения

**1. level labels (строки 44-48):**

Было:
```ts
weak:        { label: "Слабый", color: "text-danger", bg: "bg-danger" },
medium:      { label: "Средний", color: "text-warning", bg: "bg-warning" },
strong:      { label: "Уверенно", color: "text-success", bg: "bg-success" },
```

Стало:
```ts
weak:   { label: "Слабый",    color: "var(--color-aurora-pink)",   bg: "var(--aurora-pink-soft)" },
medium: { label: "Средний",   color: "var(--color-aurora-violet)", bg: "var(--aurora-violet-soft)" },
strong: { label: "Уверенно",  color: "var(--color-aurora-indigo)", bg: "var(--aurora-indigo-soft)" },
```

**Consumers**: find where `color` / `bg` values of these records are used. Likely `className={labelCfg.color}`. Convert to `style={{ color: labelCfg.color }}`. Same for bg.

**2. GradientRing gradientTo (строка 210):** `gradientTo="#10b981"` → `gradientTo="var(--color-aurora-indigo)"` (а если нужен gradient, подберите подходящий aurora). Контекст - readiness accuracy gauge, completion. Aurora-indigo для «хорошо».

**3. subColor (строка 247):** `lastExamScore >= 70 ? "text-success" : "text-danger"` - convert to CSS var strings:
```tsx
subColor={lastExamScore !== null ? (lastExamScore >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)") : undefined}
```
**Consumer of subColor**: если применяется как className - поменять на inline style в том компоненте. Если уже inline - trivially works.

**4. Строка 291:**
```tsx
<span className={`text-[10px] font-semibold tabular-nums ${accPct >= 70 ? "text-success" : "text-danger"}`}>
```
→
```tsx
<span
  className="text-[10px] font-semibold tabular-nums"
  style={{ color: accPct >= 70 ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
>
```

**5. Строки 308-309:** `bg-danger/5 border-danger/15` + `text-danger`:
```tsx
<div
  className="rounded-2xl p-4 border"
  style={{
    background: "var(--aurora-pink-soft)",
    borderColor: "var(--aurora-pink-border)",
  }}
>
  <p
    className="text-[10px] uppercase tracking-[0.2em] font-medium mb-2"
    style={{ color: "var(--color-aurora-pink)" }}
  >
```

**6. Строки 361-365:** status badges success/danger (correct/wrong) - convert to inline style:
```tsx
<span
  className="text-[8px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded"
  style={{ color: "var(--color-aurora-indigo)", background: "var(--aurora-indigo-soft)" }}
>
```
Same pattern для danger/pink.

**7. Строки 370-375:** SVG stroke `className="text-success"` / `"text-danger"` → inline `style={{ color: "..." }}`.

**8. Строки 426-428:** big-number ternary color - convert to inline:
```tsx
style={{ color: val >= 70 ? "var(--color-aurora-indigo)" : val >= 40 ? "var(--color-aurora-violet)" : "var(--color-aurora-pink)" }}
```

Найти любые другие semantic-color занесения в файле и применить словарь.

### Verification + Commit

`npm test -- --run` → 475 passed. `npm run build` → success. Тесты `feedProfile.test.tsx` не затрагивают PrepProfile - должно быть зелено.

```
git add src/components/profile/PrepProfile.tsx
git commit -m "$(cat <<'EOF'
refactor(prep-profile): PrepProfile - aurora через CSS vars

Level-labels (weak/medium/strong) теперь aurora-pink/violet/indigo
через var-строки. Score big-number и accuracy badges через inline
style с aurora-vars. Problem-topics block (bg-danger/5 border-danger/15
text-danger) на aurora-pink-soft+border. Check/cross SVG status - aurora
stroke-color. GradientRing gradientTo - aurora-indigo вместо emerald.
Логика useAccreditation, useGamification, engagement не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Push + PR

```bash
git push -u origin feat/aurora-phase-8
gh pr create --base feat/aurora-phase-7 --title "..." --body "..."
```

---

## Self-Review

**Spec coverage (Phase 8):**
- ✅ `/tests` - aurora-hairline cards эквивалент через left-accent aurora cycle + aurora completion - Task 1
- ✅ `PrepProfile` - retention stats aurora - Task 2
- ⏸ `/tests/[blockId]` - page.tsx чистая, sub-components (QuestionView/TestModeSelector/ExamTimer/BlockResults) отложены до Phase 9

**Out of scope:**
- Accreditation sub-components (в следующей фазе)
- `/specialties` - просто redirect, не требует рефактора
