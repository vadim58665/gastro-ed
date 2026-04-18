# Aurora Redesign - Phase 11 Implementation Plan (Final Polish)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Финальная зачистка - последние ~32 semantic-color refs в 15 файлах (components/ui + auth + cards + profile + feed + analytics + modes/exam). Обновление MEMORY.md об окончании aurora-ребрендинга.

**Architecture:** один batch-refactor проход по 15 файлам + memory update.

**Ветка:** `feat/aurora-phase-11`.

---

## Правила

- CSS vars через inline style. Нет em-dash. Русский UI. `"use client"`.

### Replacements (финальный словарь)

| Old | Inline style |
|---|---|
| `text-success`, `text-emerald-*` | `color: "var(--color-aurora-indigo)"` |
| `text-danger`, `text-rose-*` | `color: "var(--color-aurora-pink)"` |
| `text-warning`, `text-amber-*` | `color: "var(--color-aurora-violet)"` |
| `bg-success` solid / `bg-success/*` soft | `var(--color-aurora-indigo)` / `var(--aurora-indigo-soft)` |
| `bg-danger` solid / `bg-danger/*` soft | `var(--color-aurora-pink)` / `var(--aurora-pink-soft)` |
| `bg-warning` / `bg-warning/*` | `var(--color-aurora-violet)` / `var(--aurora-violet-soft)` |

Сохранить: `text-muted`, `text-primary`, `text-foreground`, `bg-primary/*`, `bg-surface`, `bg-card`.

Исключение: `src/app/globals.css` - ОСТАВЛЯЕМ `--color-success/danger/warning` definitions (источник для всей семантики; они theme-overridden в Mocha/Graphite).

---

## Task 1: Batch refactor 15 файлов

Применить словарь по файлам (ref counts from grep):

- `src/app/modes/exam/ExamInner.tsx` (1)
- `src/app/auth/login/page.tsx` (2)
- `src/components/ui/FatigueBanner.tsx` (2)
- `src/components/ui/ProgressRing.tsx` (1)
- `src/components/ui/AchievementUnlock.tsx` (2)
- `src/components/ui/MnemonicHint.tsx` (1)
- `src/components/ui/KeyFactBanner.tsx` (1)
- `src/components/ui/LevelBadge.tsx` (3)
- `src/components/auth/NicknameField.tsx` (1)
- `src/components/cards/BlitzTest.tsx` (1)
- `src/components/profile/AuthSection.tsx` (1)
- `src/components/profile/ErrorAnalytics.tsx` (10 - самый большой)
- `src/components/feed/CardFeed.tsx` (1)
- `src/components/analytics/ExamCountdown.tsx` (1)
- `src/components/analytics/ExamReadiness.tsx` (4)

Для каждого файла: найти occurrences, преобразовать по словарю (tailwind class → inline style). Если ref в configuration-object (как ErrorClassification в Phase 10), объект с CSS var strings + consumer применяет inline.

Если ref в `className` нахождения типа:
```tsx
<p className={`... ${flag ? "text-success" : "text-danger"}`}>
```
Конвертировать:
```tsx
<p
  className="..."
  style={{ color: flag ? "var(--color-aurora-indigo)" : "var(--color-aurora-pink)" }}
>
```

### Verification + Commit

`npm test -- --run` → 475 passed. Если тесты ожидают specific classes - обновить минимально.
`npm run build` → success.

```
git add src/app/modes/exam/ExamInner.tsx src/app/auth/login/page.tsx src/components/ui/FatigueBanner.tsx src/components/ui/ProgressRing.tsx src/components/ui/AchievementUnlock.tsx src/components/ui/MnemonicHint.tsx src/components/ui/KeyFactBanner.tsx src/components/ui/LevelBadge.tsx src/components/auth/NicknameField.tsx src/components/cards/BlitzTest.tsx src/components/profile/AuthSection.tsx src/components/profile/ErrorAnalytics.tsx src/components/feed/CardFeed.tsx src/components/analytics/ExamCountdown.tsx src/components/analytics/ExamReadiness.tsx

git commit -m "$(cat <<'EOF'
refactor(polish): финальная зачистка semantic colors - 15 файлов

Последние ~32 occurrences text-success/danger/warning/rose-500/emerald/amber
и bg-success/danger/warning переведены на aurora CSS vars inline.
Покрывает: FatigueBanner, ProgressRing, AchievementUnlock, MnemonicHint,
KeyFactBanner, LevelBadge, NicknameField, BlitzTest, AuthSection,
ErrorAnalytics (10 refs), CardFeed, ExamCountdown, ExamReadiness,
ExamInner, /auth/login. Все через var(--color-aurora-*) /
var(--aurora-*-soft/border) - theme-adaptive под default/mocha/graphite.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Memory/docs update

Обновить `~/.claude/projects/-Users-vadim-Desktop---------gastro-ed/memory/MEMORY.md` - добавить note:

> - [Aurora rebrand complete](feedback_design_approved_aurora_palette.md) — PR цепочка #7-17 (Phases 1-11, 2026-04-18). Все страницы в aurora-only, 3 темы (default/mocha/graphite), bordeaux удалён.

Создать `~/.claude/projects/-Users-vadim-Desktop---------gastro-ed/memory/milestone_aurora_rebrand_complete.md`:

```
---
name: Aurora rebrand complete (Phases 1-11)
description: Multi-phase aurora-палитра ребрендинг закончен 2026-04-18
type: milestone
---

## Summary

Задача: перевести УмныйВрач на единую aurora-палитру (indigo/violet/pink + ink) во всех страницах и трёх темах (default/mocha/graphite). Удалить bordeaux-тему, emerald/amber/rose семантические акценты с premium-страниц.

## PR chain

1. #7 Phase 1 - Foundation + Shell + /profile
2. #8 Phase 2 - /topics
3. #9 Phase 3 - /feed + 11 card-типов
4. #10 Phase 4 - Theme foundation + /daily-case (флагман premium-dark)
5. #11 Phase 5 - /morning-blitz
6. #12 Phase 6 - /welcome + /subscription (убраны emerald/amber из tier palette)
7. #13 Phase 7 - /achievements + /review (/mistakes deferred)
8. #14 Phase 8 - /tests + PrepProfile
9. #15 Phase 9 - /cases, /stations, /modes + accreditation/tests sub-components
10. #16 Phase 10 - MedMind UI (10 components) + /consilium + /profile/setup
11. #17 Phase 11 - Polish: 15 files, ~32 refs, memory update

## Deferred

- /mistakes page - ждёт merge of useSpecialty integration from parallel work. После того как та работа приземлится, применить aurora-словарь (13 refs).

## Result

- 475 тестов зелёных
- Build successful
- 3 темы: default (indigo/violet/pink), mocha (coffee/caramel/cream), graphite (silver/grey/light) - все адаптируются через CSS vars
- Все новые компоненты используют var(--color-aurora-*) / var(--aurora-*-soft/border) - НЕ hardcoded hex
```

---

## Task 3: Push + финальный PR

```bash
git push -u origin feat/aurora-phase-11
gh pr create --base feat/aurora-phase-10 --title "feat(polish): Aurora Phase 11 - финальная полировка + memory update"
```
