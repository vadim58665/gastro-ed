# Aurora Redesign - Phase 9 Implementation Plan (cases/stations/modes + accreditation sub-components)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** prep-режим part 2. Почистить accreditation/tests sub-components от `text-emerald-600`, `text-rose-500`, `bg-success-light`, `bg-danger-light`, `bg-warning-light`. Добавить aurora-violet subtitle touch на page-роутах prep-режима.

**Architecture:** рефактор 6 файлов - 5 sub-components + /modes/mistakes + опциональные subtitle-правки. Логика (useExam, useTestMode, useAccreditation, session flow) НЕ меняется.

**Ветка:** `feat/aurora-phase-9`.

---

## Правила

- CSS vars everywhere. Нет em-dash. Русский UI. `"use client"`.

### Replacements

| Tailwind class | Inline style |
|---|---|
| `text-emerald-600`, `text-success` | `color: "var(--color-aurora-indigo)"` |
| `text-rose-500`, `text-danger` | `color: "var(--color-aurora-pink)"` |
| `text-warning` | `color: "var(--color-aurora-violet)"` |
| `bg-success-light`, `bg-success/*` | `background: "var(--aurora-indigo-soft)"` |
| `bg-danger-light`, `bg-danger/*` | `background: "var(--aurora-pink-soft)"` |
| `bg-warning-light` | `background: "var(--aurora-violet-soft)"` |
| `border-danger/*` | `borderColor: "var(--aurora-pink-border)"` |
| `border-success/*` | `borderColor: "var(--aurora-indigo-border)"` |

---

## Task 1: Accreditation sub-components (3 файла)

**Файлы:**
- `src/components/accreditation/ExamResult.tsx` (3 refs)
- `src/components/accreditation/ExamTimer.tsx` (1 ref)
- `src/components/accreditation/QuestionView.tsx` (проверить - grep показал 0, но зайди и удостоверься)

### ExamResult (строки 17, 32-33)

Было:
```tsx
<p className={`... ${result.passed ? "text-emerald-600" : "text-rose-500"}`}>
```
Стало:
```tsx
<p
  className="..."
  style={{ color: result.passed ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
>
```

Badge (строки 32-33):
```tsx
<span
  className="..."
  style={
    result.passed
      ? { background: "var(--aurora-indigo-soft)", color: "var(--color-aurora-indigo)" }
      : { background: "var(--aurora-pink-soft)", color: "var(--color-aurora-pink)" }
  }
>
```

### ExamTimer (строка 46)

Было:
```tsx
<span className={`text-xs font-mono font-medium tabular-nums ${isLow ? "text-rose-500" : "text-muted"}`}>
```
Стало:
```tsx
<span
  className="text-xs font-mono font-medium tabular-nums"
  style={isLow ? { color: "var(--color-aurora-pink)" } : undefined}
>
```
(text-muted применяется через className если не isLow - можно сохранить его как className по умолчанию:)
```tsx
<span
  className={`text-xs font-mono font-medium tabular-nums ${isLow ? "" : "text-muted"}`}
  style={isLow ? { color: "var(--color-aurora-pink)" } : undefined}
>
```

---

## Task 2: Tests sub-components (3 файла)

**Файлы:**
- `src/components/tests/BlockResults.tsx` (5 refs)
- `src/components/tests/ExamTimer.tsx` (2 refs)
- `src/components/tests/TestModeSelector.tsx` (проверить)

### BlockResults (строки 33, 44, 70, 76, 79)

Применить словарь. `passed ? "text-emerald-600" : "text-rose-500"` → inline; badge `bg-success-light text-success` / `bg-danger-light text-danger` → inline; problem-row `border-danger/20 bg-danger-light/60` → inline с aurora-pink-soft + pink-border.

### ExamTimer (строки 24, 26)

Три фазы (low=danger, warning, normal=muted):
```tsx
style={
  isLow ? { background: "var(--aurora-pink-soft)", color: "var(--color-aurora-pink)" }
  : isWarning ? { background: "var(--aurora-violet-soft)", color: "var(--color-aurora-violet)" }
  : undefined
}
```
(Проверь логику - в файле наверняка есть isLow/isWarning booleans.)

---

## Task 3: /modes/mistakes page + опциональный aurora-subtitle-touch

**Файлы:**
- `src/app/modes/mistakes/page.tsx` (2 refs)
- `src/app/cases/page.tsx` - опционально subtitle aurora-violet
- `src/app/stations/page.tsx` - опционально
- `src/app/modes/page.tsx` - опционально

### /modes/mistakes

Строки 101, 142: `text-danger` → inline aurora-pink.

### Subtitles (опциональные улучшения)

На `/cases`, `/stations`, `/modes` - maybe-subtitle `<p className="text-xs uppercase tracking-[0.25em] text-muted ...">` можно перекрасить в aurora-violet (как на других premium-page страницах). **Если есть время/ясное место - применяй, если нет - OK оставить muted.**

---

## Task 4: Push + PR

```bash
git push -u origin feat/aurora-phase-9
gh pr create --base feat/aurora-phase-8 --title "feat(prep-sub): Aurora Phase 9 - cases/stations/modes + accreditation/tests sub-components"
```

---

## Self-Review

**Spec coverage (Phase 9 из strategy):**
- ✅ `/cases` - clean page, просто subtitle (если применяем)
- ✅ `/stations` - clean
- ✅ `/modes/exam` - 12 строк, проверено чисто (main exam logic в ExamTimer sub-component)
- ✅ `/modes/mistakes` - 2 замены
- ✅ ExamTimer (accreditation + tests) - 3 replacements
- ✅ ExamResult - 3 replacements
- ✅ BlockResults - 5 replacements
- ✅ TestModeSelector/QuestionView - проверить, 0 предполагаемо

**Risks:**
- Sub-components могут использоваться в тестах с class-assertions - если тесты сломаются, обновлять минимально.
