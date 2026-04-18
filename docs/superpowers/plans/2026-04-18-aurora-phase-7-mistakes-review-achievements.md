# Aurora Redesign - Phase 7 Implementation Plan (/mistakes + /review + /achievements)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** убрать emerald/amber/rose semantics с retention-страниц. `/achievements` - rarity-colors на aurora. `/mistakes` и `/review` - stats counters (success/danger) на aurora, filter-list (bg-primary/10) сохраняем (primary уже aurora-indigo через var).

**Architecture:** рефактор 3 page.tsx файлов + AchievementCard primitive. Никаких новых CSS-классов - используем inline style с CSS vars. Логика (FSRS, session flow, filter state) НЕ меняется.

**Ветка:** `feat/aurora-phase-7` (уже создана, основа `feat/aurora-phase-6`).

---

## Правила

- Нет em-dash. Нет emoji. Русский UI. CSS vars everywhere. `"use client"`.

### Замены (единый словарь для Tasks 1-3)

| Было | Стало |
|------|-------|
| `text-success` | inline `style={{ color: "var(--color-aurora-indigo)" }}` |
| `text-danger` | inline `style={{ color: "var(--color-aurora-pink)" }}` |
| `text-warning` | inline `style={{ color: "var(--color-aurora-violet)" }}` |
| `bg-success/10`, `bg-success/15`, `bg-success/8` | inline `style={{ background: "var(--aurora-indigo-soft)" }}` |
| `bg-danger/10`, `bg-danger/15`, `bg-danger/8` | inline `style={{ background: "var(--aurora-pink-soft)" }}` |
| `border-success/25`, `border-success/30` | inline `style={{ borderColor: "var(--aurora-indigo-border)" }}` |
| `border-danger/25`, `border-danger/30` | inline `style={{ borderColor: "var(--aurora-pink-border)" }}` |
| `text-rose-500` | inline `style={{ color: "var(--color-aurora-pink)" }}` |
| `text-primary`, `bg-primary/10`, `border-primary/30` | **оставляем** (primary=aurora-indigo через var, theme-adaptive) |

Если в одном className одновременно color + bg + border - комбинируем в один `style={{ color, background, borderColor }}` объект.

---

## Task 1: AchievementCard rarity + /achievements refactor

**Файлы:**
- Modify: `src/components/ui/AchievementCard.tsx`
- Modify: `src/app/achievements/page.tsx`

### AchievementCard

- `rarityBorders` map:
  ```ts
  const rarityStyle: Record<string, React.CSSProperties> = {
    common: {},
    rare: { borderColor: "var(--aurora-indigo-border)" },
    epic: { borderColor: "var(--aurora-violet-border)" },
    legendary: { borderColor: "var(--aurora-pink-border)" },
  };
  ```
  Удалить `rarityBorders` строковый map.
- В контейнере `<div className="rounded-lg border p-4 transition-opacity ...">` применить `style={rarityStyle[achievement.rarity]}`. Класс `border-border` как default.
- Rarity label может получить цветной chip: `rare` - aurora-indigo, `epic` - aurora-violet, `legendary` - aurora-pink. Или оставить `text-muted` - **для простоты оставляем muted**.

### /achievements page

- Большое число `{unlockedCount}` - добавить `aurora-text tabular-nums` классы:
  ```tsx
  <p className="text-3xl font-extralight aurora-text tabular-nums">
    {unlockedCount}
    <span className="text-muted">/{achievements.length}</span>
  </p>
  ```
- «Достижений» label - добавить aurora-violet через inline style:
  ```tsx
  <p
    className="text-xs uppercase tracking-widest mt-1"
    style={{ color: "var(--color-aurora-violet)" }}
  >Достижений</p>
  ```
- Category headers `<h2>` - inline violet.

### Verification + Commit

`npm test -- --run` → 475 passed. `npm run build` → success. Commit:

```
git add src/components/ui/AchievementCard.tsx src/app/achievements/page.tsx
git commit -m "$(cat <<'EOF'
refactor(achievements): aurora rarity + main counter через CSS vars

AchievementCard.rarityBorders переведён на CSSProperties с aurora
vars (rare=indigo-border, epic=violet-border, legendary=pink-border).
/achievements главный счётчик в aurora-text, labels в aurora-violet.
Логика useGamification не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: /mistakes page refactor

**Файлы:**
- Modify: `src/app/mistakes/page.tsx`

**Важно:** файл уже имеет uncommitted working-tree изменения (от других вкладок). **DO NOT touch those dirty changes** - работай с whatever state находится в файле сейчас. После refactor - git добавь ТОЛЬКО эту страницу в коммит (если её дирти-правки уже перекрывают работу, значит committim всё вместе с подходом что это наш коммит на фазу).

Применить табличный словарь выше к 13 occurrences найденным grep-ом:
- строка 199: text-success/text-danger ternary
- 213: text-success counter
- 219: text-danger counter
- 296-297: bg-success/15 + bg-danger/15 с borders
- 420, 425, 442, 447: bg-primary/10 + text-primary - оставляем (primary уже aurora)
- 496, 501, 518, 523: аналогично - оставляем

В итоге меняем только text-success/danger и bg-success/danger inline. Оставляем text-primary/bg-primary/10.

Также: `text-rose-500` если есть - replace.

Главное число на странице (13 - количество ошибок per spec) - добавить `aurora-text`. Найти largest-number-block, применить.

### Verification + Commit

```
git add src/app/mistakes/page.tsx
git commit -m "$(cat <<'EOF'
refactor(mistakes): /mistakes - aurora через CSS vars

Stats counters (correct/wrong) переведены с text-success/danger
на var(--color-aurora-indigo/pink). Status badges - bg-aurora-soft
+ border vars. Filter-pills через primary (остаются - primary=aurora).
Логика mode-selector, specialtyFilter, topicFilter не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: /review page refactor

**Файлы:**
- Modify: `src/app/review/page.tsx`

Применить табличный словарь к 30 occurrences:
- getDifficultyLabel: text-danger → aurora-pink (но это для возврата объекта `{color: string}` который applied как className). Решение: возвращать объект с `{text, style}` или `{text, colorVar}`, в consumer применить inline.
  ```ts
  function getDifficultyLabel(difficulty: number): { text: string; color: string } | null {
    if (difficulty > 7) return { text: "высокая", color: "var(--color-aurora-pink)" };
    if (difficulty > 4) return { text: "средняя", color: "var(--color-aurora-violet)" };
    return null;
  }
  ```
  В consumer: `style={{ color: dl.color }}` вместо `className={dl.color}`.
- 214: text-danger bg-danger/10 → inline aurora-pink
- 218: text-primary bg-primary/10 → оставляем
- 259: big number text-success/text-danger ternary → inline aurora-indigo/pink
- 271, 275, 407, 411, 531, 535: text-success / text-danger counters → inline
- 291, 293: bg-danger/8 row + text-danger → inline aurora-pink-soft + pink
- text-primary в filter-rows - оставляем
- 587: text-primary - оставляем

### Verification + Commit

```
git add src/app/review/page.tsx
git commit -m "$(cat <<'EOF'
refactor(review): /review - aurora через CSS vars

Stats (mastered/problem) переведены с text-success/danger на
var(--color-aurora-indigo/pink). Difficulty badge getDifficultyLabel
возвращает CSS var strings. Problem-cards row bg-danger/8 на
var(--aurora-pink-soft). Filter-pills через primary (остаются).
Логика FSRS, useReview, session flow не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Push + PR

```bash
git push -u origin feat/aurora-phase-7
gh pr create --base feat/aurora-phase-6 --title "..." --body "..."
```

---

## Self-Review

**Spec coverage:**
- ✅ /mistakes mode-selector через aurora (primary уже adaptive) - Task 2
- ✅ /review stats aurora - Task 3
- ✅ /achievements grid + Crest-like rarity aurora - Task 1
- ❌ FSRS-buttons (again/hard/good/easy) - в /review эти кнопки не в этой странице (не найдены grep-ом). Скорее всего они внутри CardRenderer или после-ответа компонента. **Не покрываем в этой фазе.** Можно в Phase 10 при MedMind-проходе или Phase 11 polish.

**Risks:**
- В /mistakes dirty working-tree от других вкладок - убеждаемся что mergе наш commit чистый.
- getDifficultyLabel - если используется в нескольких местах, все consumers должны перейти с className на inline style.
