# Aurora Redesign - Phase 2 Implementation Plan (/topics)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** применить aurora-язык к `/topics` (главная после входа). Приветствие + Daily Case CTA наверху, режимы и специальности через aurora-примитивы из Phase 1.

**Architecture:** всё строится поверх Phase 1 (aurora токены, 9 примитивов, обновлённый Shell). Добавляем 2 новых маленьких примитива (Greeting, SpecialtyCard) и переписываем `/topics/page.tsx`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, vitest.

**Спека:** [docs/superpowers/specs/2026-04-18-aurora-redesign-design.md](../specs/2026-04-18-aurora-redesign-design.md) раздел «/topics».

**Основа:** branch `feat/aurora-phase-2` базируется на `main` после merge PR #7 (Phase 1). Если PR ещё не вмержен - базироваться на `feat/aurora-phase-1`.

---

## Правила проекта (строго)

- Нет em-dash `—`, только `-`
- Нет emoji на страницах, только SVG stroke-иконки
- Все страницы `"use client"`
- Русские UI-тексты, английский код
- Цвета: только aurora (`#6366F1`, `#A855F7`, `#EC4899`, `#1A1A2E`)
- RTL тесты: `getByLabelText` для кириллицы

---

## Prerequisites

- [ ] **Ветка**

Если PR #7 уже вмержен в main:
```bash
git checkout main
git pull
git checkout -b feat/aurora-phase-2
```

Если нет:
```bash
git checkout feat/aurora-phase-1
git checkout -b feat/aurora-phase-2
```

- [ ] **Тесты зелёные**

`npm test` → 428 passed (или больше).

---

## Task 1: Greeting компонент

**Файлы:**
- Create: `src/components/ui/Greeting.tsx`
- Test: `src/__tests__/greeting.test.tsx`

**Назначение:** блок приветствия на /topics. Kicker (дата) + большой h1 «Доброе утро, {ник}» с aurora-gradient на нике + meta-row (level pill + XP pill).

- [ ] **Step 1: Test**

```tsx
// src/__tests__/greeting.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Greeting from "@/components/ui/Greeting";

describe("Greeting", () => {
  it("рендерит никнейм", () => {
    render(<Greeting nickname="vadim58" level="Ординатор II" xp={1934} />);
    expect(screen.getByText("vadim58")).toBeInTheDocument();
  });

  it("показывает уровень и XP", () => {
    render(<Greeting nickname="vadim58" level="Ординатор II" xp={1934} />);
    expect(screen.getByText("Ординатор II")).toBeInTheDocument();
    expect(screen.getByText(/1[\s ]?934/)).toBeInTheDocument();
  });

  it("использует greeting по времени суток", () => {
    // hourOverride - test hook, чтобы не зависеть от реального времени
    render(<Greeting nickname="V" level="L" xp={0} hourOverride={8} />);
    expect(screen.getByText(/Доброе утро/i)).toBeInTheDocument();

    render(<Greeting nickname="V" level="L" xp={0} hourOverride={14} />);
    expect(screen.getByText(/Добрый день/i)).toBeInTheDocument();

    render(<Greeting nickname="V" level="L" xp={0} hourOverride={20} />);
    expect(screen.getByText(/Добрый вечер/i)).toBeInTheDocument();

    render(<Greeting nickname="V" level="L" xp={0} hourOverride={2} />);
    expect(screen.getByText(/Доброй ночи/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

```bash
npm test -- greeting
```

- [ ] **Step 3: Component**

```tsx
// src/components/ui/Greeting.tsx
"use client";

interface GreetingProps {
  nickname: string;
  level: string;
  xp: number;
  /** Тестовый override часа - для deterministic тестов. */
  hourOverride?: number;
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Доброе утро";
  if (hour >= 12 && hour < 18) return "Добрый день";
  if (hour >= 18 && hour < 23) return "Добрый вечер";
  return "Доброй ночи";
}

const formatXp = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

const formatDate = (d: Date): string => {
  const weekdays = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
  const months = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

export default function Greeting({ nickname, level, xp, hourOverride }: GreetingProps) {
  const now = new Date();
  const hour = hourOverride ?? now.getHours();
  const hello = getGreeting(hour);

  return (
    <div className="text-center px-6 pt-5 pb-4">
      <div className="text-[10px] tracking-[0.25em] uppercase text-muted font-medium">
        {formatDate(now)}
      </div>
      <div className="text-[26px] font-extralight tracking-tight text-foreground mt-1.5 leading-[1.1]">
        {hello},
        <br />
        <span
          className="font-light"
          style={{
            background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 55%, #A855F7 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {nickname}
        </span>
      </div>
      <div className="flex gap-1.5 justify-center flex-wrap mt-2.5">
        <span
          className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 rounded-full bg-white"
          style={{ border: "1px solid rgba(99,102,241,0.15)", boxShadow: "0 1px 2px rgba(17,24,39,0.04)", color: "#1A1A2E" }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}
          />
          {level}
        </span>
        <span
          className="text-[9px] tracking-[0.15em] uppercase font-medium px-2.5 py-1 rounded-full"
          style={{ background: "rgba(99,102,241,0.06)", color: "#64748b" }}
        >
          {formatXp(xp)} XP
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests** → `npm test -- greeting` → expect 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Greeting.tsx src/__tests__/greeting.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Greeting - приветствие с aurora-ником + level-pill

Kicker с датой, h1 «Доброе утро/день/вечер/ночи, {ник}» -
ник в aurora-gradient (indigo→violet). Pill уровня + pill XP
снизу. Определяет время суток по hour (с override для тестов).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SpecialtyCard компонент

**Файлы:**
- Create: `src/components/ui/SpecialtyCard.tsx`
- Test: `src/__tests__/specialtyCard.test.tsx`

**Назначение:** карточка специальности с раскрываемым списком тем внутри. Header с инициалом в aurora iconbox, title/sub, chevron. Раскрытие показывает «Все темы» (highlighted) + список обычных topic-rows с thin aurora-progress-bar.

- [ ] **Step 1: Test**

```tsx
// src/__tests__/specialtyCard.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SpecialtyCard from "@/components/ui/SpecialtyCard";

const sampleTopics = [
  { name: "ГЭРБ", total: 18, answered: 14 },
  { name: "Язвенная болезнь", total: 15, answered: 7 },
];

describe("SpecialtyCard", () => {
  it("рендерит название специальности и инициал", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
      />
    );
    expect(screen.getByText("Гастроэнтерология")).toBeInTheDocument();
    expect(screen.getByText("Г")).toBeInTheDocument();
  });

  it("показывает количество карточек и процент", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
      />
    );
    // 28/45 = 62%
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/62/)).toBeInTheDocument();
  });

  it("не рендерит темы если expanded=false", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded={false}
      />
    );
    expect(screen.queryByText("ГЭРБ")).not.toBeInTheDocument();
  });

  it("рендерит темы если expanded=true", () => {
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded
      />
    );
    expect(screen.getByText("ГЭРБ")).toBeInTheDocument();
    expect(screen.getByText("Язвенная болезнь")).toBeInTheDocument();
    expect(screen.getByText(/Все темы/i)).toBeInTheDocument();
  });

  it("вызывает onHeaderClick при клике на заголовок", () => {
    const onHeaderClick = vi.fn();
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        onHeaderClick={onHeaderClick}
      />
    );
    fireEvent.click(screen.getByText("Гастроэнтерология"));
    expect(onHeaderClick).toHaveBeenCalledOnce();
  });

  it("вызывает onTopicClick при клике на тему", () => {
    const onTopicClick = vi.fn();
    render(
      <SpecialtyCard
        name="Гастроэнтерология"
        initial="Г"
        cardCount={45}
        answeredCount={28}
        topics={sampleTopics}
        expanded
        onTopicClick={onTopicClick}
      />
    );
    fireEvent.click(screen.getByText("ГЭРБ"));
    expect(onTopicClick).toHaveBeenCalledWith("ГЭРБ");
  });
});
```

- [ ] **Step 2: Run test, expect fail**

- [ ] **Step 3: Component**

```tsx
// src/components/ui/SpecialtyCard.tsx
"use client";

export interface TopicStats {
  name: string;
  total: number;
  answered: number;
}

interface SpecialtyCardProps {
  name: string;
  initial: string;
  cardCount: number;
  answeredCount: number;
  topics?: TopicStats[];
  expanded?: boolean;
  /** Клик по header: toggle accordion или направить в ленту специальности. */
  onHeaderClick?: () => void;
  /** Клик по конкретной теме (name - имя темы). */
  onTopicClick?: (topicName: string) => void;
  /** Клик по «Все темы специальности». */
  onAllTopicsClick?: () => void;
}

export default function SpecialtyCard({
  name,
  initial,
  cardCount,
  answeredCount,
  topics,
  expanded = false,
  onHeaderClick,
  onTopicClick,
  onAllTopicsClick,
}: SpecialtyCardProps) {
  const percent = cardCount > 0 ? Math.round((answeredCount / cardCount) * 100) : 0;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.02)",
      }}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left btn-press"
      >
        <div
          className="w-[34px] h-[34px] rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-semibold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.12))",
            color: "#6366F1",
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-foreground font-normal tracking-tight truncate">
            {name}
          </div>
          <div className="text-[9px] text-muted mt-0.5 tracking-wide uppercase">
            {cardCount} карточек · {percent}%
          </div>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          style={{ color: expanded ? "#6366F1" : "#94a3b8" }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {expanded && topics && (
        <div
          className="px-3 pb-2.5 pt-1"
          style={{
            background:
              "linear-gradient(180deg, rgba(99,102,241,0.03), transparent)",
            borderTop: "1px solid rgba(99,102,241,0.06)",
          }}
        >
          {/* All topics shortcut */}
          <button
            type="button"
            onClick={onAllTopicsClick}
            className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press mb-1"
            style={{
              background:
                "linear-gradient(180deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04))",
              border: "1px solid rgba(99,102,241,0.12)",
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-foreground font-medium">
                Все темы специальности
              </div>
              <div
                className="h-[2px] bg-[rgba(99,102,241,0.08)] rounded-full mt-1 overflow-hidden"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percent}%`,
                    background: "linear-gradient(90deg, #6366F1, #A855F7)",
                  }}
                />
              </div>
              <div className="text-[8px] text-muted mt-0.5 tracking-wide">
                {answeredCount} / {cardCount}
              </div>
            </div>
            <span
              className="text-[14px] font-extralight min-w-[28px] text-right tracking-tight"
              style={{
                background: "linear-gradient(135deg, #1A1A2E, #6366F1)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {cardCount}
            </span>
          </button>

          {topics.map((topic) => {
            const topicPct = topic.total > 0 ? (topic.answered / topic.total) * 100 : 0;
            return (
              <button
                key={topic.name}
                type="button"
                onClick={() => onTopicClick?.(topic.name)}
                className="w-full text-left flex justify-between items-center gap-2.5 px-2.5 py-2 rounded-lg btn-press hover:bg-[rgba(99,102,241,0.04)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-foreground font-normal">{topic.name}</div>
                  <div className="h-[2px] bg-[rgba(99,102,241,0.08)] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${topicPct}%`,
                        background: "linear-gradient(90deg, #6366F1, #A855F7)",
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-muted mt-0.5 tracking-wide">
                    {topic.answered} / {topic.total}
                  </div>
                </div>
                <span className="text-[14px] font-extralight text-foreground min-w-[28px] text-right tracking-tight">
                  {topic.total}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Tests** → `npm test -- specialtyCard` → expect 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/SpecialtyCard.tsx src/__tests__/specialtyCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): SpecialtyCard - карточка специальности с accordion

Header с aurora-iconbox (инициал в indigo), title, count+%,
rotating chevron. При expanded рендерит «Все темы специальности»
(highlighted aurora-bordered) + список topic-rows с thin
aurora-gradient progress-bar и aurora числом.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Рефактор /topics/page.tsx

**Файлы:**
- Modify: `src/app/topics/page.tsx`
- Test: `src/__tests__/topicsPage.test.tsx` (создать)

**Назначение:** собрать /topics из новой композиции: Greeting + DailyCaseCTA + секция режимов через ToolRow + секция специальностей через SpecialtyCard.

### Важные моменты для subagent-а

- Существующий файл (406 строк) имеет логику `returnToProfile` mode - **сохранить**. Если `returnToProfile=true`: показываем только список специальностей (без greeting/daily/modes).
- Использовать `useProfilePageData` для XP/level (`progress.xp`) - те же правила level-calculation что в FeedProfile (`progress.xp >= 3000 ? "Врач" : progress.xp >= 500 ? "Ординатор II" : "Студент"`).
- Перенести SVG-иконки режимов в константы (как в FeedProfile).
- `router.push("/daily-case")` для DailyCaseCTA onStart.

### Структура нового рендера

```tsx
<div className="h-screen flex flex-col">
  <TopBar premium={!returnToProfile} />
  <main className="flex-1 pt-28 pb-20 overflow-y-auto">
    {returnToProfile ? (
      <ReturnToProfileView />  {/* тот же minimal режим из старого кода */}
    ) : (
      <>
        <Greeting nickname={...} level={...} xp={progress.xp ?? 0} />

        <div className="px-6 mb-4">
          <DailyCaseCTA
            caseDate={todayFmt}
            caseId={todayCaseId || "sample"}
            maxPoints={5000}
            currentPoints={0}
            active
            onStart={() => router.push("/daily-case")}
          />
        </div>

        <SectionHead title="Быстрые режимы" />
        <div className="px-6 flex flex-col gap-1.5 mb-5">
          <ToolRow accent="indigo" icon={BOLT_SVG} title="Утренний блиц" sub="5 случайных вопросов" chip={{label:"5", variant:"indigo"}} onClick={() => router.push("/morning-blitz")} />
          {modeCounts.myth > 0 && <ToolRow accent="indigo-violet" icon={QUESTION_SVG} title="Правда или миф" sub="Короткие утверждения" chip={{label: modeCounts.myth, variant:"indigo"}} onClick={() => handleModeClick("myth")} />}
          {modeCounts.redFlags > 0 && <ToolRow accent="violet-pink" icon={FLAG_SVG} title="Красные флаги" sub="Распознай опасные симптомы" chip={{label: modeCounts.redFlags, variant:"violet"}} onClick={() => handleModeClick("red_flags")} />}
          {modeCounts.dose > 0 && <ToolRow accent="violet-pink" icon={DOSE_SVG} title="Дозировки" sub="Расчёты препаратов в уме" chip={{label: modeCounts.dose, variant:"violet"}} onClick={() => handleModeClick("dose")} />}
          {weakTopicsCount > 0 && <ToolRow accent="pink-violet" icon={WEAK_SVG} title="Слабые места" sub="Темы, где чаще ошибаешься" chip={{label: weakTopicsCount, variant:"pink"}} onClick={() => handleModeClick("weak")} />}
          <ToolRow accent="indigo" icon={ALL_SVG} title="Общее" sub="Все карточки вперемешку" chip={{label: totalCards, variant:"indigo"}} onClick={handleAllClick} />
        </div>

        <SectionHead title="Специальности" sub={`${availableSpecialties.length} доступно`} />
        <div className="px-6 flex flex-col gap-1.5 pb-5">
          {availableSpecialties.map(spec => (
            <SpecialtyCard
              key={spec.id}
              name={spec.name}
              initial={spec.name[0]?.toUpperCase() ?? ""}
              cardCount={getCardCount(spec.name)}
              answeredCount={/* считать по answeredIds */}
              topics={topicsBySpecialty.get(spec.id) || []}
              expanded={expandedId === spec.id}
              onHeaderClick={() => {
                if (returnToProfile) handleSpecialtyClick(spec.id);
                else toggleAccordion(spec.id);
              }}
              onAllTopicsClick={() => handleSpecialtyClick(spec.id)}
              onTopicClick={(topicName) => handleTopicClick(spec.id, topicName)}
            />
          ))}
        </div>
      </>
    )}
  </main>
  <BottomNav />
</div>
```

- [ ] **Step 1: Read existing `src/app/topics/page.tsx`** - full understanding.

- [ ] **Step 2: Create integration test `src/__tests__/topicsPage.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mocks
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    progress: { xp: 1934, streakCurrent: 1, streakBest: 4, cardsSeen: 154, cardsCorrect: 62, recentAnswers: [] },
  }),
}));

vi.mock("@/hooks/useReview", () => ({
  useReview: () => ({ reviewCards: [] }),
}));

vi.mock("@/contexts/SpecialtyContext", () => ({
  useSpecialty: () => ({ setActiveSpecialty: vi.fn(), clearSpecialty: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "v@example.com" },
    profile: { nickname: "vadim58" },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import TopicsPage from "@/app/topics/page";

describe("TopicsPage", () => {
  it("рендерит приветствие с ником", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/vadim58/)).toBeInTheDocument();
  });

  it("рендерит Daily Case CTA", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Диагноз дня/i)).toBeInTheDocument();
  });

  it("рендерит секцию «Быстрые режимы»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Быстрые режимы/i)).toBeInTheDocument();
  });

  it("рендерит «Утренний блиц»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Утренний блиц/i)).toBeInTheDocument();
  });

  it("рендерит секцию «Специальности»", () => {
    render(<TopicsPage />);
    expect(screen.getByText(/Специальности/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Rewrite `src/app/topics/page.tsx`** - реализация выше, адаптировать под реальный API хуков (проверять `useProgress`, `useReview`, `useSpecialty`, `useAuth`). Если `profile.nickname` недоступно - fallback `user?.email?.split("@")[0]`.

Helper: `SectionHead` - инлайн в файле:
```tsx
function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-6 pb-2.5 flex justify-between items-baseline">
      <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">{title}</span>
      {sub && <span className="text-[9px] text-muted">{sub}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests** - `npm test -- topicsPage` → expect 5 passed; `npm test` → общее количество +5 новых.

- [ ] **Step 5: Build** - `npm run build` → successful.

- [ ] **Step 6: Commit**

```bash
git add src/app/topics/page.tsx src/__tests__/topicsPage.test.tsx
git commit -m "$(cat <<'EOF'
refactor(topics): /topics - полный aurora-ребрендинг

Новая композиция: Greeting (дата + aurora-ник + уровень/XP),
DailyCaseCTA наверху, режимы через ToolRow с aurora-accent
(indigo/indigo-violet/violet-pink/pink-violet), специальности
через SpecialtyCard с thin aurora-progress в темах.
Режим returnToProfile сохранён.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Финальная верификация + PR

- [ ] **Step 1: Все тесты** - `npm test` → все зелёные.

- [ ] **Step 2: Билд** - `npm run build` → successful, без TS-ошибок.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/aurora-phase-2
```

- [ ] **Step 4: PR**

```bash
gh pr create --title "feat(topics): Aurora redesign Phase 2 - /topics" --body "$(cat <<'EOF'
## Summary
- Полный aurora-ребрендинг `/topics`: приветствие + Daily Case + режимы + специальности
- 2 новых примитива в `src/components/ui/`: Greeting (aurora-приветствие с ником), SpecialtyCard (карточка специальности с accordion тем)
- Переиспользует из Phase 1: DailyCaseCTA, ToolRow, обновлённый TopBar (premium) и BottomNav (aurora pill)
- Режим returnToProfile сохранён (без изменений логики)

## Test plan
- [x] `npm test` - все тесты зелёные (+ тесты для 2 новых примитивов + интеграционный TopicsPage)
- [x] `npm run build` - successful
- [ ] Визуальная проверка `/topics` - приветствие, Daily CTA, 6 режимов, специальности раскрываются
- [ ] `returnToProfile` режим работает (из `/profile` → «изменить специальность»)

## Дальше (Phase 3+)
- /feed, /daily-case, /welcome, /subscription, /consilium

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- ✅ Greeting (Task 1)
- ✅ SpecialtyCard (Task 2)
- ✅ /topics рефактор с Greeting + DailyCaseCTA + ToolRow + SpecialtyCard (Task 3)
- ✅ Итоговая верификация (Task 4)

**Placeholder scan:** нет TBD/TODO.

**Type consistency:**
- `TopicStats` экспортируется из SpecialtyCard
- Props Greeting / SpecialtyCard / TopicsPage все описаны

**Что НЕ покрыто (осознанно):**
- Поиск/фильтр тем - не в scope Phase 2 (можно в Phase 2.5)
- Аккредитация mode (PrepProfile-side) - отдельная фаза
