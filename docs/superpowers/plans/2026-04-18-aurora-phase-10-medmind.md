# Aurora Redesign - Phase 10 Implementation Plan (MedMind + /consilium + /companion + /profile/setup)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** MedMind UI + оставшиеся service-страницы. Зачистить ~23 semantic-color refs в 10 MedMind компонентах + /profile/setup error. Pages `/consilium` и `/companion` уже чистые (0 semantic violations) - делегируют в MedMind components.

**Architecture:** один рефактор-проход по 10 компонентам + 1 pages. Логика (MedMind state, streamChat, runPrebuiltWithFallback, voice, Supabase auth) НЕ меняется.

**Ветка:** `feat/aurora-phase-10`.

---

## Правила

- CSS vars everywhere. Нет em-dash. Русский UI. `"use client"`.

### Replacements

| Old | Inline style |
|---|---|
| `text-success`, `text-emerald-*` | `color: "var(--color-aurora-indigo)"` |
| `text-danger`, `text-rose-*` | `color: "var(--color-aurora-pink)"` |
| `text-warning`, `text-amber-*` | `color: "var(--color-aurora-violet)"` |
| `bg-success`, `bg-success/*`, `bg-success-light` | solid: `background: "var(--color-aurora-indigo)"`; soft: `background: "var(--aurora-indigo-soft)"` |
| `bg-danger`, `bg-danger/*`, `bg-danger-light` | solid: `var(--color-aurora-pink)`; soft: `var(--aurora-pink-soft)` |
| `bg-warning`, `bg-warning/*` | solid: `var(--color-aurora-violet)`; soft: `var(--aurora-violet-soft)` |
| `border-success/*` | `borderColor: "var(--aurora-indigo-border)"` |
| `border-danger/*` | `borderColor: "var(--aurora-pink-border)"` |
| `border-warning/*` | `borderColor: "var(--aurora-violet-border)"` |
| hex `#ef4444` | `var(--color-aurora-pink)` |
| hex `#10b981` | `var(--color-aurora-indigo)` |
| hex `#f59e0b`, `#fcd34d`, `#fef3c7` (gradient warm) | aurora-gradient: indigo-soft→violet→pink (или аналог) |

Keep `text-muted`, `text-primary`, `text-foreground`, `bg-primary/*`, `bg-surface`, `bg-card` as-is.

---

## Task 1: MedMind components batch refactor

**Файлы (10):**
- `src/components/medmind/CharacterAvatar.tsx` (3 refs: SVG red cross + amber gradient)
- `src/components/medmind/CompanionChat.tsx` (1 ref: error text)
- `src/components/medmind/CompanionOverlay.tsx` (2 refs: voice error badges)
- `src/components/medmind/ConfidenceButtons.tsx` (3 refs: confidence levels)
- `src/components/medmind/ErrorClassification.tsx` (2 refs: error-type colors)
- `src/components/medmind/MedMindSession.tsx` (3 refs: status numbers)
- `src/components/medmind/MedMindTips.tsx` (3 refs: tip error + dots)
- `src/components/medmind/SavedContentLibrary.tsx` (1 ref: hover:text-danger на delete)
- `src/components/medmind/TopicAnalysisCard.tsx` (2 refs: accuracy bars)
- `src/components/medmind/VerificationBadge.tsx` (2 refs: verified/warning states)

### Specific mappings

#### ConfidenceButtons.tsx (строки 12-14)
Объект конфигурации. Применить CSS var strings:
```ts
const CONFIDENCE_LEVELS = [
  { key: "confident", label: "Уверен",
    borderColor: "var(--aurora-indigo-border)", color: "var(--color-aurora-indigo)",
    hoverBg: "var(--aurora-indigo-soft)" },
  { key: "unsure", label: "Не уверен",
    borderColor: "var(--aurora-violet-border)", color: "var(--color-aurora-violet)",
    hoverBg: "var(--aurora-violet-soft)" },
  { key: "guessing", label: "Угадываю",
    borderColor: "var(--aurora-pink-border)", color: "var(--color-aurora-pink)",
    hoverBg: "var(--aurora-pink-soft)" },
];
```
Consumer: меняем `className={level.color}` на `style={{ borderColor: level.borderColor, color: level.color }}`. Hover можно опустить или сделать через CSS var + `onMouseEnter/Leave`, но проще - оставить hover без bg-tint если неудобно через inline.

#### CharacterAvatar.tsx (SVG cross + amber gradient)
- Строки 487-488: `fill="#ef4444"` на двух rect-элементах (медицинский крест) → `fill="var(--color-aurora-pink)"`.
- Строка 714: `background: "radial-gradient(circle at 35% 35%, #fef3c7, #fcd34d 70%, #f59e0b 100%)"` - это warm-коричневый/жёлтый gradient (возможно badge/light). Заменить на aurora-radial:
  ```
  "radial-gradient(circle at 35% 35%, var(--aurora-pink-soft), color-mix(in srgb, var(--color-aurora-violet) 70%, transparent) 70%, var(--color-aurora-violet) 100%)"
  ```

#### ErrorClassification.tsx
Объекты с `color: "text-danger" | "text-warning"`. Преобразовать в CSS var strings как для ConfidenceButtons. Consumer: inline style.

#### MedMindSession.tsx, MedMindTips.tsx, CompanionOverlay.tsx, и прочие одиночные refs
Inline-замена по словарю.

#### TopicAnalysisCard.tsx (строки 12, 14)
`? "bg-danger" : "bg-success"` для bar. Inline:
```tsx
style={{ background: accuracy < threshold ? "var(--color-aurora-pink)" : "var(--color-aurora-indigo)" }}
```
(solid colors - не soft. Можно также `color-mix(..., 80%)` для более мягкого тона при желании.)

#### MedMindTips.tsx (строка 170, 172)
`bg-success` / `bg-danger` dots → inline style solid aurora.

#### VerificationBadge.tsx
`text-success` / `text-warning` → inline style.

#### SavedContentLibrary.tsx (строка 168)
`hover:text-danger` - удаление-кнопка. Переставить hover color через CSS. Так как tailwind hover: с inline style не сочетается, используем `onMouseEnter/Leave` или добавляем небольшой CSS-класс.

Проще всего: add small CSS в globals.css (рядом с aurora utilities):
```css
.aurora-hover-pink:hover { color: var(--color-aurora-pink); }
```
И:
```tsx
className="text-[10px] uppercase tracking-widest text-muted aurora-hover-pink transition-colors"
```

### /profile/setup error (1 ref)
`text-rose-500` → inline `style={{ color: "var(--color-aurora-pink)" }}`.

### Verification + Commit (single commit)

```
git add src/components/medmind/*.tsx src/app/profile/setup/page.tsx src/app/globals.css
git commit -m "$(cat <<'EOF'
refactor(medmind): MedMind components - aurora через CSS vars

10 компонентов: CharacterAvatar (SVG медкрест + warm-gradient на aurora),
CompanionChat/Overlay (error states aurora-pink), ConfidenceButtons
(уверенность-уровни aurora-indigo/violet/pink), ErrorClassification
(error-types aurora-pink/violet), MedMindSession (status-числа
aurora-indigo/violet/pink), MedMindTips, SavedContentLibrary
(hover-delete через новый .aurora-hover-pink utility), TopicAnalysisCard
(accuracy-bars), VerificationBadge. /profile/setup: rose-500 → pink.
Логика streamChat, runPrebuiltWithFallback, voice, Supabase auth
не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Subtitle aurora-touch на /consilium + /companion

**Файлы:**
- `src/app/consilium/page.tsx` - если есть subtitle-label, aurora-violet
- `src/app/companion/page.tsx` - минималистичная, возможно ничего не надо

Scan и apply aurora-violet к `uppercase tracking-[0.2em] text-muted` subtitle-labels (если есть).

### Commit

Если правки минимальные, можно объединить с Task 1. В отдельный commit только если отдельная логика.

---

## Task 3: Push + PR

```bash
git push -u origin feat/aurora-phase-10
gh pr create --base feat/aurora-phase-9 --title "feat(medmind): Aurora Phase 10 - MedMind + consilium + companion + profile/setup"
```

---

## Self-Review

**Spec coverage (strategy Phase 10):**
- ✅ MedMind components aurora (10 файлов) - Task 1
- ✅ /profile/setup error aurora-pink - Task 1
- ✅ /consilium, /companion subtitle aurora-touch - Task 2 (если применимо)
- ⏸ /auth/login - не найдено в grep. Если есть - отдельный touch в Phase 11.

**Out of scope:**
- Внутренности CompanionChat.tsx/MedMindChat.tsx bubble-structure (если aurora-hairline нужен на bubbles - в Phase 11 polish).
- AnkiExport.tsx - был удалён по прошлому feedback. Если файл ещё есть и используется где-то - trivially fix, если не используется - удалить в Phase 11.
