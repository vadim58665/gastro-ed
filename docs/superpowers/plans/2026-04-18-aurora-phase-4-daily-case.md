# Aurora Redesign - Phase 4 Implementation Plan (/daily-case)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** перевести `/daily-case` на премиум-флагман-визуал: полноэкранный premium-dark градиент, aurora-timer с pulse, aurora-progress-stages, aurora-options на тёмном, aurora-leaderboard с aurora-text для «Вы». Это делает страницу визуально отличительной от /feed и /topics - «зашёл как в отдельный премиум-режим».

**Architecture:** 3 новых примитива (`AuroraTimer`, `AuroraStages`, `DailyCaseHeader`) + новые CSS-классы для dark aurora-поверхностей + полный рефактор page.tsx / DailyCasePlayer / DailyCaseResult / DailyLeaderboard. Логика (таймеры, persistence, подсчёт очков, API-вызов leaderboard) НЕ меняется.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, vitest.

**Ветка:** `feat/aurora-phase-4` (уже создана, основа `feat/aurora-phase-3`).

---

## Правила проекта (строго)

- Нет em-dash `—`, только `-`
- Нет emoji на страницах, только SVG stroke-иконки
- Все страницы `"use client"`
- Русские UI-тексты, английский код
- **ВСЕ цвета через theme-aware CSS vars (НЕ hardcoded hex)** - в ветку подтянут theme-foundation commit `2dd06d3`, где определены переменные для default/mocha/graphite тем
- Zero autonomous motion (никаких `animation: ... infinite`). Pulse в таймере = быстрый scale при `<20%` time-left, но реализуется через CSS transition на discrete state change, не через бесконечный keyframe.
- Respect `prefers-reduced-motion`

### Aurora CSS vars (используй их во всех новых стилях)

Значения автоматически переключаются для темы default / mocha / graphite.

| Назначение | CSS var |
|---|---|
| Главный акцент (был `#6366F1`) | `var(--color-aurora-indigo)` |
| Второй акцент (был `#A855F7`) | `var(--color-aurora-violet)` |
| Третий акцент (был `#EC4899`) | `var(--color-aurora-pink)` |
| Ink-тон (был `#1A1A2E`) | `var(--color-ink)` |
| Soft-фон акцента 1 | `var(--aurora-indigo-soft)` |
| Border акцента 1 | `var(--aurora-indigo-border)` |
| Soft-фон акцента 2 | `var(--aurora-violet-soft)` |
| Border акцента 2 | `var(--aurora-violet-border)` |
| Soft-фон акцента 3 | `var(--aurora-pink-soft)` |
| Border акцента 3 | `var(--aurora-pink-border)` |
| 3-цветный градиент | `var(--aurora-gradient-primary)` |
| Text-clip градиент | `var(--aurora-gradient-text)` |
| Premium dark (CTA/tier) | `var(--aurora-gradient-premium)` |
| **Shell-фон** `/daily-case` | `var(--aurora-gradient-dark-bg)` |

**SVG `<stop stopColor={...}>`** - CSS vars работают: `stopColor="var(--color-aurora-indigo)"`.

**Inline `style={{}}`** - через CSS vars: `style={{ color: "var(--color-aurora-violet)" }}`, не хардкод `#A855F7`.

**Hex значения в сниппетах ниже** - reference для понимания, какой цвет ожидается. В коде использовать vars.

---

## Task 1: Aurora daily-case CSS классы в globals.css

**Файлы:**
- Modify: `src/app/globals.css` (добавить `daily-case-*` блок классов, ДО `html[data-theme="mocha"]`)

**Назначение:** утилитарные классы для dark-флагмана, чтобы не повторять inline-стили в компонентах.

- [ ] **Step 1: Добавить в конец `globals.css` (после aurora feed utilities, ДО `html[data-theme="mocha"]`):**

```css
/* ===========================================================
   Aurora daily-case utilities (Phase 4, 2026-04-18)
   Флагман: полноэкранный premium-dark + aurora-акценты.
   Все цвета через CSS vars для theme-adaptability.
   =========================================================== */

/* Полноэкранный premium-dark фон - оборачивает всю страницу /daily-case */
.daily-case-shell {
  min-height: 100vh;
  background-color: var(--color-ink);
  background-image:
    radial-gradient(1200px 800px at 50% -10%, color-mix(in srgb, var(--color-aurora-indigo) 22%, transparent), transparent 60%),
    radial-gradient(800px 600px at 100% 30%, color-mix(in srgb, var(--color-aurora-violet) 18%, transparent), transparent 55%),
    radial-gradient(1000px 700px at 0% 100%, color-mix(in srgb, var(--color-aurora-pink) 14%, transparent), transparent 55%),
    var(--aurora-gradient-dark-bg);
  color: #ffffff;
}

/* Aurora hairline border на тёмном фоне - ярче чем обычный aurora-hairline */
.aurora-hairline-dark {
  position: relative;
}
.aurora-hairline-dark::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.2px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-aurora-indigo) 55%, transparent) 0%,
    color-mix(in srgb, var(--color-aurora-violet) 45%, transparent) 50%,
    color-mix(in srgb, var(--color-aurora-pink) 35%, transparent) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  z-index: 1;
}

/* Translucent glass surface на тёмном */
.aurora-surface-dark {
  background: rgba(255, 255, 255, 0.06);
  border: 1.5px solid var(--aurora-indigo-border);
}

/* Опция ответа на тёмном (pill-button) */
.aurora-opt-dark {
  position: relative;
  width: 100%;
  text-align: left;
  padding: 14px 18px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.06);
  border: 1.5px solid var(--aurora-indigo-border);
  color: rgba(255, 255, 255, 0.92);
  transition: all 0.15s ease;
}
.aurora-opt-dark:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-aurora-indigo) 14%, transparent);
  border-color: color-mix(in srgb, var(--color-aurora-violet) 45%, transparent);
  transform: translateY(-1px);
}
.aurora-opt-dark:active:not(:disabled) {
  transform: scale(0.985);
}
.aurora-opt-dark-idx {
  color: var(--color-aurora-violet);
  font-weight: 600;
  margin-right: 8px;
  font-variant-numeric: tabular-nums;
}

/* Aurora progress stages - точки и линии между этапами */
.aurora-stage-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: all 0.2s ease;
}
.aurora-stage-dot--past {
  background: linear-gradient(135deg, var(--color-aurora-indigo), var(--color-aurora-violet));
}
.aurora-stage-dot--active {
  background: var(--aurora-gradient-primary);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--color-aurora-violet) 20%, transparent),
    0 0 16px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent);
}
.aurora-stage-dot--future {
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
}
.aurora-stage-line {
  flex: 1;
  height: 1.5px;
  min-width: 8px;
  border-radius: 9999px;
}
.aurora-stage-line--past {
  background: linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet));
}
.aurora-stage-line--future {
  background: rgba(255, 255, 255, 0.1);
}
.aurora-stage-label {
  font-size: 8px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
  margin-top: 6px;
  transition: color 0.2s ease;
}
.aurora-stage-label--past { color: color-mix(in srgb, var(--color-aurora-violet) 70%, transparent); }
.aurora-stage-label--active { color: var(--color-aurora-violet); }
.aurora-stage-label--future { color: rgba(255, 255, 255, 0.35); }

/* Aurora timer bar - 3 phase states (normal/warning/danger) */
.aurora-timer-track {
  position: relative;
  height: 4px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: visible;
}
.aurora-timer-fill {
  position: absolute;
  inset-block: 0;
  left: 0;
  border-radius: 9999px;
  transition: width 0.12s linear, background 0.3s ease, box-shadow 0.3s ease;
}
.aurora-timer-fill--normal {
  background: linear-gradient(90deg, var(--color-aurora-indigo), var(--color-aurora-violet));
}
.aurora-timer-fill--warning {
  background: linear-gradient(90deg, var(--color-aurora-violet), var(--color-aurora-pink));
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-aurora-violet) 50%, transparent);
}
.aurora-timer-fill--danger {
  background: linear-gradient(90deg, var(--color-aurora-pink), var(--color-aurora-violet));
  box-shadow: 0 0 16px color-mix(in srgb, var(--color-aurora-pink) 65%, transparent);
}
.aurora-timer-pulse {
  position: absolute;
  top: 50%;
  transform: translate(50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ffffff;
  transition: box-shadow 0.3s ease, background 0.3s ease;
  pointer-events: none;
}
.aurora-timer-pulse--normal {
  background: var(--color-aurora-violet);
  box-shadow: 0 0 10px color-mix(in srgb, var(--color-aurora-violet) 60%, transparent);
}
.aurora-timer-pulse--warning {
  background: var(--color-aurora-pink);
  box-shadow: 0 0 14px color-mix(in srgb, var(--color-aurora-pink) 70%, transparent);
}
.aurora-timer-pulse--danger {
  background: var(--color-aurora-pink);
  box-shadow: 0 0 18px color-mix(in srgb, var(--color-aurora-pink) 85%, transparent);
}

/* Difficulty dot (aurora-mapped: easy=indigo, medium=violet, hard=pink) */
.daily-difficulty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.daily-difficulty-dot--easy {
  background: var(--color-aurora-indigo);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-aurora-indigo) 70%, transparent);
}
.daily-difficulty-dot--medium {
  background: var(--color-aurora-violet);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-aurora-violet) 70%, transparent);
}
.daily-difficulty-dot--hard {
  background: var(--color-aurora-pink);
  box-shadow: 0 0 6px color-mix(in srgb, var(--color-aurora-pink) 70%, transparent);
}

/* Step ring (result-страница) - aurora gradient на dark */
.aurora-step-ring-track { stroke: rgba(255, 255, 255, 0.12); }
.aurora-step-ring-fill {
  stroke: url(#aurora-step-gradient);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-aurora-violet) 55%, transparent));
}
.aurora-step-ring-fill--empty { stroke: rgba(255, 255, 255, 0.2); }

/* Aurora divider на тёмном */
.aurora-divider-dark {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    color-mix(in srgb, var(--color-aurora-indigo) 35%, transparent) 30%,
    color-mix(in srgb, var(--color-aurora-violet) 40%, transparent) 50%,
    color-mix(in srgb, var(--color-aurora-pink) 30%, transparent) 70%,
    transparent 100%
  );
}

@media (prefers-reduced-motion: reduce) {
  .aurora-opt-dark,
  .aurora-stage-dot,
  .aurora-timer-fill,
  .aurora-timer-pulse {
    transition: none;
  }
}
```

- [ ] **Step 2:** Запустить `npm test` - все тесты должны остаться зелёными (CSS не влияет на тесты).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): aurora daily-case классы - premium-dark shell + timer + stages

Утилитарные классы для флагман-страницы /daily-case: .daily-case-shell
(premium-dark полноэкранный градиент), .aurora-hairline-dark
(ярче для тёмных поверхностей), .aurora-surface-dark, .aurora-opt-dark
(с hover translate-y и aurora-violet индекс), .aurora-stage-* (прогресс
этапов с glow активной точки), .aurora-timer-* (3-фазный bar
с pulse), .daily-difficulty-dot (easy/medium/hard aurora-mapped),
.aurora-step-ring-* (для SVG-rings результата), .aurora-divider-dark.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: AuroraTimer примитив

**Файлы:**
- Create: `src/components/ui/AuroraTimer.tsx`
- Test: `src/__tests__/auroraTimer.test.tsx`

**Назначение:** автономный bar+число для оставшегося времени с aurora-gradient и pulse-indicator.

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuroraTimer from "@/components/ui/AuroraTimer";

describe("AuroraTimer", () => {
  it("рендерит число оставшихся секунд", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={12000} totalMs={20000} />);
    expect(getByText("12")).toBeInTheDocument();
  });

  it("нормальная фаза при >50% времени", () => {
    const { container } = render(<AuroraTimer timeLeftMs={15000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--normal")).toBeTruthy();
    expect(container.querySelector(".aurora-timer-pulse--normal")).toBeTruthy();
  });

  it("warning фаза при 20-50%", () => {
    const { container } = render(<AuroraTimer timeLeftMs={8000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--warning")).toBeTruthy();
  });

  it("danger фаза при <20%", () => {
    const { container } = render(<AuroraTimer timeLeftMs={2000} totalMs={20000} />);
    expect(container.querySelector(".aurora-timer-fill--danger")).toBeTruthy();
    expect(container.querySelector(".aurora-timer-pulse--danger")).toBeTruthy();
  });

  it("ширина fill соответствует доле оставшегося времени", () => {
    const { container } = render(<AuroraTimer timeLeftMs={5000} totalMs={20000} />);
    const fill = container.querySelector(".aurora-timer-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  it("label таймера - caps aurora", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={10000} totalMs={20000} />);
    expect(getByText(/таймер/i)).toBeInTheDocument();
  });

  it("округляет секунды вверх (Math.ceil)", () => {
    const { getByText } = render(<AuroraTimer timeLeftMs={1500} totalMs={20000} />);
    expect(getByText("2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail** - `npm test -- auroraTimer`

- [ ] **Step 3: Component**

```tsx
"use client";

interface AuroraTimerProps {
  timeLeftMs: number;
  totalMs: number;
  className?: string;
}

/**
 * Aurora-таймер для /daily-case: 4px bar с aurora-gradient и pulse-indicator.
 * 3 фазы: normal (>50%), warning (20-50%), danger (<20%).
 * Число справа - секунды Math.ceil.
 */
export default function AuroraTimer({ timeLeftMs, totalMs, className = "" }: AuroraTimerProps) {
  const fraction = Math.max(0, Math.min(1, timeLeftMs / totalMs));
  const seconds = Math.ceil(timeLeftMs / 1000);

  const phase =
    fraction > 0.5 ? "normal" : fraction > 0.2 ? "warning" : "danger";

  const numberColor =
    phase === "normal"
      ? "text-white"
      : phase === "warning"
      ? "text-[#A855F7]"
      : "text-[#EC4899]";

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex-1 aurora-timer-track">
        <div
          className={`aurora-timer-fill aurora-timer-fill--${phase}`}
          style={{ width: `${fraction * 100}%` }}
        >
          <div className={`aurora-timer-pulse aurora-timer-pulse--${phase}`} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 font-semibold">
          таймер
        </div>
        <div className={`text-3xl font-extralight tabular-nums leading-none mt-0.5 ${numberColor}`}>
          {seconds}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test** → 7 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AuroraTimer.tsx src/__tests__/auroraTimer.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): AuroraTimer - bar + число для /daily-case в aurora-палитре

3 фазы (normal/warning/danger) по доле оставшегося времени:
indigo→violet на >50%, violet→pink на 20-50%, pink→violet с ярким
glow на <20%. Pulse-indicator (точка) на конце bar-а меняет цвет
синхронно. Число секунд - Math.ceil, tabular-nums, цвет зависит
от фазы (white/violet/pink).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: AuroraStages примитив

**Файлы:**
- Create: `src/components/ui/AuroraStages.tsx`
- Test: `src/__tests__/auroraStages.test.tsx`

**Назначение:** визуализация последовательности этапов точками+линиями с активной/пройденной/будущей раскраской.

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuroraStages from "@/components/ui/AuroraStages";

describe("AuroraStages", () => {
  const stages = ["Жалобы", "Анамнез", "Анализы", "Диагноз"];

  it("рендерит все этапы", () => {
    const { getByText } = render(<AuroraStages stages={stages} currentIndex={0} />);
    stages.forEach((s) => expect(getByText(s.toUpperCase())).toBeInTheDocument());
  });

  it("активный этап имеет class --active", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={1} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[1].classList.contains("aurora-stage-dot--active")).toBe(true);
  });

  it("пройденные этапы имеют class --past", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={2} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[0].classList.contains("aurora-stage-dot--past")).toBe(true);
    expect(dots[1].classList.contains("aurora-stage-dot--past")).toBe(true);
  });

  it("будущие этапы имеют class --future", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={1} />);
    const dots = container.querySelectorAll(".aurora-stage-dot");
    expect(dots[2].classList.contains("aurora-stage-dot--future")).toBe(true);
    expect(dots[3].classList.contains("aurora-stage-dot--future")).toBe(true);
  });

  it("линии между пройденными этапами - past", () => {
    const { container } = render(<AuroraStages stages={stages} currentIndex={2} />);
    const lines = container.querySelectorAll(".aurora-stage-line");
    expect(lines[0].classList.contains("aurora-stage-line--past")).toBe(true);
    expect(lines[1].classList.contains("aurora-stage-line--past")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect fail** - `npm test -- auroraStages`

- [ ] **Step 3: Component**

```tsx
"use client";

interface AuroraStagesProps {
  stages: string[];
  currentIndex: number;
  className?: string;
}

/**
 * Визуальная прогрессия этапов для /daily-case. Точки + линии
 * + подписи. Aurora-gradient заливки для пройденных/активного,
 * outlined для будущих.
 */
export default function AuroraStages({ stages, currentIndex, className = "" }: AuroraStagesProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center">
        {stages.map((label, i) => {
          const state: "past" | "active" | "future" =
            i < currentIndex ? "past" : i === currentIndex ? "active" : "future";
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`aurora-stage-dot aurora-stage-dot--${state}`} />
                <div className={`aurora-stage-label aurora-stage-label--${state}`}>
                  {label.toUpperCase()}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div
                  className={`aurora-stage-line aurora-stage-line--${i < currentIndex ? "past" : "future"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test** → 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AuroraStages.tsx src/__tests__/auroraStages.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): AuroraStages - прогрессия этапов для /daily-case

Последовательность точек + линий между ними + подписей. 3 состояния
(past/active/future) с aurora-gradient заливками и glow активной
точки. Будущие - outline с приглушённой подписью.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: DailyCaseHeader примитив

**Файлы:**
- Create: `src/components/daily/DailyCaseHeader.tsx`
- Test: `src/__tests__/dailyCaseHeader.test.tsx`

**Назначение:** локальный header для /daily-case (не общий TopBar, потому что фон тёмный и layout другой). Label «ДИАГНОЗ ДНЯ · дата», title, difficulty-chip.

- [ ] **Step 1: Test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DailyCaseHeader from "@/components/daily/DailyCaseHeader";

describe("DailyCaseHeader", () => {
  it("рендерит label «Диагноз дня» с датой", () => {
    const { getByText } = render(
      <DailyCaseHeader title="Маточное кровотечение" dateLabel="18 апр" difficulty="medium" />
    );
    expect(getByText(/диагноз дня/i)).toBeInTheDocument();
    expect(getByText(/18 апр/i)).toBeInTheDocument();
  });

  it("рендерит title", () => {
    const { getByText } = render(
      <DailyCaseHeader title="Маточное кровотечение" dateLabel="18 апр" difficulty="medium" />
    );
    expect(getByText("Маточное кровотечение")).toBeInTheDocument();
  });

  it("difficulty easy - aurora-indigo dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="easy" />
    );
    expect(container.querySelector(".daily-difficulty-dot--easy")).toBeTruthy();
  });

  it("difficulty medium - aurora-violet dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="medium" />
    );
    expect(container.querySelector(".daily-difficulty-dot--medium")).toBeTruthy();
  });

  it("difficulty hard - aurora-pink dot", () => {
    const { container } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="hard" />
    );
    expect(container.querySelector(".daily-difficulty-dot--hard")).toBeTruthy();
  });

  it("показывает текст сложности по-русски", () => {
    const { getByText } = render(
      <DailyCaseHeader title="X" dateLabel="1 янв" difficulty="hard" />
    );
    expect(getByText(/сложно/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect fail**

- [ ] **Step 3: Component**

```tsx
"use client";

type Difficulty = "easy" | "medium" | "hard";

interface DailyCaseHeaderProps {
  title: string;
  /** Уже отформатированная дата для показа (например, «18 апр»). */
  dateLabel: string;
  difficulty: Difficulty;
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: "Легко",
  medium: "Средне",
  hard: "Сложно",
};

/**
 * Шапка для /daily-case (полупрозрачная ink-translucent, на premium-dark фоне).
 * Label «ДИАГНОЗ ДНЯ · дата» в aurora-violet, title в extralight,
 * difficulty-chip с aurora-mapped точкой (indigo/violet/pink).
 */
export default function DailyCaseHeader({ title, dateLabel, difficulty }: DailyCaseHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(26, 26, 46, 0.7)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid transparent",
        backgroundImage:
          "linear-gradient(rgba(26,26,46,0.7), rgba(26,26,46,0.7)), linear-gradient(90deg, rgba(99,102,241,0.55), rgba(168,85,247,0.45), rgba(236,72,153,0.35))",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
      }}
    >
      <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A855F7]">
            Диагноз дня · {dateLabel}
          </div>
          <div className="text-[15px] font-extralight text-white truncate mt-0.5">
            {title}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
          <span className={`daily-difficulty-dot daily-difficulty-dot--${difficulty}`} />
          <span className="text-[10px] uppercase tracking-[0.15em] text-white font-semibold">
            {difficultyLabel[difficulty]}
          </span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test** → 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/daily/DailyCaseHeader.tsx src/__tests__/dailyCaseHeader.test.tsx
git commit -m "$(cat <<'EOF'
feat(daily): DailyCaseHeader - локальный header для флагман-страницы

Полупрозрачный ink-translucent (rgba 26,26,46,0.7) с aurora-gradient
border-bottom. Label «ДИАГНОЗ ДНЯ · дата» в aurora-violet.
Difficulty-chip с aurora-mapped точкой (easy=indigo, medium=violet,
hard=pink) - убирает emerald/amber/red semantic цвета.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Рефактор `src/app/daily-case/page.tsx` - dark shell + новый start-screen

**Файлы:**
- Modify: `src/app/daily-case/page.tsx`

**Цель:** обернуть всю страницу в `.daily-case-shell`, заменить inline-header на `DailyCaseHeader`, обновить start-screen (aurora-gradient число, invert-CTA с glow).

**Логика (useEffect, reset, persistence, handleComplete, MedMind setScreen) - НЕ меняется.** Только разметка.

- [ ] **Step 1: Обновить разметку.**

Заменить header-блок (строки 142-164) на:

```tsx
<DailyCaseHeader
  title={dailyCase.title}
  dateLabel={formatDateLabel(dateStr)}
  difficulty={dailyCase.difficulty}
/>
```

Удалить локальные `difficultyLabel` и `difficultyDotColor` (теперь внутри компонента).

Добавить в начало файла import и helper:

```tsx
import DailyCaseHeader from "@/components/daily/DailyCaseHeader";

/** «2026-04-18» → «18 апр». */
function formatDateLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
  return `${d} ${months[m - 1] ?? ""}`.trim();
}
```

Заменить root div (строка 141) `<div className="h-screen flex flex-col">` на:

```tsx
<div className="daily-case-shell flex flex-col min-h-screen">
```

Заменить start-screen (строки 176-197):

```tsx
<div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6">
  <div
    className="text-[96px] font-extralight leading-none tracking-tight aurora-text mb-3"
    style={{ filter: "drop-shadow(0 0 40px rgba(168, 85, 247, 0.35))" }}
  >
    {dailyCase.steps.length}
  </div>
  <p className="text-[10px] uppercase tracking-[0.24em] text-[#A855F7] font-semibold mb-8">
    {dailyCase.steps.length === 1 ? "этап" : "этапов"}
  </p>

  <p className="text-[18px] font-extralight text-white leading-snug max-w-xs mb-3">
    {dailyCase.title}
  </p>
  <p className="text-[12px] text-white/55 leading-relaxed max-w-xs mb-12">
    На каждый этап дается ограниченное время. Отвечайте быстро и точно для максимума очков.
  </p>

  <button
    onClick={() => setStarted(true)}
    className="btn-press inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-[#1A1A2E] text-[13px] font-semibold uppercase tracking-[0.22em]"
    style={{
      boxShadow:
        "0 8px 32px -8px rgba(168, 85, 247, 0.55), 0 0 0 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)",
    }}
  >
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
    Начать
  </button>
</div>
```

Обновить `<main>`:

```tsx
<main className="flex-1 pt-20 pb-24 overflow-y-auto">
  <div className="max-w-lg mx-auto px-6 py-4">
    ...
  </div>
</main>
```

- [ ] **Step 2: Билд + тесты**

```bash
npm test
npm run build
```

Ожидаемо: всё зелёное, билд успешный.

- [ ] **Step 3: Commit**

```bash
git add src/app/daily-case/page.tsx
git commit -m "$(cat <<'EOF'
feat(daily): premium-dark shell + aurora start-screen

Страница /daily-case получает .daily-case-shell (полноэкранный
premium-dark градиент), локальный header вынесен в DailyCaseHeader.
Start-screen переработан: 96px aurora-text число этапов с drop-shadow
glow, invert-CTA (белая pill с ink-текстом + aurora-glow shadow
и triangle-иконкой play).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Рефактор `DailyCasePlayer.tsx` - aurora stages/timer/options

**Файлы:**
- Modify: `src/components/daily/DailyCasePlayer.tsx`

**Цель:** timer bar → `AuroraTimer`, progress dots → `AuroraStages`, options → `.aurora-opt-dark`, step-description → `.aurora-surface-dark` box, очки-число → aurora-text. Логика (useRef, setInterval, catchUp, handleSelect, saveSession, setScreen) НЕ меняется.

- [ ] **Step 1: Обновить разметку (строки 243-309).**

Импорты:
```tsx
import AuroraTimer from "@/components/ui/AuroraTimer";
import AuroraStages from "@/components/ui/AuroraStages";
```

Заменить весь return (кроме outer `<div>` и сохранения логики) на:

```tsx
return (
  <div className="flex flex-col gap-6">
    {/* Aurora timer (заменяет старый 3px bar) */}
    <AuroraTimer timeLeftMs={timeLeft} totalMs={STEP_TIME_LIMIT} />

    {/* Header row: stages + score */}
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <AuroraStages
          stages={dailyCase.steps.map((s) => stepLabels[s.type])}
          currentIndex={currentStep}
        />
      </div>
      {currentPoints > 0 && (
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-[0.22em] text-white/50 font-semibold">
            очки
          </div>
          <div className="text-2xl font-extralight aurora-text tabular-nums leading-none mt-0.5">
            {currentPoints}
          </div>
        </div>
      )}
    </div>

    {/* Step content */}
    <div key={currentStep} className="animate-result flex flex-col gap-4">
      <div className="text-[10px] font-semibold text-[#A855F7] uppercase tracking-[0.22em]">
        {step.title}
      </div>
      <div className="aurora-surface-dark rounded-2xl p-5 text-[13px] leading-relaxed text-white/85">
        {step.description}
      </div>
    </div>

    {/* Options */}
    <div className="flex flex-col gap-2.5">
      {shuffledIndices.map((i, idx) => {
        const letter = String.fromCharCode(65 + idx);
        return (
          <button
            key={i}
            onClick={() => handleSelect(i)}
            className="aurora-opt-dark"
          >
            <span className="aurora-opt-dark-idx">{letter}</span>
            {step.options[i].text}
          </button>
        );
      })}
    </div>
  </div>
);
```

Удалить неиспользуемые `timerColor`, `barColor`, `timerFraction` - теперь внутри `AuroraTimer`. Оставить только `currentPoints`.

- [ ] **Step 2: Тесты + билд**

```bash
npm test
npm run build
```

Если существующие daily-case тесты ссылаются на удалённые классы (например, `.text-warning`) - обновить тесты под новую разметку, сохранив интенцию.

- [ ] **Step 3: Commit**

```bash
git add src/components/daily/DailyCasePlayer.tsx
git commit -m "$(cat <<'EOF'
refactor(daily): DailyCasePlayer на AuroraTimer + AuroraStages + aurora-opt-dark

Заменяет inline 3px timer bar на AuroraTimer (aurora-gradient с pulse),
progress-dots на AuroraStages (aurora-point с glow активного), options
на .aurora-opt-dark (translucent glass с aurora-violet буквой-индексом),
step-description на .aurora-surface-dark. Очки-число - aurora-text.
Логика таймера, catchUp, persistence, handleSelect не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Рефактор `DailyCaseResult.tsx` - dark aurora result-screen

**Файлы:**
- Modify: `src/components/daily/DailyCaseResult.tsx`

**Цель:** результат на тёмном фоне. StepRings → aurora-gradient на dark (SVG с `linearGradient` defs). Score → aurora-text 96px. Stats → translucent-glass. Outcome → aurora-hairline-dark box с indigo(correct)/pink(wrong) головой. Breakdown accordion → translucent rows. Actions → white-outline кнопка.

- [ ] **Step 1: Обновить StepRing** (строки 33-87) - aurora-gradient:

```tsx
function StepRing({ isCorrect, points, label }: { isCorrect: boolean; points: number; label: string }) {
  const size = 52;
  const thickness = 1.8;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="aurora-step-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            strokeWidth={thickness}
            className="aurora-step-ring-track"
          />
          {/* Fill */}
          {isCorrect ? (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              strokeWidth={thickness}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={0}
              className="aurora-step-ring-fill"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.9,0.3,1)" }}
            />
          ) : (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              strokeWidth={thickness}
              strokeDasharray="2 4"
              className="aurora-step-ring-fill--empty"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isCorrect ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-[8px] font-medium uppercase tracking-[0.08em] text-white/45 leading-none">
        {label}
      </span>
      <span className="text-[10px] font-medium tabular-nums text-white/70">
        {points}
      </span>
    </div>
  );
}
```

**Note:** каждый ring рендерит свой `<defs><linearGradient id="aurora-step-gradient">` - это даст дубликат ID на одной странице. Решение: вынести defs в отдельный компонент `<AuroraStepRingDefs />` и отрендерить один раз в начале `DailyCaseResult`, либо использовать уникальный id через `useId()`.

**Решение:** использовать `useId()` из React 19 для уникальных id:

```tsx
import { useId } from "react";

function StepRing({ isCorrect, points, label }: { ... }) {
  const gradId = useId();
  // ...
  <linearGradient id={gradId} ...>
  // ...
  strokeStyle={{ stroke: `url(#${gradId})` }}
```

Или (проще) - один `<svg>` с defs в начале `DailyCaseResult`, а каждый ring ссылается на `url(#aurora-step-gradient-shared)`. Иду по этому пути:

В DailyCaseResult в начале рендерить:

```tsx
<svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
  <defs>
    <linearGradient id="aurora-step-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#6366F1" />
      <stop offset="50%" stopColor="#A855F7" />
      <stop offset="100%" stopColor="#EC4899" />
    </linearGradient>
  </defs>
</svg>
```

И убрать `<defs>` из StepRing, оставив только ссылку `stroke="url(#aurora-step-gradient)"` или через CSS класс `aurora-step-ring-fill` который уже содержит `stroke: url(#aurora-step-gradient)`.

- [ ] **Step 2: Обновить Score-блок** (строки 183-200):

```tsx
<div className="text-center pb-8">
  <p className="text-[10px] uppercase tracking-[0.28em] text-[#A855F7] font-semibold mb-2">
    Итоговый счёт
  </p>
  <div
    className="text-[96px] font-extralight leading-none tracking-tight aurora-text tabular-nums"
    style={{ filter: "drop-shadow(0 0 40px rgba(168, 85, 247, 0.35))" }}
  >
    <NumberTicker value={totalPoints} />
  </div>
  <p className="text-[11px] text-white/55 mt-2">из {maxPoints} очков</p>

  <div className="mt-5 mx-auto w-32 h-px bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-1000"
      style={{
        width: `${percentage}%`,
        background: "linear-gradient(90deg, #6366F1, #A855F7, #EC4899)",
      }}
    />
  </div>
  <p className="text-[11px] text-white/70 font-medium mt-1.5 tabular-nums">{percentage}%</p>
</div>
```

- [ ] **Step 3: Divider** (строка 203) → `<div className="aurora-divider-dark w-24 mx-auto mb-8" />`

- [ ] **Step 4: Stats-row** (строки 206-221):

```tsx
<div className="flex justify-center gap-8 mb-8">
  <div className="text-center">
    <div className="text-2xl font-extralight text-white tabular-nums">{correctCount}/{dailyCase.steps.length}</div>
    <div className="text-[9px] uppercase tracking-[0.18em] text-[#A855F7] font-semibold mt-1">верных</div>
  </div>
  <div className="w-px bg-white/15" />
  <div className="text-center">
    <div className="text-2xl font-extralight text-white tabular-nums">{formatTime(totalTime)}</div>
    <div className="text-[9px] uppercase tracking-[0.18em] text-[#A855F7] font-semibold mt-1">время</div>
  </div>
  <div className="w-px bg-white/15" />
  <div className="text-center">
    <div className="text-2xl font-extralight text-white tabular-nums">{percentage}%</div>
    <div className="text-[9px] uppercase tracking-[0.18em] text-[#A855F7] font-semibold mt-1">рейтинг</div>
  </div>
</div>
```

- [ ] **Step 5: Outcome-box** (строки 223-231):

```tsx
<div className="aurora-hairline-dark rounded-2xl bg-white/5 p-5 mb-8">
  <div
    className="text-[10px] font-semibold mb-1.5 uppercase tracking-[0.18em]"
    style={{ color: allCorrect ? "#6366F1" : "#EC4899" }}
  >
    {allCorrect ? "Пациент выздоровел" : "Состояние ухудшилось"}
  </div>
  <span className="text-sm text-white/80 leading-relaxed">
    {allCorrect ? dailyCase.outcome.correct : dailyCase.outcome.wrong}
  </span>
</div>
```

- [ ] **Step 6: Toggle-button** (строки 234-242):

```tsx
<button
  onClick={() => setShowDetails(!showDetails)}
  className="btn-press w-full py-3.5 rounded-2xl border text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors"
  style={{
    borderColor: "rgba(255,255,255,0.18)",
    color: showDetails ? "#ffffff" : "rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.04)",
  }}
>
  {showDetails ? "Скрыть разбор" : "Показать разбор"}
</button>
```

- [ ] **Step 7: BreakdownAccordion** (строки 89-156) - обновить:

```tsx
function BreakdownAccordion({ dailyCase, stepResults, stepLabels, formatTime }) {
  // ... (логика не меняется)

  if (wrongSteps.length === 0) {
    return (
      <div className="text-center py-4 text-[12px] text-white/55">
        Все этапы пройдены верно
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-white/10 border border-white/15 rounded-2xl overflow-hidden bg-white/[0.04]">
      {wrongSteps.map(({ s, i, r }) => {
        const selectedOpt = r.selectedIndex >= 0 ? s.options[r.selectedIndex] : null;
        const correctOpt = s.options.find((o) => o.isCorrect)!;
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            className="w-full text-left hover:bg-white/[0.02] transition-colors"
            onClick={() => setOpenIndex(isOpen ? null : i)}
          >
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="text-[13px] font-medium text-white/85">{stepLabels[s.type]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/45">{formatTime(r.timeMs)}</span>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`text-white/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {isOpen && (
              <div className="px-4 pb-4 flex flex-col gap-2 text-left border-t border-white/10">
                {selectedOpt && (
                  <p className="text-[12px] text-white/40 line-through pt-3">{selectedOpt.text}</p>
                )}
                <p className="text-[13px] font-medium" style={{ color: "#A855F7" }}>{correctOpt.text}</p>
                {correctOpt.explanation && (
                  <p className="text-[12px] text-white/65 leading-relaxed">{correctOpt.explanation}</p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 8: Перед `return` в основном компоненте** `DailyCaseResult` добавить shared-defs:

```tsx
return (
  <div className="flex flex-col animate-result">
    {/* Shared aurora gradient defs для StepRing */}
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="aurora-step-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>

    {/* Rings */}
    ...
```

- [ ] **Step 9: Тесты + билд**

```bash
npm test
npm run build
```

- [ ] **Step 10: Commit**

```bash
git add src/components/daily/DailyCaseResult.tsx
git commit -m "$(cat <<'EOF'
refactor(daily): DailyCaseResult на dark aurora-палитру

StepRing переведён на aurora-gradient (shared SVG defs в начале компонента),
итоговый счёт - 96px aurora-text с glow, stats-row с aurora-violet label-ами,
outcome-box получает aurora-hairline-dark и aurora-indigo/pink head
(вместо foreground). Toggle-кнопка - white-outline на dark. Breakdown
accordion - translucent rows с aurora-pink cross и aurora-violet правильный
ответ. Логика (totalPoints, correctCount, showDetails, openIndex) не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Рефактор `DailyLeaderboard.tsx` - dark rows + aurora «Вы»

**Файлы:**
- Modify: `src/components/daily/DailyLeaderboard.tsx`

**Цель:** leaderboard на тёмном. Wrapper translucent-glass с aurora-hairline-dark. «Вы» строка - aurora-hairline + aurora-text для ника+очков. Error - aurora-pink (не rose). Логика (fetch, state, token) НЕ меняется.

- [ ] **Step 1: Обновить section** (строки 56-107):

```tsx
return (
  <section className="mt-6 relative rounded-2xl aurora-hairline-dark bg-white/[0.04] p-5">
    <div className="flex items-baseline justify-between mb-3 relative z-10">
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#A855F7]">
        Рейтинг дня
      </h3>
      {rows && (
        <span className="text-[10px] text-white/50">
          {rows.length} {rows.length === 1 ? "участник" : "участников"}
        </span>
      )}
    </div>

    <div className="aurora-divider-dark mb-3 relative z-10" />

    {error && <div className="text-[12px] relative z-10" style={{ color: "#EC4899" }}>{error}</div>}
    {!rows && !error && (
      <div className="text-[12px] text-white/50 relative z-10">Загружаем...</div>
    )}
    {rows && rows.length === 0 && (
      <div className="text-[12px] text-white/55 relative z-10">
        Вы первый сегодня. Список обновится, когда кто-то ещё пройдёт кейс.
      </div>
    )}
    {rows && rows.length > 0 && (
      <ol className="flex flex-col gap-1.5 relative z-10">
        {rows.map((r) => (
          <li
            key={`${r.position}-${r.nickname}`}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] ${
              r.isSelf
                ? "relative aurora-hairline-dark bg-white/[0.06]"
                : "bg-transparent"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 relative z-10">
              <span
                className={`w-6 text-right font-medium tabular-nums ${
                  r.isSelf ? "text-[#A855F7]" : "text-white/45"
                }`}
              >
                {r.position}
              </span>
              <span className={`truncate ${r.isSelf ? "aurora-text font-semibold" : "text-white/85"}`}>
                {r.isSelf ? "Вы" : r.nickname}
              </span>
            </div>
            <span
              className={`tabular-nums font-semibold relative z-10 ${
                r.isSelf ? "aurora-text" : "text-white/85"
              }`}
            >
              {r.totalPoints}
            </span>
          </li>
        ))}
      </ol>
    )}
  </section>
);
```

**Note про z-index:** `aurora-hairline-dark::before` использует `z-index: 1`, поэтому внутренний контент должен иметь `relative z-10` чтобы не был перекрыт псевдоэлементом. То же для `<li>` с `isSelf`.

- [ ] **Step 2: Тесты + билд**

```bash
npm test
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/daily/DailyLeaderboard.tsx
git commit -m "$(cat <<'EOF'
refactor(daily): DailyLeaderboard - dark aurora-палитра

Wrapper - translucent-glass с aurora-hairline-dark. Заголовок
«Рейтинг дня» в aurora-violet, participants caption в white/50,
divider aurora-gradient. Строка «Вы» - aurora-hairline-dark
с aurora-text для ника и очков. Error - aurora-pink (вместо rose).
Логика fetch не меняется.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Финальная верификация + PR

- [ ] **Step 1: Все тесты**

```bash
npm test
```
Ожидаемо: все тесты проходят (+ 3 × 5-7 = 15-20 новых).

- [ ] **Step 2: Билд**

```bash
npm run build
```
Ожидаемо: successful.

- [ ] **Step 3: Push**

```bash
git push -u origin feat/aurora-phase-4
```

- [ ] **Step 4: PR**

```bash
gh pr create --base feat/aurora-phase-3 --title "feat(daily-case): Aurora redesign Phase 4 - /daily-case flagship" --body "$(cat <<'EOF'
## Summary
- **Флагманский редизайн** `/daily-case`: полноэкранный premium-dark градиент + aurora-акценты, отличительный от остальных страниц
- **3 новых примитива**: `AuroraTimer` (3-фазный aurora-bar с pulse), `AuroraStages` (прогрессия этапов с aurora-gradient dots), `DailyCaseHeader` (ink-translucent header с aurora-gradient border-bottom и aurora-mapped difficulty-dot)
- **Aurora CSS-классы** в globals.css: `.daily-case-shell`, `.aurora-hairline-dark`, `.aurora-surface-dark`, `.aurora-opt-dark`, `.aurora-stage-*`, `.aurora-timer-*`, `.daily-difficulty-dot--*`, `.aurora-step-ring-*`, `.aurora-divider-dark`
- **Start-screen**: 96px aurora-text число этапов с drop-shadow glow, invert-CTA (белая pill с ink-текстом + aurora-glow shadow)
- **Player**: AuroraTimer + AuroraStages + aurora-opt-dark options (translucent glass с aurora-violet буквой-индексом) + aurora-surface-dark для step-description. Очки - aurora-text.
- **Result**: StepRing на aurora-gradient (shared SVG defs), итоговый счёт 96px aurora-text с glow, stats в aurora-violet label-ах, outcome-box aurora-hairline-dark, breakdown-accordion translucent rows
- **Leaderboard**: aurora-hairline-dark wrapper, «Вы» строка - aurora-hairline + aurora-text для ника и очков. Error в aurora-pink.
- **Логика не меняется** (таймеры, catchUp, persistence, API-вызов leaderboard, подсчёт очков, reset через URL ?reset=1)

> **Base:** этот PR базируется на `feat/aurora-phase-3`. Мержить после #7, #8, #9.

План: [docs/superpowers/plans/2026-04-18-aurora-phase-4-daily-case.md](docs/superpowers/plans/2026-04-18-aurora-phase-4-daily-case.md)
Общая спека: [docs/superpowers/specs/2026-04-18-aurora-redesign-design.md](docs/superpowers/specs/2026-04-18-aurora-redesign-design.md)

## Test plan
- [x] `npm test` - все тесты зелёные (+ новые тесты для 3 примитивов)
- [x] `npm run build` - successful
- [ ] Визуальная проверка `/daily-case` - start-screen на premium-dark с aurora-number
- [ ] Player: timer меняет цвет normal→warning→danger, stages с активной точкой glowing
- [ ] Result: aurora-rings, aurora-text score, outcome aurora-hairline
- [ ] Leaderboard: «Вы» строка с aurora-hairline, aurora-text ник+очки
- [ ] Проверка темы graphite/mocha/bordeaux не ломается (aurora-утилиты привязаны к default)
- [ ] `prefers-reduced-motion` - transitions отключаются

## Дальше
- Phase 5: /welcome + /subscription (конверсионные страницы)
- Phase 6 (опционально): /consilium + /achievements + /mistakes + /review

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage (из docs/superpowers/specs/2026-04-18-aurora-redesign-design.md, секция /daily-case):**
- ✅ Full-screen premium-dark gradient фон - `.daily-case-shell` (Task 1)
- ✅ Timer в aurora-gradient с pulse-indicator - `AuroraTimer` (Task 2)
- ✅ Leaderboard soft list с aurora-text ника - Task 8
- ✅ Progress через этапы - aurora-bar с dot-marker - `AuroraStages` (Task 3)

**Не покрыто осознанно:**
- Новые тесты для page.tsx / DailyCasePlayer / DailyCaseResult / DailyLeaderboard - существующие тесты должны продолжать работать (только корректировки если классы менялись). Если есть - адаптируем, не добавляем новые интеграционные.
- MedMind setScreen контексты - не трогаем (это отдельная система).
- Reset URL logic (`?reset=1`) - не трогаем, продолжает работать.
- persistence (`saveSession` / `loadSession`) - не трогаем.
- Leaderboard API (`/api/daily-case/leaderboard`) - не трогаем.

**Placeholder scan:** нет TBD/TODO.

**Type consistency:**
- `Difficulty = "easy" | "medium" | "hard"` - используется в DailyCaseHeader, совместимо с `dailyCase.difficulty`
- `AuroraTimerProps { timeLeftMs: number, totalMs: number }` - принимает уже посчитанные значения
- `AuroraStagesProps { stages: string[], currentIndex: number }` - принимает массив лейблов + индекс

**Risk flags:**
1. Shared SVG gradient id (`aurora-step-gradient`) в DailyCaseResult - нужно проверить что он уникален на странице. Если на странице будет второй экземпляр (через portal или что-то подобное) - конфликт. На практике не будет, но отмечаем.
2. `transform: translate(50%, -50%)` на `.aurora-timer-pulse` совместно с inline `width: %` fill - pulse может уходить за пределы track при fraction=1. Smoke-test: проверяем визуально.
3. `aurora-hairline-dark` использует `z-index: 1` на `::before`, контент внутри должен иметь `relative z-10`. Отмечено в Task 8.
4. BottomNav остаётся светлым (это общий компонент) - visual contrast с dark shell. В данной фазе не меняем (вне scope). Если доктор заметит - добавим aurora-dark-mode в BottomNav в отдельной итерации.
