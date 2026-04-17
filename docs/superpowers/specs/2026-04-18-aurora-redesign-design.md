# Aurora Redesign - Design Spec

**Дата:** 2026-04-18
**Статус:** design approved by doctor (v3 mockup), ready for planning
**Scope:** полный визуальный ребрендинг приложения УмныйВрач на единую aurora-палитру

## Цель

Привести всё приложение к одному визуальному языку - aurora-палитра (индиго/фиолет/пинк), премиум-уровень финиша, воздух и гармония при первом заходе. Убрать визуальный шум от разнородных цветовых акцентов (эмеральд, янтарь, rose-red), которые сейчас разбросаны по странице.

Целевой эффект: врач заходит в приложение - видит гармоничное целое, не разношёрстную кучу функций. Повышается ощущение, что это **один продукт премиум-класса**, а не склейка модулей.

## Контекст

Приложение уже имеет сильную дизайн-основу:
- 4 темы (default, mocha, graphite, bordeaux) в `src/app/globals.css`
- Одобренные примитивы в `src/components/ui/` (MagicCard, ShineCard, GlowAvatar, ProgressRing, NumberTicker, SoftListRow и др.)
- Закреплённые правила: no em-dash, no emoji/decorative icons on pages, luxury minimalism, static-only (no autonomous motion)

Что не работает:
- На одной странице встречаются 4+ разных цветовых семейств (aurora + эмеральд + янтарь + rose-red)
- Эмодзи-иконки в списках (🏆 🎯 🔒 💬 📚 ⚠ 🧠) противоречат правилу no-emoji
- Часть страниц осталась в «старом» стиле до применения премиум-паттерна
- Нет единого типографического ритма между страницами
- TopBar и BottomNav не используют aurora-визуал полноценно

## Дизайн-принципы (обновлённые)

### 1. Aurora-only палитра

**Цвета (зафиксированы):**
- `--color-aurora-indigo: #6366F1`
- `--color-aurora-violet: #A855F7`
- `--color-aurora-pink: #EC4899`
- `--color-ink: #1A1A2E`
- `--gradient-premium-dark: linear-gradient(135deg, #1A1A2E 0%, #312E81 50%, #6366F1 100%)`
- `--gradient-aurora: linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)`

**Запрещено на премиум-страницах (/profile, /subscription, /welcome, /consilium, /daily-case):**
- Эмеральд `#10B981` как акцент или trend-цвет
- Янтарь `#F59E0B`, золото `#FCD34D`, бронза `#B45309`
- Rose `#F43F5E` для danger - заменяется на aurora-pink `#EC4899`

**Исключения (semantic success/warning на утилитарных страницах):**
- В `/review` при ответе «правильно» может остаться green - это tactile feedback, не декор
- В `/modes/exam` статус-индикаторы могут использовать минимальные semantic цвета
- Четыре темы (mocha, graphite, bordeaux) сохраняются - правило aurora применяется только к default теме

### 2. Semantic mapping - какой aurora-цвет что значит

- `aurora-indigo` - основной акцент, нейтральный прогресс, позитивный trend
- `aurora-violet` - premium / повышенный статус (уровни, достижения)
- `aurora-pink` - внимание / требует действия (ошибки, к повтору, активно сейчас)
- `ink` - текст, иконки
- `premium-dark gradient` - CTA кнопки, PRO-badge, dark cards (Daily Case)
- `aurora gradient` (все три) - hero-моменты: аватар ring, активный nav-pill, центральная метрика

### 3. Типографика

Фиксированная шкала (на всех страницах):
- `display` - 48px / extralight / tracking -0.025em (hero aurora-числа)
- `h1` - 24px / extralight / -0.02em (имя пользователя, заголовки секций hero)
- `h2` - 16px / regular / -0.01em (заголовки карточек)
- `body` - 12px / regular / -0.01em (основной текст)
- `caption` - 10-11px / regular / 0em (поддерживающий текст)
- `label` - 9px / 500 / 0.22em uppercase (метки секций, пиллы)
- `micro` - 8px / 500-600 / 0.15-0.22em uppercase (мелкие подписи)

### 4. Мотион

Действующие правила сохраняются:
- Zero autonomous motion (никаких `animation: ... infinite`)
- Hover transitions OK
- Scroll-in fade/slide OK (одноразово при появлении)
- Tap/press scale(0.985) OK
- Respect `prefers-reduced-motion` - все transitions отключаются

## Scope

### Что в этом design-документе

- Новые/обновлённые design tokens в `globals.css`
- Новые/обновлённые UI-примитивы в `src/components/ui/`
- Обновление Shell (TopBar, BottomNav) под aurora-язык
- Детальный редизайн **Profile page** (FeedProfile)
- Принципы наследования aurora-языка для остальных страниц (без попиксельных макетов)
- Data-requirements (новые запросы, computed-поля)
- A11y, motion, testing
- Стадирование реализации по фазам

### Что НЕ в этом документе (но будет в последующих)

- PrepProfile (режим «Аккредитация») - у него своя композиция, отдельная итерация
- Попиксельный дизайн /topics, /feed, /daily-case, /welcome, /subscription, /consilium - каждая получит свою спеку, когда дойдём
- Backend/data-слой для новых фич (если появятся) - отдельные спеки
- Миграции Supabase - не требуются для этого редизайна (все данные уже есть)

## Design Tokens - изменения в `globals.css`

### Новые переменные (в `@theme`)

```css
@theme {
  /* ... существующие ... */

  /* Aurora palette - formalised */
  --color-aurora-indigo: #6366F1;
  --color-aurora-violet: #A855F7;
  --color-aurora-pink: #EC4899;
  --color-ink: #1A1A2E;

  /* Aurora-tinted shadows (заменяют grey shadows на премиум-карточках) */
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

  /* Aurora background gradients */
  --bg-aurora-ambient:
    radial-gradient(1200px 800px at 50% -10%, rgba(99, 102, 241, 0.08), transparent 60%),
    radial-gradient(600px 400px at 100% 30%, rgba(168, 85, 247, 0.06), transparent 55%),
    radial-gradient(800px 600px at 0% 100%, rgba(236, 72, 153, 0.04), transparent 55%);
}
```

### Новые утилитарные классы

```css
/* Aurora welcome band (под topbar на premium страницах) */
.aurora-welcome-band {
  height: 20px;
  background:
    radial-gradient(600px 80px at 20% 100%, rgba(99, 102, 241, 0.18), transparent 70%),
    radial-gradient(600px 80px at 80% 100%, rgba(236, 72, 153, 0.12), transparent 70%);
  pointer-events: none;
}

/* Aurora gradient border (hairline) для premium карточек */
.aurora-hairline {
  position: relative;
}
.aurora-hairline::before {
  content: "";
  position: absolute; inset: 0; border-radius: inherit;
  padding: 1.2px;
  background: linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(168,85,247,0.2) 50%, rgba(236,72,153,0.15) 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* Aurora conic ring (для больших progress-rings) */
.aurora-conic {
  background: conic-gradient(from -90deg, #6366F1 0%, #A855F7 30%, #EC4899 40%, rgba(99,102,241,0.08) 40%);
}
```

### Изменения в существующих токенах

- Обновить `body` background на `var(--bg-aurora-ambient)` для default-темы
- `.btn-premium-dark` - уже в aurora, не меняется
- `.aurora-text` - уже в aurora, не меняется
- Для не-default тем (mocha, graphite, bordeaux) aurora-токены перекрываются соответствующими тематическими цветами - это уже работает через CSS-каскад

## UI-примитивы

### Новые компоненты (добавить в `src/components/ui/`)

#### 1. `AvatarStack.tsx` (replaces/wraps GlowAvatar)

Props: `initial: string`, `size?: number (default 128)`, `verified?: boolean`, `activityLabel?: string`, `activityPercent?: number (0-100)`.

Структура:
- Outer aura (blurred radial)
- Activity dashed ring (conic-gradient aurora, % заполнения)
- Activity label chip (absolute top, если activityLabel задан)
- Aurora 2px ring
- Core white circle with aurora-text letter
- Verified PRO badge (aurora premium-dark, checkmark SVG) - правый нижний угол

#### 2. `XpProgress.tsx`

Props: `current: number`, `target: number`, `currentLevel: string`, `nextLevel: string`.

Структура: карточка с label, aurora-number current / target, "ещё N" indicator, aurora-track 4px с dot-marker (pink glow), footer-строка с названиями уровней.

#### 3. `StreakHero.tsx`

Props: `currentStreak: number`, `bestStreak: number`, `weekPattern: Array<{day: string, activity: number | null, isToday: boolean}>` (Пн-Вс).

Структура: aurora-hairline карточка, label, 54px aurora-число streak-а, sub-строка, weekly sparkline (7 столбиков высотой по activity), best-row с aurora-violet значением.

#### 4. `AccuracyRing.tsx`

Props: `percent: number`, `fraction?: string (e.g. "62/154")`, `trend?: { delta: number, period: string }`.

Структура: aurora-hairline карточка, label, 88px conic-aurora ring с % числом в центре, fraction-sub, trend-row с SVG-стрелкой и дельтой (индиго, не эмеральд).

#### 5. `StatTile.tsx`

Props: `value: string | number`, `label: string`, `accent?: boolean`.

Структура: маленькая карточка с aurora-text числом, uppercase label. `accent=true` - использует aurora gradient (pink→violet) для выделения цифры.

#### 6. `DailyCaseCTA.tsx`

Props: `caseDate: string`, `caseId: string`, `maxPoints: number`, `currentPoints: number`, `active: boolean`, `onStart: () => void`.

Структура: тёмная aurora-gradient карточка, label + pulse-indicator, title, sub, points-bar (violet→pink gradient), CTA кнопка (белая с arrow SVG).

#### 7. `Crest.tsx`

Props: `variant: "indigo-violet" | "violet-pink" | "locked"`, `icon: ReactNode (SVG)`, `title: string`, `sub?: string`.

Структура: 88px flex-0 карточка, 44px шестиугольник (clip-path polygon) с gradient background + shine-хайлайтом + SVG внутри. Locked-вариант: прозрачный шестиугольник с dashed border и приглушённой SVG.

#### 8. `ToolRow.tsx`

Props: `icon: ReactNode (SVG)`, `title: string`, `sub?: string`, `accent: "indigo" | "indigo-violet" | "violet-pink" | "pink-violet"`, `chip?: { label: string, variant: "indigo" | "violet" | "pink" | "dark" }`, `onClick?: () => void`.

Структура: белая карточка с aurora left-accent полоской (3px + glow), aurora-tinted icon-box (36px) с SVG, title/sub, opcional chip справа.

#### 9. `MedMindCard.tsx`

Props: `title: string`, `tier: string`, `expiresAt: string`, `stats: Array<{ label: string, value: string }>` (usually 2).

Структура: aurora-hairline карточка, header (40px aurora-gradient icon box + brain SVG + title + tier-color sub), divider, 2-column meta (uppercase labels + values).

### Обновление существующих компонентов

#### `GlowAvatar.tsx`
Добавить опциональные props: `verified`, `activityLabel`, `activityPercent`. Сохранить backward-compatibility (если не переданы - старое поведение). Альтернатива: новый `AvatarStack` как wrapper, `GlowAvatar` оставить как базовый.

**Решение:** создать `AvatarStack` как новый компонент, использовать на профиле. `GlowAvatar` остаётся для мест, где нужна базовая версия.

#### `TopBar.tsx`
Переделать структуру:
- Row 1: `brand-dot` + "Умный Врач" brand text (left), streak-chip (center-right), settings-btn (right)
- Row 2: centered `ModeSwitch` (если не `showBack`)
- Добавить `.aurora-welcome-band` внизу topbar-а (только на premium страницах, через prop `premium?: boolean`)

#### `BottomNav.tsx`
Переделать active-state:
- Активная вкладка: pill 34x26 с `--gradient-aurora` (3-stop) background + inner highlight shadow + aurora-shadow
- Неактивные: иконка в muted-color
- SVG иконки вместо текущих (нужно проверить, что там сейчас - возможно уже SVG, но стиль может отличаться)
- Label под иконкой: aurora-violet для активной, muted для остальных

#### `StreakBadge.tsx`
Превратить в aurora-streak-chip (как в topbar макета): mini conic-ring (20px) + число + label. Используется в TopBar.

#### `SoftListRow.tsx`
Расширить: добавить `chip`, `accent` prop. Или создать `ToolRow` как отдельный компонент - решаем при реализации по месту.

**Решение:** `ToolRow` - новый компонент, `SoftListRow` остаётся для простых случаев без aurora-accent.

## Shell

### TopBar (на всех страницах)

Layout: sticky top, aurora-hairline bottom, `backdrop-filter: blur(24px)`, `bg: rgba(255,255,255,0.82)`.

Три состояния:
- **Home state** (`showBack=false, premium=false`): brand + mode-switch + streak-chip
- **Premium state** (`premium=true`): brand + streak-chip + settings + aurora-welcome-band ниже
- **Back state** (`showBack=true`): back-button + streak-chip (компактный)

### BottomNav

Layout: sticky bottom, aurora-hairline top, blur-background.

4 вкладки: Главная, Лента, Темы, Профиль.

Активная: aurora-gradient pill 34x26 + SVG icon (белая) + aurora-violet label.
Неактивная: SVG icon muted + muted label.

Иконки (все hairline stroke 1.6):
- Главная: house path
- Лента: grid/feed path (rectangle с divisions)
- Темы: two-book path
- Профиль: user silhouette

## Profile Page (детально)

### Компонентная структура (FeedProfile.tsx)

```
<TopBar premium />

<div className="aurora-welcome-band" />

<section className="identity-hero">
  <p className="hi-label">С возвращением</p>
  <AvatarStack
    initial="V"
    verified={isPro}
    activityLabel="4 сегодня"
    activityPercent={todayProgress}
  />
  <h1 className="name">{nickname ?? emailPrefix}</h1>
  <p className="email">{email}</p>
  <div className="meta-pills">
    <PremiumDarkPill>PRO · {tierName}</PremiumDarkPill>
    <LevelPill>{levelLabel}</LevelPill>
  </div>
</section>

<XpProgress current={xp} target={nextLevelXp} currentLevel="Ординатор II" nextLevel="Врач" />

<section className="hero-duo">
  <StreakHero currentStreak={streak_current} bestStreak={streak_best} weekPattern={weekPattern} />
  <AccuracyRing percent={accuracy} fraction="62/154" trend={{delta: 3, period: "за неделю"}} />
</section>

<section className="stats-4">
  <StatTile value={answersCount} label="Ответов" />
  <StatTile value={uniqueTopics} label="Тем" />
  <StatTile value={reviewsDue} label="К повтору" accent />
  <StatTile value={`${daysInProduct}д`} label="В продукте" />
</section>

<DailyCaseCTA
  caseDate="18 апр"
  caseId="hard-002"
  maxPoints={5000}
  currentPoints={0}
  active={true}
  onStart={() => router.push("/daily-case")}
/>

<section>
  <SectionHead title="Достижения · 2 из 12" link="/achievements" />
  <Crest row> (5 items, horizontal scroll)
    <Crest variant="indigo-violet" icon={<TargetSvg/>} title="Первый ответ" sub="10 апр" />
    <Crest variant="violet-pink" icon={<FlameSvg/>} title="Streak 3 дня" sub="12 апр" />
    <Crest variant="locked" icon={<LockSvg/>} title="Streak 7 дней" sub="3 из 7" />
    ...
  </Crest row>
</section>

<section>
  <SectionHead title="Готовность к экзамену" link="/accreditation" />
  <ExamReadiness />  // обновлён - см. ниже
</section>

<section>
  <SectionHead title="Инструменты" />
  <ToolRow accent="indigo" icon={<ChatSvg/>} title="Консилиум" sub="AI-пациент ждёт приёма" chip={{label:"Pro",variant:"dark"}} href="/consilium" />
  <ToolRow accent="indigo-violet" icon={<BookSvg/>} title="Моя библиотека" sub="Сохранённые AI-объяснения" chip={{label:savedCount,variant:"indigo"}} />
  <ToolRow accent="violet-pink" icon={<DownloadSvg/>} title="Экспорт в Anki" sub="Повторяй в привычном инструменте" chip={{label:".apkg",variant:"violet"}} />
  <ToolRow accent="pink-violet" icon={<AlertSvg/>} title="Мои ошибки" sub="Карточки к повторению" chip={{label:reviewsDue,variant:"pink"}} href="/mistakes" />
</section>

<section>
  <SectionHead title="MedMind" />
  <MedMindCard
    title={tierLabel}
    tier={"Активно до " + formatDate(period_end)}
    expiresAt={period_end}
    stats={[
      { label: "Осталось", value: `${daysLeft} дней` },
      { label: "Этот месяц", value: `${hintsUsed} подсказок` }
    ]}
  />
</section>

<AuthSection />  // оставляем, просто чище

<BottomNav />
```

### Обновление `ExamReadiness` компонента

Добавить: trend-индикатор (аналог `AccuracyRing.trend`) + chip-ы weak-тем.

Новые props:
- `trend?: { delta: number, period: string }`
- `weakTopics: Array<{ name: string, percent: number }>`

Визуал: карточка с label + value-row (aurora-number + trend), track 5px aurora gradient, chips weak-topics в pink внизу.

## Данные - что нужно вычислять/запрашивать

### Есть в БД

- `profiles.nickname`, `profiles.email`, `profiles.created_at`
- `user_progress.xp`, `streak_current`, `streak_best`, `cards_seen`, `cards_correct`
- `subscriptions.tier`, `status`, `current_period_end`, `engagement_level`
- `user_saved_content` - count by user_id
- `daily_case_results.{case_date, total_points, max_points, completed_at}` - last row

### Нужно дополнительно вычислять на клиенте или в API

1. **Accuracy %** - `cards_correct / cards_seen * 100` (уже считается в FeedProfile, вынести в общую функцию)

2. **Days in product** - `(today - profiles.created_at).days`

3. **Unique topics answered** - `SELECT COUNT(DISTINCT card_id) FROM user_answers WHERE user_id = ?`. Поля card_id расшифровывается по таксономии - для простоты считаем по distinct prefix/topic (см. src/data/cards.ts для структуры ID).

4. **Reviews due** - `SELECT COUNT(*) FROM review_cards WHERE user_id = ? AND due <= NOW()`

5. **Weekly streak pattern** - на последние 7 дней (пн-вс этой недели или последние 7 дней):
   - `SELECT DATE(answered_at) as day, COUNT(*) as activity FROM user_answers WHERE user_id = ? AND answered_at > NOW() - INTERVAL '7 days' GROUP BY DATE(answered_at)`
   - Нормализовать activity в 0-22px высоту для sparkline

6. **Accuracy trend (+N% за неделю)** - разница между accuracy этой недели и прошлой:
   - `SELECT accuracy_this_week - accuracy_last_week` - считается через 2 SQL-запроса или через окно функций

7. **Days left on subscription** - `(current_period_end - now).days`

8. **Hints used this month** - `SELECT COUNT(*) FROM ai_usage_log WHERE user_id = ? AND created_at > start_of_month AND tool = 'hint'`

9. **Level + next level XP** - есть таблица/функция маппинга XP → level (проверить существующий `useGamification` hook, возможно уже есть)

10. **Weak topics** (для ExamReadiness) - топ-2 раздела с самой низкой точностью:
    - Группировка по специальности из card_id, accuracy по каждой, sorting asc, top 2.

### Где это делать

- Существующий `useGamification` хук - расширить до `useProfileStats` (или отдельный `useProfilePageData`)
- Некоторые вычисления - на сервере в виде Supabase RPC или API route `/api/profile/stats`
- Вариант попроще: клиент делает несколько параллельных запросов, кеширует через react-query/SWR (проверить что в проекте)

**Решение для первой реализации:** клиент делает несколько параллельных запросов, обёрнутых в один хук. Это лекче проверяется, RLS уже защищает данные.

## Наследование aurora-языка на другие страницы

Эти страницы получат собственные спеки в следующих итерациях. Здесь описан **принцип**, как они должны выглядеть, чтобы не было расхождений с profile.

### Общие правила для всех премиум-страниц

- Фон: `var(--bg-aurora-ambient)` (три radial по углам)
- TopBar: `premium=true` (с aurora-welcome-band)
- Шрифтовая шкала: как описано выше
- Цвета: только aurora + ink
- Кнопки-CTA: `.btn-premium-dark`
- Aurora-text на hero-числах
- SVG-иконки только (no emoji)

### Per-page принципы

**/topics (главная после входа):**
- Identity-lite header (nickname + level-pill, без большого аватара)
- Daily-case CTA наверху (тот же `DailyCaseCTA` что на профиле)
- Список тем: soft-list rows с aurora-accent, progress-% aurora-text справа
- Filter/search с aurora-focus state

**/feed:**
- Сама карточка: aurora-hairline на активной
- Topbar прозрачнее (поверх карточек)
- Кнопки ответов: neutral до выбора, aurora-pink на incorrect, aurora-violet-glow на correct
- Результат после ответа: aurora-indigo для объяснения, не emerald

**/daily-case:**
- Full-screen premium-dark gradient фон (а не светлый) - это флагман
- Timer: aurora-gradient с pulse-indicator
- Leaderboard: soft list, ник игрока в aurora-text
- Progress через этапы - aurora-bar с dot-marker

**/welcome (public landing):**
- Hero: aurora-large-text заголовок на светлом фоне с ambient aurora
- Feature cards: aurora-hairline, aurora-violet для иконок
- CTA «Начать бесплатно»: `.btn-premium-dark`
- Социальные proofs / testimonials - soft aurora-tinted карточки

**/subscription:**
- Tier-cards: `ShineCard` primitive уже используется, но палитра tiers ранее включала emerald и amber (feed_helper/accred_basic indigo→violet, accred_mentor violet→pink, accred_tutor amber→pink, accred_extreme emerald→indigo). Aurora-правило заменяет это на:
  - `feed_helper` / `accred_basic`: indigo → violet (без изменений)
  - `accred_mentor`: violet → pink (без изменений)
  - `accred_tutor`: indigo → pink (было amber→pink)
  - `accred_extreme`: premium-dark gradient (ink → indigo → violet, «топовый» тёмный tier) (было emerald→indigo)
- Price aurora-text
- Feature bullets: aurora-dot glow
- CTA: `.btn-premium-dark`

**/consilium:**
- AI-chat UI: aurora-avatar для бота, ink-avatar для пользователя
- Message bubbles: aurora-hairline для AI messages, neutral для user
- Input field: aurora-focus state (`.input-refined:focus` уже в индиго, OK)
- Suggested prompts: chips в aurora-indigo

**/achievements:**
- Same Crest компонент что на профиле, грид вместо carousel
- Progress indicators: aurora-pink для locked, aurora-violet-gradient для unlocked
- Detail-view: большая crest-эмблема, aurora-text процент прогресса

**/mistakes, /review:**
- Утилитарные, могут использовать более сдержанный aurora
- FSRS-buttons (again/hard/good/easy): возможно допустимо оставить minimal semantic colors (red/amber/green/blue) - это tactile feedback, не декор. **Решить при итерации.**

## A11y и motion

- Все иконки-кнопки имеют `aria-label`
- SVG иконки декоративные внутри текстовых контекстов - `aria-hidden="true"`
- Focus-visible state: aurora-indigo 2px ring на всех интерактивах
- Keyboard nav: tab-order линейный сверху-вниз
- `prefers-reduced-motion: reduce` - все transitions 0s, hover-эффекты minimal

## Testing

### Vitest (existing)

- Компонентные тесты для новых примитивов (`AvatarStack`, `StreakHero`, `AccuracyRing`, `Crest`, `ToolRow`, `MedMindCard`, `XpProgress`, `DailyCaseCTA`, `StatTile`):
  - Renders без ошибок со всеми props
  - Применяет правильные aurora-classes по variant
  - Accessibility - есть aria-label если нужен

- Интеграционный тест FeedProfile:
  - Рендерится с mock useGamification/useAuth
  - Показывает aurora-streak, accuracy-ring, все секции
  - Использует RTL `getByLabelText` (не `getByRole` с кириллицей - см. `rtl-cyrillic-testing`)

### Manual verification (локально)

- Запустить dev-server, открыть `/profile` в браузере
- Проверить на реальном устройстве (не только desktop)
- Проверить что не сломались `mocha/graphite/bordeaux` темы (переключить, убедиться что aurora-tokens перекрываются)
- Проверить что темная тема читабельна (graphite)

## Реализация - фазы

Один design-doc, пять implementation plans (отдельные сессии).

### Фаза 1 - Foundation + Shell + Profile (первая реализация)

**Scope:** `globals.css` aurora tokens, новые UI-примитивы, TopBar/BottomNav, полный редизайн FeedProfile.

**Deliverables:**
- Обновлённый `globals.css` с aurora tokens и утилитарными классами
- Новые компоненты: `AvatarStack`, `XpProgress`, `StreakHero`, `AccuracyRing`, `StatTile`, `DailyCaseCTA`, `Crest`, `ToolRow`, `MedMindCard`
- Обновлённые: `TopBar`, `BottomNav`, `StreakBadge`, `ExamReadiness`
- Рефактор `FeedProfile.tsx` с новой композицией
- Новый хук/хуки для profile-data (weekly pattern, reviews due, trend, и т.п.)
- Тесты компонентов
- Верификация на dev-сервере

**Estimated:** одна большая сессия, ~4-6 часов работы.

### Фаза 2 - /topics (главная)

Редизайн списка тем под aurora-язык. Использует примитивы из Фазы 1. Добавляет DailyCaseCTA на верх.

### Фаза 3 - /feed

Точечные правки карточек, ответов, объяснений под aurora. Минимальные изменения, поскольку UX недавно фиксили.

### Фаза 4 - /daily-case

Большой редизайн - это флагман. Full-screen aurora premium-dark фон, timer в aurora-gradient, leaderboard, progress-stages.

### Фаза 5 - /welcome + /subscription

Конверсионные страницы. Aurora-hero на welcome, tier-cards в subscription перегнать все на aurora-gradients (в т.ч. accred_extreme с emerald на aurora).

### Фаза 6 (опционально) - /consilium + /achievements + /mistakes + /review

Остаток страниц, если нужно.

### Порядок между фазами

После Фазы 1 продукт уже выглядит премиально (Shell + Profile на каждой странице видны). Остальные фазы можно переставлять по бизнес-приоритету:
- Конверсия важна → сразу Welcome/Subscription
- Retention важна → сразу Topics + Feed
- Флагман → DailyCase

## Out of Scope (для ясности)

- PrepProfile (режим «Аккредитация») - отдельный компонент, отдельная спека позже
- Новые фичи / новый функционал - только визуальный ребрендинг
- Миграции Supabase - не требуются
- Performance-оптимизации - не в фокусе этой работы (но не ломаем существующее)
- Аналитика PostHog - существующие события сохраняются

## Riski / известные gotchas

1. **Тёмные темы (graphite, mocha, bordeaux)** - aurora-tokens перекрываются их цветами. Нужно проверить что новые utility-классы `.aurora-hairline`, `.aurora-conic` работают OK во всех темах.

2. **SSR/hydration** - большинство новых компонентов `client-only`. Соблюдать правило «все страницы `use client`».

3. **Next.js 16** - обращать внимание на deprecation warnings, async params/cookies. Для профиля не должно быть блокеров.

4. **localStorage-based hooks** - `useProgress`, `useReview` остаются как есть, просто читаются новыми компонентами.

5. **Supabase queries для weekly pattern / trend** - новые запросы должны работать под RLS. User читает только свои данные - OK.

6. **Bundle size** - новые компоненты ~8 штук, должны быть tree-shakeable. Следить чтобы не потянуть лишних зависимостей.

## Deliverable сейчас (из этой спеки)

Одобрение этого документа + план имплементации **Фазы 1** (Foundation + Shell + Profile). План составляется через `writing-plans` skill после того, как ты подтвердишь спеку.
