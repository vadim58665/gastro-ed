# Aurora Redesign - Phase 1 Implementation Plan (Фундамент + Shell + Profile)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать Фазу 1 aurora-ребрендинга - дизайн-токены, 9 новых UI-примитивов, обновление TopBar/BottomNav/StreakBadge/ExamReadiness, новый хук данных, полный рефактор FeedProfile на aurora-язык.

**Architecture:** Все изменения идут под единую aurora-палитру (индиго #6366F1 → фиолет #A855F7 → пинк #EC4899). Новые примитивы живут в `src/components/ui/`, следуют существующим конвенциям `"use client"` + props `{ ... }` без внешних зависимостей. Данные для Profile приходят через новый хук `useProfilePageData` - один хук собирает всё параллельными запросами к Supabase + реиспользует `useGamification`/`useAuth`/`useSubscription`. TDD: каждый примитив сначала тест (vitest + @testing-library/react), потом реализация.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, Supabase, vitest, @testing-library/react.

**Спека:** [docs/superpowers/specs/2026-04-18-aurora-redesign-design.md](../specs/2026-04-18-aurora-redesign-design.md)

---

## Prerequisites

- [ ] **Создать feature-branch**

```bash
git checkout -b feat/aurora-phase-1
```

- [ ] **Проверить что тесты зелёные до начала**

Команда: `npm test`
Ожидаемо: `376 passing` (или сколько сейчас), никаких падений. Если что-то красное - починить до начала.

- [ ] **Проверить что билд проходит до начала**

Команда: `npm run build`
Ожидаемо: Successful build. Если есть ошибки - починить до начала.

---

## Важные замечания для разработчика

**Правила проекта (не нарушать):**
1. **Никаких em-dash `—`**, использовать короткий дефис `-`. Относится к UI-текстам, комментариям, docstrings.
2. **Никаких emoji и decorative icons на страницах**, только SVG. Исключение - внутренности BottomNav (там всё равно SVG).
3. **Все страницы `"use client"`** - приложение хранит состояние в localStorage, SSR-рендер не годится.
4. **Русский UI-текст, английский код**. Имена переменных/функций/компонентов - английские.
5. **RTL тесты на кириллице:** используй `screen.getByLabelText("Текст")` или `screen.getByText("...")`. Функция `screen.getByRole("button", { name: "..." })` ломается на кириллических aria-label (см. [`concepts/rtl-cyrillic-testing`](../../wiki/concepts/rtl-cyrillic-testing.md)).
6. **Supabase клиент:** `import { getSupabase } from "@/lib/supabase/client"`. Singleton с кастомным lock-override, не трогать.
7. **Цвета - только aurora:** `#6366F1`, `#A855F7`, `#EC4899`, `#1A1A2E`. Никаких emerald, amber, rose-red в новом коде.

**Где смотреть референс:**
- Мокап утверждён в `.superpowers/brainstorm/70827-1776466322/content/profile-v3.html` - открой этот файл в браузере, чтобы видеть целевой дизайн.
- Существующие примитивы в `src/components/ui/` - используй их стиль (typescript, `"use client"`, named export default).

**Стратегия тестов для визуальных компонентов:** пишем лёгкие render-тесты + prop-тесты. Не пиксель-перфект (нет visual regression setup), но проверяем:
- Компонент монтируется без ошибок
- Правильный текст / число рендерится
- Правильный CSS-класс применяется по variant/accent
- Callbacks вызываются при клике (для интерактивных)
- Aria-labels на месте

---

## Task 1: Aurora Design Tokens в globals.css

**Files:**
- Modify: `src/app/globals.css` (добавить токены в `@theme`, добавить utility-классы)

- [ ] **Step 1: Прочитать текущий globals.css**

Команда: `wc -l src/app/globals.css`
Ожидаемо: ~950 строк. Ознакомиться со структурой `@theme`, существующими классами (`.aurora-text`, `.btn-premium-dark`, `.magic-card*`, etc.).

- [ ] **Step 2: Добавить aurora-токены в блок `@theme`**

Открыть `src/app/globals.css`, найти блок `@theme { ... }` (строки 3-35). Добавить в конец блока (перед закрывающей `}`) следующие переменные:

```css
  /* Aurora palette - formalised (Phase 1, 2026-04-18) */
  --color-aurora-indigo: #6366F1;
  --color-aurora-violet: #A855F7;
  --color-aurora-pink: #EC4899;
  --color-ink: #1A1A2E;

  /* Aurora-tinted shadows */
  --shadow-aurora-sm:
    0 1px 2px rgba(99, 102, 241, 0.06),
    0 6px 18px -8px rgba(99, 102, 241, 0.25);
  --shadow-aurora-md:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 1px 2px rgba(99, 102, 241, 0.06),
    0 18px 36px -18px rgba(168, 85, 247, 0.28);
  --shadow-aurora-lg:
    inset 0 1px 0 rgba(255, 255, 255, 1),
    0 2px 6px rgba(49, 46, 129, 0.35),
    0 18px 40px -12px rgba(99, 102, 241, 0.55);
```

- [ ] **Step 3: Заменить body background на aurora-ambient**

Найти существующий селектор `body { ... }` (~строка 50). Заменить `background-image` на трёхрадиальный aurora-ambient:

```css
body {
  background-color: var(--color-background);
  background-image:
    radial-gradient(1200px 800px at 50% -10%, rgba(99, 102, 241, 0.08), transparent 60%),
    radial-gradient(600px 400px at 100% 30%, rgba(168, 85, 247, 0.06), transparent 55%),
    radial-gradient(800px 600px at 0% 100%, rgba(236, 72, 153, 0.04), transparent 55%);
  background-attachment: fixed;
}
```

- [ ] **Step 4: Добавить новые utility-классы в конец файла**

В конце `globals.css` (после всех существующих блоков, но ДО тем `html[data-theme=...]`, чтобы темы могли их переопределять) добавить секцию:

```css
/* ===========================================================
   Aurora utilities (Phase 1, 2026-04-18)
   =========================================================== */

/* Aurora welcome band - тонкая полоска под TopBar на premium-страницах */
.aurora-welcome-band {
  position: relative;
  height: 20px;
  background:
    radial-gradient(600px 80px at 20% 100%, rgba(99, 102, 241, 0.18), transparent 70%),
    radial-gradient(600px 80px at 80% 100%, rgba(236, 72, 153, 0.12), transparent 70%);
  pointer-events: none;
}

/* Aurora hairline gradient border для premium-карточек */
.aurora-hairline {
  position: relative;
}
.aurora-hairline::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.2px;
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.4) 0%,
    rgba(168, 85, 247, 0.2) 50%,
    rgba(236, 72, 153, 0.15) 100%
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

/* Aurora conic-gradient ring для больших progress-rings (используется .style={--fill:X%}) */
.aurora-conic {
  background: conic-gradient(
    from -90deg,
    #6366F1 0%,
    #A855F7 30%,
    #EC4899 var(--aurora-fill, 40%),
    rgba(99, 102, 241, 0.08) var(--aurora-fill, 40%)
  );
}

/* Aurora gradient (линейный) - используется в .aurora-grad-bg */
.aurora-grad-bg {
  background: linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%);
}
```

- [ ] **Step 5: Проверить что стили компилируются (dev-server)**

Команда: `npm run dev`
Открыть `http://localhost:3000/profile` в браузере. Визуально: должен быть светлый фон с очень тонкими aurora-градиентами по углам. Текст не сломан.
Остановить dev-server (Ctrl+C).

- [ ] **Step 6: Убедиться что тесты всё ещё зелёные**

Команда: `npm test`
Ожидаемо: все тесты проходят. Если есть падения - починить.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "$(cat <<'EOF'
feat(design): aurora-токены и utility-классы в globals.css

Добавляет --color-aurora-indigo/violet/pink/ink, три shadow-tinted
переменные (sm/md/lg), новый body background с aurora-ambient,
utility-классы .aurora-welcome-band, .aurora-hairline, .aurora-conic,
.aurora-grad-bg. Фундамент для Phase 1 дизайн-ребрендинга.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: AvatarStack компонент

**Files:**
- Create: `src/components/ui/AvatarStack.tsx`
- Test: `src/__tests__/avatarStack.test.tsx`

**Назначение:** аватар-стек для identity-hero в профиле. 128px, aurora ring, dashed activity-ring снаружи с процентом сегодняшней активности, chip с лейблом сверху, verified-badge в правом нижнем углу.

- [ ] **Step 1: Написать падающий тест**

Создать `src/__tests__/avatarStack.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AvatarStack from "@/components/ui/AvatarStack";

describe("AvatarStack", () => {
  it("рендерит заглавную букву", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  it("показывает activity-label если передан", () => {
    render(<AvatarStack initial="V" activityLabel="4 сегодня" />);
    expect(screen.getByText("4 сегодня")).toBeInTheDocument();
  });

  it("не показывает activity-label если не передан", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.queryByText(/сегодня/)).not.toBeInTheDocument();
  });

  it("показывает verified-badge если verified=true", () => {
    render(<AvatarStack initial="V" verified />);
    expect(screen.getByLabelText("PRO-подписчик")).toBeInTheDocument();
  });

  it("не показывает verified-badge если verified не передан", () => {
    render(<AvatarStack initial="V" />);
    expect(screen.queryByLabelText("PRO-подписчик")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить тест, убедиться что падает**

Команда: `npm test -- avatarStack`
Ожидаемо: FAIL - "Failed to resolve import '@/components/ui/AvatarStack'".

- [ ] **Step 3: Написать реализацию**

Создать `src/components/ui/AvatarStack.tsx`:

```tsx
"use client";

import { CSSProperties } from "react";

interface AvatarStackProps {
  initial: string;
  size?: number;
  verified?: boolean;
  activityLabel?: string;
  /** Процент заполнения activity-ring (0-100). По умолчанию 0 (ring скрыт). */
  activityPercent?: number;
}

/**
 * Identity-стек аватара: внешний glow aura, dashed activity-ring,
 * aurora 2px ring, белое ядро с aurora-text буквой, verified-badge
 * в правом нижнем углу.
 */
export default function AvatarStack({
  initial,
  size = 128,
  verified = false,
  activityLabel,
  activityPercent = 0,
}: AvatarStackProps) {
  const clamped = Math.max(0, Math.min(100, activityPercent));
  const conicStyle: CSSProperties = {
    background: `conic-gradient(
      from -90deg,
      #6366F1 0%,
      #A855F7 ${clamped * 0.5}%,
      #EC4899 ${clamped}%,
      rgba(99, 102, 241, 0.08) ${clamped}%,
      rgba(99, 102, 241, 0.08) 100%
    )`,
    mask: "radial-gradient(circle, transparent 54%, black 54%, black 59%, transparent 59%)",
    WebkitMask: "radial-gradient(circle, transparent 54%, black 54%, black 59%, transparent 59%)",
  };

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
    >
      {/* Soft radial aura */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          inset: -16,
          background:
            "radial-gradient(circle at 30% 30%, rgba(168,85,247,0.55), rgba(99,102,241,0.4) 40%, rgba(236,72,153,0.15) 65%, transparent 80%)",
          filter: "blur(24px)",
        }}
      />

      {/* Activity label chip */}
      {activityLabel && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-[8px] tracking-[0.22em] uppercase font-semibold whitespace-nowrap px-2.5 py-1 rounded-full"
          style={{
            top: -24,
            color: "#6366F1",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.2)",
            boxShadow: "0 2px 8px -2px rgba(99,102,241,0.2)",
          }}
        >
          {activityLabel}
        </div>
      )}

      {/* Dashed activity progress ring */}
      {activityPercent > 0 && (
        <div
          className="absolute inset-0 rounded-full"
          style={conicStyle}
        />
      )}

      {/* Aurora gradient ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 9,
          padding: 2,
          background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          mask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      {/* White core with aurora-text initial */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          inset: 11,
          background: "linear-gradient(180deg, #fff 0%, #f4f5fa 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.06), 0 10px 28px -10px rgba(99,102,241,0.4)",
        }}
      >
        <span
          className="font-extralight tracking-tight"
          style={{
            fontSize: Math.round(size * 0.375),
            background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {initial}
        </span>
      </div>

      {/* Verified badge */}
      {verified && (
        <div
          aria-label="PRO-подписчик"
          className="absolute rounded-full flex items-center justify-center text-white"
          style={{
            right: 2,
            bottom: 2,
            width: 28,
            height: 28,
            background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 60%, #A855F7 100%)",
            border: "3px solid #f8f9fc",
            boxShadow: "0 4px 12px -2px rgba(99,102,241,0.55)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- avatarStack`
Ожидаемо: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AvatarStack.tsx src/__tests__/avatarStack.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): AvatarStack - identity-аватар с aurora-ring и activity

Новый primitive для identity-hero в профиле. Aurora gradient ring
(indigo→violet→pink), опциональные dashed activity-ring с процентом,
verified-badge в aurora premium-dark, activity-label сверху.
Тесты: render, activity-label visibility, verified-badge visibility.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: XpProgress компонент

**Files:**
- Create: `src/components/ui/XpProgress.tsx`
- Test: `src/__tests__/xpProgress.test.tsx`

**Назначение:** карточка прогресса XP до следующего уровня. Aurora-число текущего XP, bar с pink-glow dot-marker, footer с названиями уровней.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/xpProgress.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import XpProgress from "@/components/ui/XpProgress";

describe("XpProgress", () => {
  it("рендерит текущий и целевой XP", () => {
    render(
      <XpProgress
        current={1934}
        target={2071}
        currentLevel="Ординатор II"
        nextLevel="Врач"
      />
    );
    expect(screen.getByText(/1[\s ]?934/)).toBeInTheDocument();
    expect(screen.getByText(/2[\s ]?071/)).toBeInTheDocument();
  });

  it("показывает остаток XP до цели", () => {
    render(
      <XpProgress current={1934} target={2071} currentLevel="Ординатор II" nextLevel="Врач" />
    );
    // 2071 - 1934 = 137
    expect(screen.getByText(/137/)).toBeInTheDocument();
  });

  it("рендерит названия уровней в футере", () => {
    render(
      <XpProgress current={1934} target={2071} currentLevel="Ординатор II" nextLevel="Врач" />
    );
    expect(screen.getByText("Ординатор II")).toBeInTheDocument();
    expect(screen.getByText("Врач")).toBeInTheDocument();
  });

  it("показывает 100% если current >= target", () => {
    const { container } = render(
      <XpProgress current={2500} target={2071} currentLevel="Врач" nextLevel="Профессор" />
    );
    const bar = container.querySelector('[data-xp-bar]') as HTMLElement;
    expect(bar?.style.width).toBe("100%");
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- xpProgress`
Ожидаемо: FAIL - "Failed to resolve import".

- [ ] **Step 3: Написать реализацию**

Создать `src/components/ui/XpProgress.tsx`:

```tsx
"use client";

interface XpProgressProps {
  current: number;
  target: number;
  currentLevel: string;
  nextLevel: string;
}

const formatNumber = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

export default function XpProgress({
  current,
  target,
  currentLevel,
  nextLevel,
}: XpProgressProps) {
  const remaining = Math.max(0, target - current);
  const fillPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <div
      className="relative rounded-2xl bg-white px-4 py-3.5"
      style={{
        border: "1px solid rgba(99,102,241,0.08)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 10px 24px -14px rgba(99,102,241,0.2)",
      }}
    >
      <div className="flex justify-between items-baseline mb-2.5">
        <div className="flex flex-col gap-0.5">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted font-medium">
            До уровня «{nextLevel}»
          </div>
          <div
            className="text-2xl font-extralight tracking-tight"
            style={{
              background: "linear-gradient(135deg, #1A1A2E, #6366F1 70%, #A855F7)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {formatNumber(current)}{" "}
            <span className="text-[11px] text-muted font-light">
              / {formatNumber(target)} XP
            </span>
          </div>
        </div>
        <div className="text-[9px] text-muted flex items-center gap-1">
          ещё
          <span className="text-xs text-primary font-medium">{remaining}</span>
        </div>
      </div>

      <div
        className="h-1 rounded-full overflow-hidden relative"
        style={{ background: "rgba(99,102,241,0.08)" }}
      >
        <div
          data-xp-bar
          className="h-full rounded-full relative"
          style={{
            width: `${fillPercent}%`,
            background: "linear-gradient(90deg, #6366F1 0%, #A855F7 60%, #EC4899 100%)",
          }}
        >
          <div
            className="absolute rounded-full"
            style={{
              right: 0,
              top: "50%",
              transform: "translate(50%, -50%)",
              width: 10,
              height: 10,
              background: "#EC4899",
              boxShadow: "0 0 0 2px #fff, 0 0 12px rgba(236,72,153,0.6)",
            }}
          />
        </div>
      </div>

      <div className="flex justify-between mt-1.5 text-[8px] text-muted tracking-[0.15em] uppercase font-medium">
        <span>{currentLevel}</span>
        <span>{nextLevel}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- xpProgress`
Ожидаемо: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/XpProgress.tsx src/__tests__/xpProgress.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): XpProgress - карточка прогресса до следующего уровня

Aurora-число текущего XP, bar с pink-glow dot-marker, footer
с названиями уровней. Используется в Profile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: StreakHero компонент (с weekly sparkline)

**Files:**
- Create: `src/components/ui/StreakHero.tsx`
- Test: `src/__tests__/streakHero.test.tsx`

**Назначение:** большая hero-карточка streak-а с 54px aurora-числом, sub-строкой, недельным sparkline (Пн-Вс, 7 столбиков), строкой лучшего streak-а.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/streakHero.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StreakHero, { type WeekDay } from "@/components/ui/StreakHero";

const sampleWeek: WeekDay[] = [
  { label: "Пн", activity: 0.5, isToday: false },
  { label: "Вт", activity: 0, isToday: false },
  { label: "Ср", activity: 0.7, isToday: false },
  { label: "Чт", activity: 0.9, isToday: false },
  { label: "Пт", activity: 0.8, isToday: false },
  { label: "Сб", activity: 0, isToday: false },
  { label: "Вс", activity: 0, isToday: true },
];

describe("StreakHero", () => {
  it("рендерит текущий streak большим числом", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("рендерит лучший streak", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/4 ДНЯ/i)).toBeInTheDocument();
  });

  it("рендерит все 7 дней недели", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText("Пн")).toBeInTheDocument();
    expect(screen.getByText("Вс")).toBeInTheDocument();
  });

  it("корректно склоняет «день» для streak 1", () => {
    render(<StreakHero currentStreak={1} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/день подряд/i)).toBeInTheDocument();
  });

  it("корректно склоняет «дня» для streak 2-4", () => {
    render(<StreakHero currentStreak={3} bestStreak={4} weekPattern={sampleWeek} />);
    expect(screen.getByText(/дня подряд/i)).toBeInTheDocument();
  });

  it("корректно склоняет «дней» для streak 5+", () => {
    render(<StreakHero currentStreak={7} bestStreak={7} weekPattern={sampleWeek} />);
    expect(screen.getByText(/дней подряд/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- streakHero`
Ожидаемо: FAIL - "Failed to resolve import".

- [ ] **Step 3: Написать реализацию**

Создать `src/components/ui/StreakHero.tsx`:

```tsx
"use client";

export interface WeekDay {
  label: string;
  /** 0 (нет активности) до 1 (максимум). null если день сегодня и ещё не закрыт. */
  activity: number;
  isToday: boolean;
}

interface StreakHeroProps {
  currentStreak: number;
  bestStreak: number;
  weekPattern: WeekDay[];
}

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export default function StreakHero({
  currentStreak,
  bestStreak,
  weekPattern,
}: StreakHeroProps) {
  return (
    <div
      className="aurora-hairline relative rounded-3xl bg-white px-4 pt-4 pb-3.5 overflow-hidden"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 20px 40px -20px rgba(99,102,241,0.32)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "70%",
          background:
            "radial-gradient(400px 180px at 70% 0%, rgba(99,102,241,0.14), transparent 70%)",
        }}
      />

      <div className="relative text-[9px] tracking-[0.22em] uppercase font-medium" style={{ color: "#6366F1" }}>
        Твой streak
      </div>

      <div
        className="relative font-extralight leading-none mt-2"
        style={{
          fontSize: 54,
          letterSpacing: "-0.04em",
          background: "linear-gradient(135deg, #1A1A2E 0%, #6366F1 50%, #A855F7 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {currentStreak}
      </div>

      <div className="relative text-[10px] text-foreground/60 mt-1">
        {pluralDay(currentStreak)} подряд · не упусти
      </div>

      <div
        className="relative flex gap-0.5 mt-3 pt-2.5"
        style={{ borderTop: "1px solid rgba(99,102,241,0.1)" }}
      >
        {weekPattern.map((d, i) => {
          const heightPx = Math.max(6, Math.round(d.activity * 22));
          const isDim = d.activity === 0 && !d.isToday;
          return (
            <div key={i} className="flex-1 text-center">
              <div
                className="w-full rounded-sm"
                style={{
                  height: d.isToday ? 22 : heightPx,
                  background: d.isToday
                    ? "transparent"
                    : isDim
                    ? "rgba(99,102,241,0.08)"
                    : "linear-gradient(180deg, #6366F1, #A855F7)",
                  boxShadow: d.isToday
                    ? "none"
                    : isDim
                    ? "none"
                    : "0 0 6px rgba(99,102,241,0.4)",
                  border: d.isToday ? "1.5px dashed rgba(99,102,241,0.6)" : "none",
                  marginTop: d.isToday ? 0 : 22 - heightPx,
                }}
              />
              <div
                className={`text-[7px] tracking-wide mt-1 font-medium ${
                  d.isToday ? "font-semibold" : ""
                }`}
                style={{ color: d.isToday ? "#6366F1" : "#94a3b8" }}
              >
                {d.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="relative mt-2.5 flex justify-between items-baseline text-[9px] tracking-wide text-muted">
        <span>Лучший</span>
        <span className="font-semibold tracking-[0.12em]" style={{ color: "#A855F7" }}>
          {bestStreak} {pluralDay(bestStreak).toUpperCase()}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- streakHero`
Ожидаемо: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StreakHero.tsx src/__tests__/streakHero.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): StreakHero с weekly sparkline и aurora-числом

54px aurora-число streak-а, 7-столбиковый sparkline Пн-Вс,
склонение «день/дня/дней», aurora-violet best-streak.
Используется в Profile hero-duo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: AccuracyRing компонент

**Files:**
- Create: `src/components/ui/AccuracyRing.tsx`
- Test: `src/__tests__/accuracyRing.test.tsx`

**Назначение:** 88px conic-ring с aurora-градиентом. Процент точности в центре, fraction-sub (62/154), опциональный trend-индикатор (стрелка + дельта).

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/accuracyRing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AccuracyRing from "@/components/ui/AccuracyRing";

describe("AccuracyRing", () => {
  it("рендерит процент точности", () => {
    render(<AccuracyRing percent={40} fraction="62/154" />);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("рендерит fraction если передан", () => {
    render(<AccuracyRing percent={40} fraction="62/154" />);
    expect(screen.getByText("62/154")).toBeInTheDocument();
  });

  it("не рендерит trend если не передан", () => {
    render(<AccuracyRing percent={40} />);
    expect(screen.queryByText(/за неделю/i)).not.toBeInTheDocument();
  });

  it("рендерит trend с дельтой", () => {
    render(
      <AccuracyRing
        percent={40}
        trend={{ delta: 3, period: "за неделю" }}
      />
    );
    expect(screen.getByText(/\+3%/)).toBeInTheDocument();
    expect(screen.getByText(/за неделю/i)).toBeInTheDocument();
  });

  it("рендерит отрицательный trend", () => {
    render(
      <AccuracyRing
        percent={40}
        trend={{ delta: -5, period: "за неделю" }}
      />
    );
    expect(screen.getByText(/-5%/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- accuracyRing`
Ожидаемо: FAIL - "Failed to resolve import".

- [ ] **Step 3: Написать реализацию**

Создать `src/components/ui/AccuracyRing.tsx`:

```tsx
"use client";

interface AccuracyRingProps {
  percent: number;
  fraction?: string;
  trend?: {
    delta: number;
    period: string;
  };
}

export default function AccuracyRing({
  percent,
  fraction,
  trend,
}: AccuracyRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="aurora-hairline relative rounded-3xl bg-white px-3 py-4 flex flex-col items-center overflow-hidden"
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,1), 0 1px 2px rgba(17,24,39,0.04), 0 18px 36px -18px rgba(168,85,247,0.28)",
      }}
    >
      <div className="text-[9px] tracking-[0.22em] uppercase font-medium" style={{ color: "#A855F7" }}>
        Точность
      </div>

      <div
        className="rounded-full mt-2"
        style={{
          width: 88,
          height: 88,
          padding: 5,
          background: `conic-gradient(
            from -90deg,
            #6366F1 0%,
            #A855F7 ${clamped * 0.75}%,
            #EC4899 ${clamped}%,
            rgba(99,102,241,0.08) ${clamped}%
          )`,
        }}
      >
        <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center">
          <div className="text-[22px] font-extralight tracking-tight text-foreground">
            {clamped}%
          </div>
          {fraction && (
            <div className="text-[8px] tracking-[0.15em] uppercase text-muted font-medium -mt-0.5">
              {fraction}
            </div>
          )}
        </div>
      </div>

      {trend && (
        <div
          className="flex items-center gap-1 mt-2 text-[9px] font-semibold tracking-wide"
          style={{ color: "#6366F1" }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {trend.delta >= 0 ? (
              <>
                <polyline points="17 6 23 6 23 12" />
                <polyline points="1 18 7 12 13 18 23 6" />
              </>
            ) : (
              <>
                <polyline points="17 18 23 18 23 12" />
                <polyline points="1 6 7 12 13 6 23 18" />
              </>
            )}
          </svg>
          {trend.delta >= 0 ? `+${trend.delta}%` : `${trend.delta}%`} {trend.period}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- accuracyRing`
Ожидаемо: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/AccuracyRing.tsx src/__tests__/accuracyRing.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): AccuracyRing - 88px conic-ring с aurora-градиентом

Conic-aurora кольцо точности с процентом в центре,
fraction-sub, опциональный trend-индикатор (стрелка + дельта).
Используется в Profile hero-duo.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: StatTile компонент

**Files:**
- Create: `src/components/ui/StatTile.tsx`
- Test: `src/__tests__/statTile.test.tsx`

**Назначение:** маленькая карточка-стат. Aurora-text число + uppercase label. Variant `accent` - aurora pink-violet gradient для выделения.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/statTile.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatTile from "@/components/ui/StatTile";

describe("StatTile", () => {
  it("рендерит значение и label", () => {
    render(<StatTile value={218} label="Ответов" />);
    expect(screen.getByText("218")).toBeInTheDocument();
    expect(screen.getByText("Ответов")).toBeInTheDocument();
  });

  it("принимает строковое значение", () => {
    render(<StatTile value="8д" label="В продукте" />);
    expect(screen.getByText("8д")).toBeInTheDocument();
  });

  it("применяет accent-класс если accent=true", () => {
    const { container } = render(<StatTile value={161} label="К повтору" accent />);
    const valueEl = container.querySelector('[data-stat-value]') as HTMLElement;
    expect(valueEl?.dataset.accent).toBe("true");
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- statTile`
Ожидаемо: FAIL.

- [ ] **Step 3: Реализация**

Создать `src/components/ui/StatTile.tsx`:

```tsx
"use client";

interface StatTileProps {
  value: string | number;
  label: string;
  accent?: boolean;
}

export default function StatTile({ value, label, accent = false }: StatTileProps) {
  return (
    <div
      className="rounded-2xl bg-white px-1.5 py-2.5 text-center"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.03)",
      }}
    >
      <div
        data-stat-value
        data-accent={accent}
        className="text-[18px] font-light tracking-tight"
        style={{
          background: accent
            ? "linear-gradient(135deg, #6366F1, #EC4899)"
            : "linear-gradient(135deg, #1A1A2E, #6366F1)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </div>
      <div className="text-[7.5px] tracking-[0.16em] uppercase text-foreground/60 mt-1 font-medium">
        {label}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- statTile`
Ожидаемо: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatTile.tsx src/__tests__/statTile.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): StatTile - мини-карточка стата с aurora-числом

Aurora-text значение + uppercase label. Variant accent использует
pink-violet gradient для выделенных метрик (например, «К повтору»).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: DailyCaseCTA компонент

**Files:**
- Create: `src/components/ui/DailyCaseCTA.tsx`
- Test: `src/__tests__/dailyCaseCTA.test.tsx`

**Назначение:** премиум-dark карточка с вызовом сегодняшнего «Диагноза дня». Pulse-индикатор «Активно», points-бар, белая CTA-кнопка с стрелкой.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/dailyCaseCTA.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DailyCaseCTA from "@/components/ui/DailyCaseCTA";

describe("DailyCaseCTA", () => {
  it("рендерит дату и id кейса", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/18 апр/)).toBeInTheDocument();
    expect(screen.getByText(/hard-002/)).toBeInTheDocument();
  });

  it("показывает «Активно» индикатор если active=true", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/активно/i)).toBeInTheDocument();
  });

  it("не показывает «Активно» если active=false", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active={false}
        onStart={() => {}}
      />
    );
    expect(screen.queryByText(/активно/i)).not.toBeInTheDocument();
  });

  it("вызывает onStart при клике на CTA", () => {
    const onStart = vi.fn();
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={onStart}
      />
    );
    fireEvent.click(screen.getByLabelText("Начать диагноз дня"));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("показывает прогресс очков в подстроке", () => {
    render(
      <DailyCaseCTA
        caseDate="18 апр"
        caseId="hard-002"
        maxPoints={5000}
        currentPoints={0}
        active
        onStart={() => {}}
      />
    );
    expect(screen.getByText(/0\s*из\s*5[\s ]?000|0.{1,3}5/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- dailyCaseCTA`
Ожидаемо: FAIL.

- [ ] **Step 3: Реализация**

Создать `src/components/ui/DailyCaseCTA.tsx`:

```tsx
"use client";

interface DailyCaseCTAProps {
  caseDate: string;
  caseId: string;
  maxPoints: number;
  currentPoints: number;
  active: boolean;
  onStart: () => void;
}

const formatNumber = (n: number): string =>
  n.toLocaleString("ru-RU").replace(/,/g, " ");

export default function DailyCaseCTA({
  caseDate,
  caseId,
  maxPoints,
  currentPoints,
  active,
  onStart,
}: DailyCaseCTAProps) {
  const fillPercent =
    maxPoints > 0 ? Math.min(100, (currentPoints / maxPoints) * 100) : 0;

  return (
    <div
      className="relative rounded-3xl px-4 pt-4 pb-4 text-white overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #0F0F1A 0%, #1E1B4B 40%, #312E81 70%, #6366F1 100%)",
        boxShadow:
          "0 2px 6px rgba(49,46,129,0.4), 0 18px 40px -12px rgba(99,102,241,0.6)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          right: -50,
          top: -50,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(236,72,153,0.4), rgba(168,85,247,0.2) 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          left: -30,
          bottom: -30,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.35), transparent 70%)",
        }}
      />

      <div className="relative flex justify-between items-center mb-2">
        <div
          className="text-[9px] tracking-[0.22em] uppercase font-medium"
          style={{ color: "#C4B5FD" }}
        >
          Диагноз дня · {caseDate}
        </div>
        {active && (
          <div
            className="flex items-center gap-1.5 text-[8px] tracking-[0.15em] uppercase font-medium"
            style={{ color: "#F9A8D4" }}
          >
            <span
              className="rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#EC4899",
                boxShadow: "0 0 8px #EC4899",
              }}
            />
            Активно
          </div>
        )}
      </div>

      <div className="relative text-base font-normal tracking-tight">
        {caseId} ждёт тебя
      </div>
      <div className="relative text-[10px] text-white/65 mt-0.5">
        Клинический случай на {formatNumber(maxPoints)} очков
      </div>

      <div className="relative flex justify-between items-center mt-3.5">
        <div className="flex-1 mr-3">
          <div
            className="h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${fillPercent}%`,
                background: "linear-gradient(90deg, #A855F7, #EC4899)",
              }}
            />
          </div>
          <div className="text-[9px] text-white/55 mt-1">
            {formatNumber(currentPoints)} из {formatNumber(maxPoints)}
          </div>
        </div>
        <button
          onClick={onStart}
          aria-label="Начать диагноз дня"
          className="inline-flex items-center gap-1 bg-white text-foreground text-[9px] tracking-[0.18em] uppercase font-semibold px-3.5 py-2 rounded-full btn-press"
          style={{ boxShadow: "0 4px 12px -2px rgba(236,72,153,0.35)" }}
        >
          Начать
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- dailyCaseCTA`
Ожидаемо: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/DailyCaseCTA.tsx src/__tests__/dailyCaseCTA.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): DailyCaseCTA - premium-dark карточка Диагноза дня

Aurora-dark gradient фон, pulse-индикатор «Активно»,
points-бар с violet→pink заливкой, белая CTA-кнопка со стрелкой.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Crest компонент (ачивки)

**Files:**
- Create: `src/components/ui/Crest.tsx`
- Test: `src/__tests__/crest.test.tsx`

**Назначение:** карточка ачивки со щит-гексагоном (clip-path polygon). Два unlocked-варианта (aurora-gradient) и locked-вариант (dashed).

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/crest.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Crest from "@/components/ui/Crest";

const targetIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-label="target-icon">
    <circle cx="12" cy="12" r="10" />
  </svg>
);

describe("Crest", () => {
  it("рендерит title и sub", () => {
    render(
      <Crest
        variant="indigo-violet"
        icon={targetIcon}
        title="Первый ответ"
        sub="10 апр"
      />
    );
    expect(screen.getByText("Первый ответ")).toBeInTheDocument();
    expect(screen.getByText("10 апр")).toBeInTheDocument();
  });

  it("применяет locked-класс при variant=locked", () => {
    const { container } = render(
      <Crest
        variant="locked"
        icon={targetIcon}
        title="Streak 7 дней"
        sub="3 из 7"
      />
    );
    expect(container.querySelector(".crest-locked")).toBeTruthy();
  });

  it("не применяет locked-класс при unlocked variant", () => {
    const { container } = render(
      <Crest
        variant="violet-pink"
        icon={targetIcon}
        title="Streak 3 дня"
        sub="12 апр"
      />
    );
    expect(container.querySelector(".crest-locked")).toBeFalsy();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- crest`
Ожидаемо: FAIL.

- [ ] **Step 3: Реализация**

Создать `src/components/ui/Crest.tsx`:

```tsx
"use client";

import { ReactNode } from "react";

type CrestVariant = "indigo-violet" | "violet-pink" | "locked";

interface CrestProps {
  variant: CrestVariant;
  icon: ReactNode;
  title: string;
  sub?: string;
}

const HEX_CLIP = "polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)";

const variantColors: Record<
  Exclude<CrestVariant, "locked">,
  { from: string; to: string; shadow: string }
> = {
  "indigo-violet": {
    from: "#6366F1",
    to: "#A855F7",
    shadow: "rgba(99,102,241,0.5)",
  },
  "violet-pink": {
    from: "#A855F7",
    to: "#EC4899",
    shadow: "rgba(168,85,247,0.5)",
  },
};

export default function Crest({ variant, icon, title, sub }: CrestProps) {
  const isLocked = variant === "locked";
  const colors = !isLocked ? variantColors[variant] : null;

  return (
    <div
      className={`flex-shrink-0 w-[88px] rounded-2xl px-2 pt-3.5 pb-2.5 text-center relative overflow-hidden ${
        isLocked ? "crest-locked" : ""
      }`}
      style={{
        background: isLocked
          ? "linear-gradient(180deg, #f8f9fc 0%, #eef0f7 100%)"
          : "white",
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 6px 16px -10px rgba(99,102,241,0.18)",
      }}
    >
      <div
        className="w-11 h-11 mx-auto relative flex items-center justify-center"
      >
        {/* Background hexagon */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: HEX_CLIP,
            background: colors
              ? `linear-gradient(135deg, ${colors.from}, ${colors.to})`
              : "rgba(99,102,241,0.08)",
            border: isLocked ? "1px dashed rgba(99,102,241,0.2)" : "none",
            boxShadow: colors
              ? `0 4px 10px -3px ${colors.shadow}`
              : "none",
          }}
        />
        {/* Shine highlight (unlocked only) */}
        {!isLocked && (
          <div
            className="absolute"
            style={{
              top: "10%",
              left: "10%",
              width: "40%",
              height: "25%",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.5), transparent)",
              clipPath: "polygon(0 0, 100% 0, 70% 100%, 0 100%)",
              zIndex: 1,
            }}
          />
        )}
        <div
          className="relative z-10"
          style={{ color: isLocked ? "#A3A6B8" : "#fff" }}
        >
          {icon}
        </div>
      </div>
      <div
        className={`text-[9px] mt-2 leading-tight ${
          isLocked ? "font-medium text-muted" : "font-semibold text-foreground"
        }`}
      >
        {title}
      </div>
      {sub && (
        <div className="text-[8px] text-muted mt-0.5 tracking-wide">{sub}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- crest`
Ожидаемо: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Crest.tsx src/__tests__/crest.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): Crest - ачивка-щит в aurora-палитре

Hex-clip-path с gradient-заливкой + shine highlight + SVG-иконка.
Два unlocked варианта (indigo-violet, violet-pink) и locked
(dashed). Используется в Profile achievements carousel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: ToolRow компонент

**Files:**
- Create: `src/components/ui/ToolRow.tsx`
- Test: `src/__tests__/toolRow.test.tsx`

**Назначение:** строка инструмента для profile section «Инструменты». Left-accent полоска aurora-gradient, icon-box 36px, title/sub, опциональный chip справа, опциональный href для Link.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/toolRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ToolRow from "@/components/ui/ToolRow";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const sampleIcon = <svg aria-label="chat-icon" />;

describe("ToolRow", () => {
  it("рендерит title и sub", () => {
    render(
      <ToolRow
        accent="indigo"
        icon={sampleIcon}
        title="Консилиум"
        sub="AI-пациент ждёт приёма"
      />
    );
    expect(screen.getByText("Консилиум")).toBeInTheDocument();
    expect(screen.getByText("AI-пациент ждёт приёма")).toBeInTheDocument();
  });

  it("рендерит chip с заданным label", () => {
    render(
      <ToolRow
        accent="pink-violet"
        icon={sampleIcon}
        title="Мои ошибки"
        sub="К повтору"
        chip={{ label: "161", variant: "pink" }}
      />
    );
    expect(screen.getByText("161")).toBeInTheDocument();
  });

  it("превращается в <a> если передан href", () => {
    render(
      <ToolRow
        accent="indigo"
        icon={sampleIcon}
        title="Консилиум"
        href="/consilium"
      />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/consilium");
  });

  it("вызывает onClick если передан и нет href", () => {
    const onClick = vi.fn();
    render(
      <ToolRow
        accent="violet-pink"
        icon={sampleIcon}
        title="Экспорт"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText("Экспорт"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- toolRow`
Ожидаемо: FAIL.

- [ ] **Step 3: Реализация**

Создать `src/components/ui/ToolRow.tsx`:

```tsx
"use client";

import Link from "next/link";
import { ReactNode } from "react";

type AccentVariant = "indigo" | "indigo-violet" | "violet-pink" | "pink-violet";
type ChipVariant = "indigo" | "violet" | "pink" | "dark";

interface ToolRowProps {
  accent: AccentVariant;
  icon: ReactNode;
  title: string;
  sub?: string;
  chip?: {
    label: string | number;
    variant: ChipVariant;
  };
  href?: string;
  onClick?: () => void;
}

const accentGradients: Record<
  AccentVariant,
  { bar: string; glow: string; iconBg: string; iconColor: string }
> = {
  indigo: {
    bar: "linear-gradient(180deg, #6366F1, #A855F7)",
    glow: "rgba(99,102,241,0.4)",
    iconBg: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))",
    iconColor: "#6366F1",
  },
  "indigo-violet": {
    bar: "linear-gradient(180deg, #6366F1, #A855F7)",
    glow: "rgba(99,102,241,0.4)",
    iconBg: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.12))",
    iconColor: "#6366F1",
  },
  "violet-pink": {
    bar: "linear-gradient(180deg, #A855F7, #EC4899)",
    glow: "rgba(168,85,247,0.4)",
    iconBg: "linear-gradient(135deg, rgba(168,85,247,0.1), rgba(236,72,153,0.1))",
    iconColor: "#A855F7",
  },
  "pink-violet": {
    bar: "linear-gradient(180deg, #EC4899, #A855F7)",
    glow: "rgba(236,72,153,0.4)",
    iconBg: "linear-gradient(135deg, rgba(236,72,153,0.1), rgba(168,85,247,0.1))",
    iconColor: "#EC4899",
  },
};

const chipStyles: Record<ChipVariant, { color: string; background: string }> = {
  indigo: { color: "#6366F1", background: "rgba(99,102,241,0.08)" },
  violet: { color: "#A855F7", background: "rgba(168,85,247,0.1)" },
  pink: { color: "#EC4899", background: "rgba(236,72,153,0.1)" },
  dark: {
    color: "#fff",
    background:
      "linear-gradient(135deg, #1A1A2E 0%, #312E81 50%, #6366F1 100%)",
  },
};

export default function ToolRow({
  accent,
  icon,
  title,
  sub,
  chip,
  href,
  onClick,
}: ToolRowProps) {
  const a = accentGradients[accent];

  const inner = (
    <div
      className="relative rounded-2xl bg-white pl-3.5 pr-3.5 py-3 flex items-center gap-3 overflow-hidden btn-press"
      style={{
        border: "1px solid rgba(99,102,241,0.06)",
        boxShadow: "0 1px 2px rgba(17,24,39,0.02)",
      }}
    >
      <div
        className="absolute rounded-sm"
        style={{
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          background: a.bar,
          boxShadow: `0 0 8px ${a.glow}`,
        }}
      />
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: a.iconBg, color: a.iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground font-normal tracking-tight">
          {title}
        </div>
        {sub && (
          <div className="text-[9px] text-muted tracking-wide mt-0.5">{sub}</div>
        )}
      </div>
      {chip && (
        <div
          className="text-[9px] font-semibold tracking-wide rounded-full px-2 py-[3px]"
          style={{
            color: chipStyles[chip.variant].color,
            background: chipStyles[chip.variant].background,
            boxShadow:
              chip.variant === "dark"
                ? "0 2px 6px -1px rgba(99,102,241,0.35)"
                : undefined,
          }}
        >
          {chip.label}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left"
        type="button"
      >
        {inner}
      </button>
    );
  }
  return inner;
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- toolRow`
Ожидаемо: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ToolRow.tsx src/__tests__/toolRow.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): ToolRow - строка инструмента с aurora-accent

Left-accent gradient-полоска (4 варианта), iconBox 36px,
title/sub, опциональный chip (4 варианта), либо Link либо button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: MedMindCard компонент

**Files:**
- Create: `src/components/ui/MedMindCard.tsx`
- Test: `src/__tests__/medMindCard.test.tsx`

**Назначение:** карточка с текущим тарифом MedMind и мини-дашбордом. Aurora-gradient icon-box с brain SVG, title/tier/dates, 2-колоночная мета.

- [ ] **Step 1: Написать тест**

Создать `src/__tests__/medMindCard.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MedMindCard from "@/components/ui/MedMindCard";

describe("MedMindCard", () => {
  it("рендерит title и tier", () => {
    render(
      <MedMindCard
        title="Максимальное вовлечение"
        tier="Активно до 17 апреля 2027"
        stats={[
          { label: "Осталось", value: "364 дня" },
          { label: "Этот месяц", value: "14 подсказок" },
        ]}
      />
    );
    expect(screen.getByText("Максимальное вовлечение")).toBeInTheDocument();
    expect(screen.getByText(/Активно до 17 апреля 2027/)).toBeInTheDocument();
  });

  it("рендерит все stat pairs", () => {
    render(
      <MedMindCard
        title="Pro"
        tier="Активно"
        stats={[
          { label: "Осталось", value: "364 дня" },
          { label: "Этот месяц", value: "14 подсказок" },
        ]}
      />
    );
    expect(screen.getByText("Осталось")).toBeInTheDocument();
    expect(screen.getByText("364 дня")).toBeInTheDocument();
    expect(screen.getByText("Этот месяц")).toBeInTheDocument();
    expect(screen.getByText("14 подсказок")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить, убедиться что падает**

Команда: `npm test -- medMindCard`
Ожидаемо: FAIL.

- [ ] **Step 3: Реализация**

Создать `src/components/ui/MedMindCard.tsx`:

```tsx
"use client";

interface MedMindCardProps {
  title: string;
  tier: string;
  stats: Array<{ label: string; value: string }>;
}

export default function MedMindCard({ title, tier, stats }: MedMindCardProps) {
  return (
    <div
      className="aurora-hairline relative rounded-2xl bg-white p-3.5 overflow-hidden"
      style={{
        border: "1px solid rgba(99,102,241,0.12)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.03), 0 14px 30px -16px rgba(99,102,241,0.3)",
      }}
    >
      <div
        className="absolute pointer-events-none"
        style={{
          top: 0,
          right: 0,
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle at 100% 0%, rgba(236,72,153,0.15), rgba(168,85,247,0.12) 40%, transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-2.5 mb-2.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
            boxShadow: "0 4px 12px -2px rgba(168,85,247,0.5)",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z"/>
          </svg>
        </div>
        <div>
          <div className="text-xs text-foreground font-medium">{title}</div>
          <div
            className="text-[9px] tracking-wide mt-0.5 font-medium"
            style={{ color: "#A855F7" }}
          >
            {tier}
          </div>
        </div>
      </div>

      <div
        className="relative grid grid-cols-2 gap-2.5 pt-2.5"
        style={{ borderTop: "1px solid rgba(99,102,241,0.08)" }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div className="text-[8px] tracking-[0.15em] uppercase text-muted font-medium">
              {s.label}
            </div>
            <div className="text-[11px] text-foreground mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Запустить тест**

Команда: `npm test -- medMindCard`
Ожидаемо: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/MedMindCard.tsx src/__tests__/medMindCard.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): MedMindCard - мини-дашборд подписки

Aurora-hairline карточка с brain SVG icon (aurora gradient),
title/tier, 2-колоночная meta-строка. Используется в Profile.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Обновить StreakBadge под aurora-chip

**Files:**
- Modify: `src/components/ui/StreakBadge.tsx`
- Test: `src/__tests__/streakBadge.test.tsx` (может не существовать, создать)

**Назначение:** превратить StreakBadge в aurora-streak-chip: маленькое conic-кольцо со streak-числом внутри + «N дней» / «Streak» label рядом.

- [ ] **Step 1: Прочитать текущий StreakBadge**

Команда: `cat src/components/ui/StreakBadge.tsx`
Посмотреть текущую сигнатуру (props, что он принимает).

- [ ] **Step 2: Написать тест**

Создать `src/__tests__/streakBadge.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useProgress hook - StreakBadge может его использовать
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({
    progress: {
      streakCurrent: 1,
      streakBest: 4,
      xp: 1934,
      cardsSeen: 154,
      cardsCorrect: 62,
      recentAnswers: [],
    },
  }),
}));

import StreakBadge from "@/components/ui/StreakBadge";

describe("StreakBadge", () => {
  it("рендерит число streak", () => {
    render(<StreakBadge />);
    expect(screen.getAllByText(/1/)[0]).toBeInTheDocument();
  });

  it("рендерит label Streak", () => {
    render(<StreakBadge />);
    expect(screen.getByText(/Streak/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Запустить тест, увидеть что падает (или проходит частично)**

Команда: `npm test -- streakBadge`
Ожидаемо: либо FAIL (если в текущем виде лейбл «Streak» не рендерится), либо PASS при совпадении.

- [ ] **Step 4: Переписать StreakBadge**

Полностью заменить содержимое `src/components/ui/StreakBadge.tsx`:

```tsx
"use client";

import { useProgress } from "@/hooks/useProgress";

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

/**
 * Aurora-chip с mini conic-кольцом streak-а + "N дней" label.
 * Используется в TopBar.
 */
export default function StreakBadge() {
  const { progress } = useProgress();
  const streak = progress.streakCurrent ?? 0;
  const best = progress.streakBest ?? 0;
  const percent = best > 0 ? Math.min(100, (streak / Math.max(best, 7)) * 100) : 0;

  return (
    <div
      className="inline-flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white"
      style={{
        border: "1px solid rgba(99,102,241,0.15)",
        boxShadow:
          "0 1px 2px rgba(17,24,39,0.04), 0 6px 18px -8px rgba(99,102,241,0.3)",
      }}
    >
      <div
        className="rounded-full"
        style={{
          width: 20,
          height: 20,
          padding: 2,
          background: `conic-gradient(
            from -90deg,
            #6366F1,
            #A855F7,
            #EC4899 ${percent}%,
            rgba(99,102,241,0.1) ${percent}%
          )`,
        }}
      >
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
          <span className="text-[9px] font-semibold text-foreground">
            {streak}
          </span>
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium text-foreground">
          {streak} {pluralDay(streak)}
        </span>
        <span className="text-[8px] tracking-[0.15em] uppercase text-muted">
          Streak
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Запустить тест**

Команда: `npm test -- streakBadge`
Ожидаемо: `2 passed`.

- [ ] **Step 6: Запустить все тесты, убедиться что ничего не сломалось**

Команда: `npm test`
Ожидаемо: все тесты проходят. Если есть падения (что-то использовало старый StreakBadge) - проверить и починить.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/StreakBadge.tsx src/__tests__/streakBadge.test.tsx
git commit -m "$(cat <<'EOF'
refactor(ui): StreakBadge - aurora-chip с conic-кольцом

Mini 20px conic-gradient кольцо со streak-числом внутри
+ «N дней» / «Streak» в две строки. Используется в TopBar.
Добавлен тест.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Обновить TopBar под aurora

**Files:**
- Modify: `src/components/ui/TopBar.tsx`

**Назначение:** переделать TopBar - brand-dot + текст, справа StreakBadge + settings-btn, ModeSwitch по центру второй строкой, опциональный `premium` prop для aurora-welcome-band под topbar.

- [ ] **Step 1: Прочитать текущий TopBar**

Команда: `cat src/components/ui/TopBar.tsx`

- [ ] **Step 2: Найти где используется TopBar**

Команда: `grep -rn "import TopBar" src/app src/components`
Запомнить все места. Prop-signature не меняется по умолчанию (добавляем опциональные `premium`, `showSettings`), backward-compat.

- [ ] **Step 3: Переписать TopBar**

Полностью заменить содержимое `src/components/ui/TopBar.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import StreakBadge from "./StreakBadge";
import ModeSwitch from "./ModeSwitch";

interface TopBarProps {
  showBack?: boolean;
  /** Если true - показывает aurora-welcome-band под topbar. Для premium-страниц (/profile, /subscription, etc). */
  premium?: boolean;
  /** Если true - показывает settings-btn справа. По умолчанию false. */
  showSettings?: boolean;
  /** Handler клика на settings-btn. */
  onSettingsClick?: () => void;
}

export default function TopBar({
  showBack = false,
  premium = false,
  showSettings = false,
  onSettingsClick,
}: TopBarProps) {
  const router = useRouter();

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.82)",
          borderBottom: "1px solid rgba(99,102,241,0.08)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Subtle aurora bg under topbar */}
        {premium && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(240px 80px at 15% 100%, rgba(99,102,241,0.12), transparent 70%), radial-gradient(240px 80px at 85% 100%, rgba(236,72,153,0.08), transparent 70%)",
            }}
          />
        )}

        <div className="relative max-w-lg mx-auto px-4 py-2.5">
          <div className="flex justify-between items-center gap-2">
            {showBack ? (
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-xs uppercase tracking-[0.15em] text-muted hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Назад
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-[2px]"
                  style={{
                    background: "linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                    boxShadow: "0 0 0 1px rgba(99,102,241,0.2)",
                  }}
                />
                <span className="text-[10px] tracking-[0.22em] uppercase text-foreground font-medium">
                  Умный Врач
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <StreakBadge />
              {showSettings && (
                <button
                  onClick={onSettingsClick}
                  aria-label="Настройки"
                  className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-muted"
                  style={{
                    borderColor: "rgba(99,102,241,0.08)",
                    boxShadow: "0 1px 2px rgba(17,24,39,0.04)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {!showBack && (
            <div className="flex justify-center mt-2">
              <ModeSwitch />
            </div>
          )}
        </div>
      </header>
      {/* Aurora welcome band - под topbar, только для premium */}
      {premium && <div className="aurora-welcome-band fixed top-[88px] left-0 right-0 z-40" />}
    </>
  );
}
```

- [ ] **Step 4: Запустить все тесты**

Команда: `npm test`
Ожидаемо: все тесты проходят. Если какой-то тест упал - проверить совместимость (добавлен ли `premium` в props, не сломан ли layout).

- [ ] **Step 5: Визуальная проверка на dev-server**

Команда: `npm run dev`
Открыть `http://localhost:3000/feed` в браузере. TopBar должен быть: brand-mark слева, StreakBadge справа, ModeSwitch по центру второй строкой. Никаких ошибок в консоли.
Остановить dev-server (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/TopBar.tsx
git commit -m "$(cat <<'EOF'
refactor(ui): TopBar - aurora brand-dot, StreakBadge, welcome-band

Brand dot + «Умный Врач» слева, StreakBadge + опциональный
settings-btn справа, ModeSwitch по центру второй строкой.
Новый prop premium=true показывает aurora-welcome-band под topbar.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Обновить BottomNav под aurora

**Files:**
- Modify: `src/components/ui/BottomNav.tsx`

**Назначение:** активная вкладка получает aurora 3-stop gradient pill с shadow. Иконки остаются stroke SVG. Label для активной - aurora-violet.

- [ ] **Step 1: Переписать BottomNav**

Полностью заменить содержимое `src/components/ui/BottomNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMode } from "@/contexts/ModeContext";
import { useProgress } from "@/hooks/useProgress";
import { getFeedMistakes } from "@/lib/mistakes";
import { demoCards } from "@/data/cards";
import { useMemo, type ReactNode } from "react";

interface TabDef {
  href: string;
  label: string;
  icon: ReactNode;
}

const gridIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const errorIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M15 9l-6 6" />
    <path d="M9 9l6 6" />
  </svg>
);

const listIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const stationIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

const userIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const checkIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const caseIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const feedTabs: TabDef[] = [
  { href: "/feed", label: "Лента", icon: gridIcon },
  { href: "/daily-case", label: "Диагноз", icon: caseIcon },
  { href: "/mistakes", label: "Ошибки", icon: errorIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

const prepTabs: TabDef[] = [
  { href: "/tests", label: "Тесты", icon: listIcon },
  { href: "/cases", label: "Задачи", icon: checkIcon },
  { href: "/mistakes", label: "Ошибки", icon: errorIcon },
  { href: "/stations", label: "Станции", icon: stationIcon },
  { href: "/profile", label: "Профиль", icon: userIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { progress } = useProgress();
  const { mode } = useMode();
  const mistakeCount = useMemo(
    () => getFeedMistakes(progress, demoCards).length,
    [progress]
  );

  const tabs = mode === "feed" ? feedTabs : prepTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(255,255,255,0.85)",
        borderTop: "1px solid rgba(99,102,241,0.08)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-2 py-1 btn-press"
            >
              <span
                className="relative flex items-center justify-center rounded-[9px]"
                style={{
                  width: 34,
                  height: 26,
                  background: isActive
                    ? "linear-gradient(135deg, #6366F1 0%, #A855F7 55%, #EC4899 100%)"
                    : "transparent",
                  color: isActive ? "#fff" : "#94a3b8",
                  boxShadow: isActive
                    ? "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(99,102,241,0.4), 0 8px 18px -6px rgba(168,85,247,0.55)"
                    : "none",
                }}
              >
                {tab.icon}
                {tab.href === "/mistakes" && mistakeCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center text-white text-[8px] font-bold rounded-full px-0.5"
                    style={{ background: "#EC4899" }}
                  >
                    {mistakeCount > 99 ? "99+" : mistakeCount}
                  </span>
                )}
              </span>
              <span
                className="text-[8.5px] font-semibold tracking-wide"
                style={{ color: isActive ? "#A855F7" : "#94a3b8" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Запустить все тесты**

Команда: `npm test`
Ожидаемо: все тесты проходят.

- [ ] **Step 3: Визуальная проверка**

Команда: `npm run dev`
Открыть `http://localhost:3000/feed`, `http://localhost:3000/profile`. Активная вкладка должна иметь aurora 3-stop gradient pill. Остановить dev-server.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/BottomNav.tsx
git commit -m "$(cat <<'EOF'
refactor(ui): BottomNav - aurora 3-stop gradient pill на активной

Активная вкладка получает gradient indigo→violet→pink
в 34x26 pill с inset highlight + aurora shadow. Label-color
для активной - aurora-violet. Размер иконок 18px.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Обновить ExamReadiness (trend + weak topics)

**Files:**
- Modify: `src/components/analytics/ExamReadiness.tsx`

**Назначение:** добавить опциональные props `trend` и `weakTopics`, отрисовать их в aurora-стиле (trend-arrow в индиго, weak-topic chips в пинке).

- [ ] **Step 1: Прочитать текущий ExamReadiness**

Команда: `cat src/components/analytics/ExamReadiness.tsx`
Изучить текущую структуру - рендер %, прогресс-бар, footer.

- [ ] **Step 2: Обновить компонент**

В `src/components/analytics/ExamReadiness.tsx` - добавить новые опциональные props и отрисовку. Конкретные правки:

- В интерфейс пропов добавить:
  ```ts
  interface ExamReadinessProps {
    /** Существующие props, не трогать */
    /** Тренд изменения за период, опционально */
    trend?: { delta: number; period: string };
    /** Слабые темы (топ-3), опционально */
    weakTopics?: Array<{ name: string; percent: number }>;
  }
  ```

- В render, после прогресс-бара, если `trend` передан - отрисовать блок:
  ```tsx
  {trend && (
    <div
      className="flex items-center gap-1 mt-2 text-[9px] font-semibold tracking-wide"
      style={{ color: "#6366F1" }}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {trend.delta >= 0 ? (
          <>
            <polyline points="17 6 23 6 23 12" />
            <polyline points="1 18 7 12 13 18 23 6" />
          </>
        ) : (
          <>
            <polyline points="17 18 23 18 23 12" />
            <polyline points="1 6 7 12 13 6 23 18" />
          </>
        )}
      </svg>
      {trend.delta >= 0 ? `+${trend.delta}%` : `${trend.delta}%`} {trend.period}
    </div>
  )}
  ```

- Если `weakTopics` передан и не пустой - отрисовать pink chips:
  ```tsx
  {weakTopics && weakTopics.length > 0 && (
    <div className="flex gap-1.5 mt-2.5 flex-wrap">
      {weakTopics.map((t) => (
        <span
          key={t.name}
          className="text-[8.5px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(236,72,153,0.08)", color: "#EC4899" }}
        >
          {t.name} {t.percent}%
        </span>
      ))}
    </div>
  )}
  ```

Если компонент меньше указанных блоков или структура отличается - адаптировать в том же духе: **новые блоки не ломают старый рендер, только дополняют его когда props переданы**.

- [ ] **Step 3: Запустить все тесты**

Команда: `npm test`
Ожидаемо: все проходят.

- [ ] **Step 4: Commit**

```bash
git add src/components/analytics/ExamReadiness.tsx
git commit -m "$(cat <<'EOF'
feat(analytics): ExamReadiness - опциональные trend + weak-topics

Добавляет опциональные props trend и weakTopics.
Рендерит aurora-индиго стрелку с дельтой и pink-chips
для топ-3 слабых тем. Старый рендер сохраняется, новые блоки
показываются только при передаче props.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: useProfilePageData hook

**Files:**
- Create: `src/hooks/useProfilePageData.ts`
- Test: `src/__tests__/useProfilePageData.test.ts`

**Назначение:** один хук собирает все данные для Profile: weekly pattern, reviews due, accuracy trend, days in product, unique topics, days left on sub, hints this month, level + next level XP. Параллельные запросы к Supabase + чтение существующих хуков.

- [ ] **Step 1: Проверить существующие хуки**

Команда: `ls src/hooks/`
Команда: `cat src/hooks/useGamification.ts | head -40`
Команда: `cat src/hooks/useSubscription.ts | head -40`
Понять, какие данные уже есть (XP, streak, accuracy, isPro) и какие нужно дозапросить.

- [ ] **Step 2: Написать тест**

Создать `src/__tests__/useProfilePageData.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Mock Supabase client
const fromMock = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({
    from: fromMock,
    auth: {
      getUser: async () => ({
        data: { user: { id: "test-user-id" } },
      }),
    },
  }),
  isSupabaseConfigured: () => true,
}));

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      created_at: "2026-04-10T00:00:00Z",
    },
  }),
}));

import { useProfilePageData } from "@/hooks/useProfilePageData";

describe("useProfilePageData", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("возвращает loading=true сразу после маунта", () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ data: [], error: null }),
          count: Promise.resolve({ count: 0, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProfilePageData());
    expect(result.current.loading).toBe(true);
  });

  it("считает days in product от created_at", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          gte: () => Promise.resolve({ data: [], error: null }),
          count: Promise.resolve({ count: 0, error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useProfilePageData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // today=2026-04-18, created=2026-04-10 → 8 days
    expect(result.current.daysInProduct).toBeGreaterThanOrEqual(7);
    expect(result.current.daysInProduct).toBeLessThanOrEqual(9);
  });
});
```

- [ ] **Step 3: Запустить тест, убедиться что падает**

Команда: `npm test -- useProfilePageData`
Ожидаемо: FAIL - "Failed to resolve import".

- [ ] **Step 4: Написать реализацию**

Создать `src/hooks/useProfilePageData.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { WeekDay } from "@/components/ui/StreakHero";

interface ProfilePageData {
  loading: boolean;
  /** Активность за последние 7 дней (pn-vs) для sparkline */
  weekPattern: WeekDay[];
  /** Сколько карточек к повтору сейчас (FSRS due) */
  reviewsDue: number;
  /** Точность за текущую неделю минус за прошлую (дельта в % пунктах) */
  accuracyTrend: number | null;
  /** Дней в продукте от created_at */
  daysInProduct: number;
  /** Кол-во уникальных card_id в user_answers */
  uniqueTopicsCount: number;
  /** Всего ответов за всё время (len user_answers) */
  totalAnswers: number;
  /** Сколько AI-подсказок использовано в этом месяце */
  hintsThisMonth: number;
  /** Сколько карточек отвечено сегодня */
  cardsToday: number;
}

const EMPTY: ProfilePageData = {
  loading: true,
  weekPattern: [],
  reviewsDue: 0,
  accuracyTrend: null,
  daysInProduct: 0,
  uniqueTopicsCount: 0,
  totalAnswers: 0,
  hintsThisMonth: 0,
  cardsToday: 0,
};

const WEEK_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** JS Date.getDay() возвращает 0 для вс - нормализуем в пн=0, вс=6 */
function getDayIndex(d: Date): number {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function startOfWeek(d: Date): Date {
  const idx = getDayIndex(d);
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - idx);
  return result;
}

function startOfMonth(d: Date): Date {
  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  result.setDate(1);
  return result;
}

export function useProfilePageData(): ProfilePageData {
  const { user } = useAuth();
  const [data, setData] = useState<ProfilePageData>(EMPTY);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) {
      setData({ ...EMPTY, loading: false });
      return;
    }

    let cancelled = false;
    const supabase = getSupabase();
    const userId = user.id;

    const today = new Date();
    const weekStart = startOfWeek(today);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const monthStart = startOfMonth(today);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    async function load() {
      try {
        const [
          answersThisWeek,
          answersLastWeek,
          totalAnswersRow,
          uniqueCards,
          reviewsDueRow,
          hintsRow,
          todayCards,
        ] = await Promise.all([
          // Ответы за эту неделю (для sparkline + точности)
          supabase
            .from("user_answers")
            .select("answered_at, is_correct")
            .eq("user_id", userId)
            .gte("answered_at", weekStart.toISOString()),
          // Ответы за прошлую неделю (для accuracy trend)
          supabase
            .from("user_answers")
            .select("is_correct")
            .eq("user_id", userId)
            .gte("answered_at", lastWeekStart.toISOString())
            .lt("answered_at", weekStart.toISOString()),
          // Всего ответов
          supabase
            .from("user_answers")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          // Уникальные карточки
          supabase
            .from("user_answers")
            .select("card_id")
            .eq("user_id", userId),
          // Reviews due
          supabase
            .from("review_cards")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .lte("due", new Date().toISOString()),
          // Hints в этом месяце
          supabase
            .from("ai_usage_log")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("created_at", monthStart.toISOString()),
          // Карточек сегодня
          supabase
            .from("user_answers")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .gte("answered_at", todayStart.toISOString()),
        ]);

        if (cancelled) return;

        // Weekly pattern
        const thisWeekAnswers =
          (answersThisWeek.data as Array<{ answered_at: string; is_correct: boolean }> | null) ?? [];
        const dayCounts = new Array(7).fill(0);
        for (const row of thisWeekAnswers) {
          const idx = getDayIndex(new Date(row.answered_at));
          dayCounts[idx]++;
        }
        const maxActivity = Math.max(1, ...dayCounts);
        const todayIdx = getDayIndex(today);
        const weekPattern: WeekDay[] = WEEK_LABELS.map((label, i) => ({
          label,
          activity: dayCounts[i] / maxActivity,
          isToday: i === todayIdx,
        }));

        // Accuracy trend
        const thisCorrect = thisWeekAnswers.filter((r) => r.is_correct).length;
        const thisTotal = thisWeekAnswers.length;
        const thisAcc = thisTotal > 0 ? (thisCorrect / thisTotal) * 100 : 0;
        const lastWeekAnswers =
          (answersLastWeek.data as Array<{ is_correct: boolean }> | null) ?? [];
        const lastCorrect = lastWeekAnswers.filter((r) => r.is_correct).length;
        const lastTotal = lastWeekAnswers.length;
        const lastAcc = lastTotal > 0 ? (lastCorrect / lastTotal) * 100 : 0;
        const accuracyTrend =
          lastTotal > 0 && thisTotal > 0
            ? Math.round(thisAcc - lastAcc)
            : null;

        // Unique cards count
        const allCardIds =
          (uniqueCards.data as Array<{ card_id: string }> | null) ?? [];
        const uniqueTopicsCount = new Set(allCardIds.map((r) => r.card_id)).size;

        // Days in product
        const createdAt = user.created_at
          ? new Date(user.created_at)
          : today;
        const daysInProduct = Math.max(1, daysBetween(createdAt, today));

        setData({
          loading: false,
          weekPattern,
          reviewsDue: reviewsDueRow.count ?? 0,
          accuracyTrend,
          daysInProduct,
          uniqueTopicsCount,
          totalAnswers: totalAnswersRow.count ?? 0,
          hintsThisMonth: hintsRow.count ?? 0,
          cardsToday: todayCards.count ?? 0,
        });
      } catch (err) {
        console.warn("[useProfilePageData] failed:", err);
        if (!cancelled) {
          setData({ ...EMPTY, loading: false });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.created_at]);

  return data;
}
```

- [ ] **Step 5: Запустить тест**

Команда: `npm test -- useProfilePageData`
Ожидаемо: `2 passed`. Если тесты падают на других нюансах (mock structure) - подкрутить mock.

- [ ] **Step 6: Запустить все тесты**

Команда: `npm test`
Ожидаемо: всё проходит.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useProfilePageData.ts src/__tests__/useProfilePageData.test.ts
git commit -m "$(cat <<'EOF'
feat(hooks): useProfilePageData - агрегация данных для Profile

Параллельные запросы к Supabase: weekly pattern (pn-vs),
accuracy trend (this week vs last week), reviews due,
hints this month, days in product, unique topics,
cards today. Graceful при отсутствии Supabase-env.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Рефактор FeedProfile.tsx

**Files:**
- Modify: `src/components/profile/FeedProfile.tsx` (полный рефактор)
- Test: `src/__tests__/feedProfile.test.tsx` (создать)

**Назначение:** собрать profile из новых примитивов по композиции из спеки. TopBar (premium), identity-hero с AvatarStack, XpProgress, StreakHero + AccuracyRing duo, 4× StatTile, DailyCaseCTA, 5× Crest horizontal scroll, ExamReadiness, 3× ToolRow, MedMindCard, AuthSection.

- [ ] **Step 1: Прочитать текущий FeedProfile для сравнения**

Команда: `cat src/components/profile/FeedProfile.tsx`
Заметить какие данные берутся откуда (useGamification, useAuth, useSubscription, props).

- [ ] **Step 2: Написать интеграционный тест**

Создать `src/__tests__/feedProfile.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock all hooks/services used by FeedProfile
vi.mock("@/hooks/useGamification", () => ({
  useGamification: () => ({
    progress: {
      xp: 1934,
      streakCurrent: 1,
      streakBest: 4,
      cardsSeen: 154,
      cardsCorrect: 62,
      recentAnswers: [],
    },
    achievements: [
      { id: "first-answer", title: "Первый ответ", unlocked: true, unlockedAt: "2026-04-10" },
      { id: "streak-3", title: "Streak 3 дня", unlocked: true, unlockedAt: "2026-04-12" },
      { id: "streak-7", title: "Streak 7 дней", unlocked: false },
      { id: "correct-100", title: "100 правильных", unlocked: false },
      { id: "accuracy-80", title: "Точность 80%", unlocked: false },
    ],
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      email: "vpogodin58@gmail.com",
      created_at: "2026-04-10T00:00:00Z",
      user_metadata: { nickname: "vadim58" },
    },
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isPro: true,
    tier: "accred_extreme",
    currentPeriodEnd: "2027-04-17T00:00:00Z",
  }),
}));

vi.mock("@/hooks/useProfilePageData", () => ({
  useProfilePageData: () => ({
    loading: false,
    weekPattern: [
      { label: "Пн", activity: 0.5, isToday: false },
      { label: "Вт", activity: 0, isToday: false },
      { label: "Ср", activity: 0.7, isToday: false },
      { label: "Чт", activity: 0.9, isToday: false },
      { label: "Пт", activity: 0.8, isToday: false },
      { label: "Сб", activity: 0, isToday: false },
      { label: "Вс", activity: 0, isToday: true },
    ],
    reviewsDue: 161,
    accuracyTrend: 3,
    daysInProduct: 8,
    uniqueTopicsCount: 78,
    totalAnswers: 218,
    hintsThisMonth: 14,
    cardsToday: 4,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/medmind/SavedContentLibrary", () => ({
  default: () => null,
}));

vi.mock("@/components/profile/AuthSection", () => ({
  default: () => <div data-testid="auth-section" />,
}));

vi.mock("@/components/profile/ProfileSheet", () => ({
  default: () => null,
}));

vi.mock("@/components/analytics/ExamReadiness", () => ({
  default: () => <div data-testid="exam-readiness" />,
}));

import FeedProfile from "@/components/profile/FeedProfile";

describe("FeedProfile", () => {
  it("рендерит приветствие", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/С возвращением/i)).toBeInTheDocument();
  });

  it("рендерит никнейм", () => {
    render(<FeedProfile />);
    expect(screen.getByText("vadim58")).toBeInTheDocument();
  });

  it("рендерит PRO-pill", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/PRO/)).toBeInTheDocument();
  });

  it("рендерит aurora-число streak-а", () => {
    render(<FeedProfile />);
    // streak=1, точное совпадение может быть в нескольких местах, проверяем наличие
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("рендерит точность из прогресса", () => {
    render(<FeedProfile />);
    // 62/154 ≈ 40%
    expect(screen.getByText(/40%/)).toBeInTheDocument();
  });

  it("рендерит 4 stat-tiles с нужными label-ами", () => {
    render(<FeedProfile />);
    expect(screen.getByText("Ответов")).toBeInTheDocument();
    expect(screen.getByText("Тем")).toBeInTheDocument();
    expect(screen.getByText("К повтору")).toBeInTheDocument();
    expect(screen.getByText("В продукте")).toBeInTheDocument();
  });

  it("рендерит DailyCaseCTA section", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/Диагноз дня/)).toBeInTheDocument();
  });

  it("рендерит Инструменты section", () => {
    render(<FeedProfile />);
    expect(screen.getByText("Консилиум")).toBeInTheDocument();
    expect(screen.getByText(/Мои ошибки/)).toBeInTheDocument();
  });

  it("рендерит MedMind-секцию для Pro юзера", () => {
    render(<FeedProfile />);
    expect(screen.getByText(/MedMind/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Запустить тест, убедиться что падает**

Команда: `npm test -- feedProfile`
Ожидаемо: FAIL (много пунктов не находятся - мы ещё не переписали FeedProfile).

- [ ] **Step 4: Полностью переписать FeedProfile.tsx**

Заменить содержимое `src/components/profile/FeedProfile.tsx` на:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import AvatarStack from "@/components/ui/AvatarStack";
import XpProgress from "@/components/ui/XpProgress";
import StreakHero from "@/components/ui/StreakHero";
import AccuracyRing from "@/components/ui/AccuracyRing";
import StatTile from "@/components/ui/StatTile";
import DailyCaseCTA from "@/components/ui/DailyCaseCTA";
import Crest from "@/components/ui/Crest";
import ToolRow from "@/components/ui/ToolRow";
import MedMindCard from "@/components/ui/MedMindCard";
import ProfileSheet from "@/components/profile/ProfileSheet";
import AuthSection from "@/components/profile/AuthSection";
import ExamReadiness from "@/components/analytics/ExamReadiness";
import SavedContentLibrary from "@/components/medmind/SavedContentLibrary";

import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useProfilePageData } from "@/hooks/useProfilePageData";

const TIER_LABELS: Record<string, string> = {
  feed_helper: "Помощник ленты",
  accred_basic: "Базовый",
  accred_mentor: "Наставник",
  accred_tutor: "Репетитор",
  accred_extreme: "Максимальное вовлечение",
};

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

function formatExpiration(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `Активно до ${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

// Ачивки: mapping из id в aurora-variant + SVG icon
const TARGET_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
const FLAME_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);
const LOCK_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const CHAT_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const BOOK_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const ALERT_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

export default function FeedProfile() {
  const router = useRouter();
  const { progress, achievements } = useGamification();
  const { user } = useAuth();
  const { isPro, tier, currentPeriodEnd } = useSubscription();
  const pageData = useProfilePageData();
  const [sheetKind, setSheetKind] = useState<"settings" | "styles" | "companion" | null>(null);

  const accuracy =
    progress.cardsSeen > 0
      ? Math.round((progress.cardsCorrect / progress.cardsSeen) * 100)
      : 0;

  const nickname =
    (user?.user_metadata as { nickname?: string })?.nickname ||
    user?.email?.split("@")[0] ||
    "Доктор";

  const avatarLetter = nickname[0]?.toUpperCase() ?? "Д";

  // Level calculation (простое правило, настроится в будущем через useGamification)
  const currentLevel = progress.xp >= 3000 ? "Врач" : progress.xp >= 500 ? "Ординатор II" : "Студент";
  const nextLevel = currentLevel === "Врач" ? "Профессор" : currentLevel === "Ординатор II" ? "Врач" : "Ординатор";
  const nextLevelXp = currentLevel === "Врач" ? 10000 : currentLevel === "Ординатор II" ? 2071 : 500;

  const todayActivityPercent =
    pageData.cardsToday > 0 ? Math.min(100, (pageData.cardsToday / 10) * 100) : 0;

  const tierLabel = tier ? TIER_LABELS[tier] ?? tier : "Pro";

  const daysLeftSub = currentPeriodEnd
    ? daysBetween(new Date(), new Date(currentPeriodEnd))
    : null;

  // Для DailyCaseCTA - сегодняшняя дата в ru формате
  const today = new Date();
  const todayFmt = today.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

  // Prepare top 5 achievements for carousel
  const topAchievements = achievements.slice(0, 5);

  return (
    <>
      {/* Settings button top-right (sticky absolute-ish) */}
      <div className="px-6 pt-2 flex justify-end">
        <button
          onClick={() => setSheetKind("settings")}
          aria-label="Настройки"
          className="w-9 h-9 rounded-full bg-white border flex items-center justify-center text-muted btn-press"
          style={{ borderColor: "rgba(99,102,241,0.1)", boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Identity hero */}
      <div className="px-6 pt-2 pb-4 flex flex-col items-center">
        <div className="text-[10px] tracking-[0.25em] uppercase text-muted font-medium mb-4">
          С возвращением
        </div>
        <AvatarStack
          initial={avatarLetter}
          size={128}
          verified={isPro}
          activityLabel={pageData.cardsToday > 0 ? `${pageData.cardsToday} сегодня` : undefined}
          activityPercent={todayActivityPercent}
        />
        <div className="text-[22px] font-light tracking-tight text-foreground mt-5">
          {nickname}
        </div>
        <div className="text-[10px] text-muted mt-1 tracking-wide">
          {user?.email}
        </div>
        <div className="flex gap-1.5 mt-3.5 flex-wrap justify-center">
          {isPro && (
            <span
              className="text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full text-white font-medium"
              style={{
                background: "linear-gradient(135deg, #1A1A2E 0%, #312E81 50%, #6366F1 100%)",
                boxShadow: "0 2px 6px rgba(49,46,129,0.3), 0 8px 18px -6px rgba(99,102,241,0.45)",
              }}
            >
              PRO · {tierLabel}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 rounded-full bg-white text-foreground font-medium"
            style={{ border: "1px solid rgba(99,102,241,0.15)", boxShadow: "0 1px 2px rgba(17,24,39,0.04)" }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #6366F1, #A855F7)" }}
            />
            {currentLevel}
          </span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-6 mb-4">
        <XpProgress
          current={progress.xp ?? 0}
          target={nextLevelXp}
          currentLevel={currentLevel}
          nextLevel={nextLevel}
        />
      </div>

      {/* Streak + Accuracy duo */}
      <div className="px-6 grid grid-cols-[1.3fr_1fr] gap-2.5 mb-3">
        <StreakHero
          currentStreak={progress.streakCurrent ?? 0}
          bestStreak={progress.streakBest ?? 0}
          weekPattern={pageData.weekPattern}
        />
        <AccuracyRing
          percent={accuracy}
          fraction={`${progress.cardsCorrect}/${progress.cardsSeen}`}
          trend={
            pageData.accuracyTrend !== null
              ? { delta: pageData.accuracyTrend, period: "за неделю" }
              : undefined
          }
        />
      </div>

      {/* 4 stat-tiles */}
      <div className="px-6 grid grid-cols-4 gap-1.5 mb-4">
        <StatTile value={pageData.totalAnswers} label="Ответов" />
        <StatTile value={pageData.uniqueTopicsCount} label="Тем" />
        <StatTile value={pageData.reviewsDue} label="К повтору" accent />
        <StatTile value={`${pageData.daysInProduct}${pluralDay(pageData.daysInProduct).charAt(0)}`} label="В продукте" />
      </div>

      {/* Daily Case CTA */}
      <div className="px-6 mb-5">
        <DailyCaseCTA
          caseDate={todayFmt}
          caseId="hard-002"
          maxPoints={5000}
          currentPoints={0}
          active
          onStart={() => router.push("/daily-case")}
        />
      </div>

      {/* Achievements */}
      <div className="px-6 flex justify-between items-baseline mb-2.5">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Достижения · {topAchievements.filter((a) => a.unlocked).length} из {achievements.length}
        </span>
        <a href="/achievements" className="text-[9px] text-primary font-medium">
          Все →
        </a>
      </div>
      <div className="pl-6 pr-0 flex gap-2 overflow-x-auto mb-5 no-scrollbar">
        {topAchievements.map((a, i) => {
          if (!a.unlocked) {
            return (
              <Crest
                key={a.id}
                variant="locked"
                icon={LOCK_SVG}
                title={a.title}
                sub="не открыто"
              />
            );
          }
          const variant: "indigo-violet" | "violet-pink" = i % 2 === 0 ? "indigo-violet" : "violet-pink";
          const icon = i === 0 ? TARGET_SVG : FLAME_SVG;
          return (
            <Crest
              key={a.id}
              variant={variant}
              icon={icon}
              title={a.title}
              sub={
                a.unlockedAt
                  ? new Date(a.unlockedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Exam readiness */}
      <div className="px-6 mb-2.5 flex justify-between items-baseline">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Готовность к экзамену
        </span>
      </div>
      <div className="px-6 mb-5">
        <ExamReadiness />
      </div>

      {/* Tools section */}
      <div className="px-6 mb-2.5">
        <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
          Инструменты
        </span>
      </div>
      <div className="px-6 flex flex-col gap-2 mb-5">
        <ToolRow
          accent="indigo"
          icon={CHAT_SVG}
          title="Консилиум"
          sub="AI-пациент ждёт приёма"
          chip={{ label: "Pro", variant: "dark" }}
          href="/consilium"
        />
        <ToolRow
          accent="indigo-violet"
          icon={BOOK_SVG}
          title="Моя библиотека"
          sub="Сохранённые AI-объяснения"
          chip={{ label: "2", variant: "indigo" }}
        />
        <ToolRow
          accent="pink-violet"
          icon={ALERT_SVG}
          title="Мои ошибки"
          sub="Карточки к повторению"
          chip={{ label: pageData.reviewsDue, variant: "pink" }}
          href="/mistakes"
        />
      </div>

      {/* MedMind */}
      {isPro && (
        <>
          <div className="px-6 mb-2.5">
            <span className="text-[9px] tracking-[0.22em] uppercase text-muted font-medium">
              MedMind
            </span>
          </div>
          <div className="px-6 mb-5">
            <MedMindCard
              title={tierLabel}
              tier={formatExpiration(currentPeriodEnd ?? null)}
              stats={[
                {
                  label: "Осталось",
                  value: daysLeftSub !== null ? `${daysLeftSub} ${pluralDay(daysLeftSub)}` : "-",
                },
                {
                  label: "Этот месяц",
                  value: `${pageData.hintsThisMonth} подсказок`,
                },
              ]}
            />
          </div>
        </>
      )}

      {/* Saved library (existing) */}
      {user && (
        <div className="px-6 mb-5">
          <SavedContentLibrary />
        </div>
      )}

      {/* Auth section */}
      <div className="px-6 mb-6">
        <AuthSection />
      </div>

      <ProfileSheet
        open={sheetKind !== null}
        kind={sheetKind}
        onClose={() => setSheetKind(null)}
      />
    </>
  );
}
```

- [ ] **Step 5: Запустить интеграционный тест**

Команда: `npm test -- feedProfile`
Ожидаемо: `9 passed`. Если что-то падает - разбираться почему (например, mock-подсистема не возвращает нужный формат).

- [ ] **Step 6: Запустить все тесты**

Команда: `npm test`
Ожидаемо: всё проходит.

- [ ] **Step 7: Запустить билд**

Команда: `npm run build`
Ожидаемо: successful build. Если есть TS-ошибки (использовали не тот тип, не импортировали) - починить.

- [ ] **Step 8: Commit**

```bash
git add src/components/profile/FeedProfile.tsx src/__tests__/feedProfile.test.tsx
git commit -m "$(cat <<'EOF'
refactor(profile): FeedProfile - полный aurora-ребрендинг

Собран из новых примитивов (AvatarStack, XpProgress, StreakHero,
AccuracyRing, StatTile, DailyCaseCTA, Crest, ToolRow, MedMindCard).
Использует useProfilePageData для weekly pattern, reviews due,
accuracy trend, days in product и других агрегатов.
Все emoji убраны, только SVG-иконки.
Интеграционный тест покрывает ключевые секции.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Подключить TopBar premium=true на странице /profile

**Files:**
- Modify: `src/app/profile/page.tsx`

- [ ] **Step 1: Прочитать текущий profile/page.tsx**

Команда: `cat src/app/profile/page.tsx`

- [ ] **Step 2: Добавить premium=true в TopBar**

В `src/app/profile/page.tsx` найти `<TopBar />` и заменить на `<TopBar premium showSettings />`. Проверить, что импорты не сломались.

- [ ] **Step 3: Запустить тесты**

Команда: `npm test`
Ожидаемо: всё проходит.

- [ ] **Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "$(cat <<'EOF'
feat(profile): включить premium-TopBar с aurora-welcome-band

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Финальная верификация

- [ ] **Step 1: Запустить все тесты, убедиться что всё зелёное**

Команда: `npm test`
Ожидаемо: все тесты проходят, включая все новые.

- [ ] **Step 2: Запустить билд**

Команда: `npm run build`
Ожидаемо: successful, без TS-ошибок.

- [ ] **Step 3: Запустить dev-server**

Команда: `npm run dev`
Открыть в браузере:
- `http://localhost:3000/profile` - новый aurora-профиль
- `http://localhost:3000/feed` - проверить что shell (TopBar/BottomNav) обновился
- `http://localhost:3000/topics` - проверить на остальных страницах
- `http://localhost:3000/daily-case` - проверить shell

Проверить визуально:
- [ ] Profile показывает все секции (hero, XP, duo, stats, daily case, achievements, exam, tools, medmind)
- [ ] Цвета только aurora (никаких emerald/amber/rose-red)
- [ ] BottomNav активная вкладка - aurora gradient pill
- [ ] TopBar - brand dot + текст, StreakBadge, mode switch
- [ ] Никаких emoji-иконок на экране
- [ ] Reviews due 161 подсвечен в pink, не red
- [ ] DailyCase карточка dark-aurora с pink pulse

Проверить темы (в ProfileSheet переключить тему):
- [ ] `mocha` - не сломано, aurora-элементы читаются
- [ ] `graphite` - тёмная тема ок
- [ ] `bordeaux` - ок

Остановить dev-server (Ctrl+C).

- [ ] **Step 4: Финальный коммит (если были мелкие правки)**

Если по результатам верификации были мелкие правки:

```bash
git status
git add <files>
git commit -m "fix(profile): правки по результатам визуальной верификации"
```

Если правок не было - пропустить.

- [ ] **Step 5: Push в remote**

```bash
git push -u origin feat/aurora-phase-1
```

- [ ] **Step 6: Открыть PR**

```bash
gh pr create --title "feat(profile): Aurora redesign - Phase 1 (Фундамент + Shell + Profile)" --body "$(cat <<'EOF'
## Summary
- Формализована aurora-палитра (indigo/violet/pink/ink) в `globals.css` + новые shadow-токены и utility-классы
- Добавлены 9 новых UI-примитивов: AvatarStack, XpProgress, StreakHero, AccuracyRing, StatTile, DailyCaseCTA, Crest, ToolRow, MedMindCard
- Обновлены TopBar (brand-dot + premium-welcome-band), BottomNav (aurora 3-stop pill), StreakBadge (aurora chip), ExamReadiness (trend + weak-chips)
- Создан хук `useProfilePageData` для weekly pattern, reviews due, accuracy trend, days in product и других агрегатов
- FeedProfile полностью переписан на новые примитивы

Спека: [docs/superpowers/specs/2026-04-18-aurora-redesign-design.md](docs/superpowers/specs/2026-04-18-aurora-redesign-design.md)

## Test plan
- [ ] `npm test` - все тесты зелёные (включая 9 новых файлов)
- [ ] `npm run build` - successful
- [ ] `/profile` - визуально aurora-дизайн, все секции на месте
- [ ] `/feed`, `/topics`, `/daily-case` - Shell обновлён везде
- [ ] Никаких emoji-иконок на страницах (только SVG)
- [ ] Reviews due 161 подсвечен в pink (не red)
- [ ] Темы mocha/graphite/bordeaux не сломаны

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

Проверки после написания плана:

**Spec coverage:**
- ✅ Aurora design tokens в globals.css - Task 1
- ✅ AvatarStack - Task 2
- ✅ XpProgress - Task 3
- ✅ StreakHero - Task 4
- ✅ AccuracyRing - Task 5
- ✅ StatTile - Task 6
- ✅ DailyCaseCTA - Task 7
- ✅ Crest - Task 8
- ✅ ToolRow - Task 9
- ✅ MedMindCard - Task 10
- ✅ StreakBadge - Task 11
- ✅ TopBar - Task 12
- ✅ BottomNav - Task 13
- ✅ ExamReadiness - Task 14
- ✅ useProfilePageData - Task 15
- ✅ FeedProfile рефактор - Task 16
- ✅ profile/page.tsx - Task 17
- ✅ Финальная верификация - Task 18

Всё из Phase 1 Scope спеки покрыто.

**Placeholder scan:**
- Нет «TBD», «TODO», «implement later»
- Код в каждом шаге реальный, не псевдокод
- Все commit-сообщения конкретные

**Type consistency:**
- `WeekDay` интерфейс экспортируется из StreakHero, импортируется в useProfilePageData
- `FeedProfile` использует `useProfilePageData()` - сигнатура совпадает
- `ToolRow` chip variants совпадают в определении и использовании
- `Crest` variants совпадают

**Что не покрыто (осознанно, для следующих фаз):**
- PrepProfile (режим «Аккредитация») - отдельная фаза
- Остальные страницы (topics, feed, daily-case, welcome, subscription, consilium) - отдельные фазы

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-aurora-phase-1-foundation-shell-profile.md`. Два варианта исполнения:

**1. Subagent-Driven (рекомендую)** - дипсачу свежего субагента на каждую задачу, между задачами делаю code review, быстрая итерация

**2. Inline Execution** - выполняю задачи в этой же сессии через executing-plans, батчи с чекпоинтами на ревью

Какой подход?
