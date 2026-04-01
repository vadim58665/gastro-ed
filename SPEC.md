# GastroEd — SPEC.md

## Context

GastroEd — интерактивная обучающая платформа для врачей-гастроэнтерологов. Формат "Duolingo для врачей": клинические ситуации, мифы, визуальные квизы, spaced repetition. Источник контента — клинические рекомендации РФ.

Автор — практикующий врач. Дизайн — luxury minimalism (референс: johannis.it): большие лёгкие числа, uppercase метки, тонкие разделители, без декоративных иконок.

---

## Что готово (апрель 2026)

| Компонент | Статус | Детали |
|-----------|--------|--------|
| 7 типов карточек | DONE | ClinicalCase, MythOrFact, BuildScheme, VisualQuiz, BlitzTest, FillBlank, RedFlags |
| Лента `/feed` | DONE | Snap-scroll, shuffle, фильтр по `?topic=` |
| Повторение `/review` | DONE | FSRS (ts-fsrs), 4 кнопки оценки, пустое состояние |
| Темы `/topics` | DONE | Динамический подсчёт, клик → фильтр ленты |
| Профиль `/profile` | DONE | Johannis-стиль, 6 метрик |
| Streak + очки | DONE | localStorage, локальное время, dailyGoal |
| PWA | DONE | manifest.json, иконки, standalone |
| SVG-навигация | DONE | Тонкие контурные иконки вместо эмодзи |
| Контент | 21 карточка | 11 тем (H.pylori, ГЭРБ, Панкреатит и др.) |

---

## Что нужно сделать — приоритет

### Уровень 3: Spec-first (этот документ)
- [x] Написать полную спецификацию

### Уровень 4: MCP + API + БД

**4.1 Supabase — auth + облачный прогресс**
- Magic link авторизация (email)
- Гостевой режим с миграцией данных при регистрации
- Таблицы: profiles, user_answers, review_cards, daily_activity
- Синхронизация localStorage ↔ Supabase

Файлы:
- `src/lib/supabase/client.ts` — браузерный клиент
- `src/lib/supabase/server.ts` — серверный клиент
- `supabase/migrations/001_initial.sql` — схема
- `src/app/auth/login/page.tsx` — страница входа
- `src/hooks/useProgress.ts` — добавить Supabase sync
- `src/hooks/useReview.ts` — добавить Supabase sync

**4.2 Контент-пайплайн — генерация карточек**
- Скрипт `scripts/generate-cards.ts`
- Читает 22 ГЭ-протокола из `~/Desktop/проекты/автоматизация сервиса Сбер здоровье/Therapy/`
- Claude API генерирует карточки в JSON-формате
- Врач ревьюит → утверждает → добавляет в `src/data/cards.ts`
- Цель: 200+ карточек по 11+ темам

Источники контента:
- `важные-факты-в-гастроэнтерологии.md` — мифы (20+ штук)
- `гэрб-общая-информация.md` — ГЭРБ
- `язвенная-болезнь-желудка-и-дпк-общая-информация.md` — H.pylori
- Ещё ~19 протоколов

### Уровень 5: Автоматизация

**5.1 CI/CD**
- GitHub → push → lint + typecheck + build → Vercel deploy
- Pre-commit hook: `npm run lint && npm run build`

**5.2 Авто-тесты**
- Vitest для критической логики: useProgress (streak), useReview (FSRS), card validation
- Playwright E2E: feed → answer → check review

**5.3 Деплой**
- Vercel (hobby plan)
- PWA-установка на телефон для тестирования

### Уровень 6: Multi-agent оркестрация
- Параллельные worktree-агенты: фича + тесты + ревью
- Контент-агент + медицинский валидатор
- (Будущее — после стабилизации)

---

## Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Framework | Next.js (App Router, Turbopack) | 16.2.1 |
| UI | React | 19.2.4 |
| Язык | TypeScript | 5 |
| Стили | Tailwind CSS v4 (@theme) | 4 |
| Шрифт | Inter (latin + cyrillic) | Google Fonts |
| БД + Auth | Supabase (JS client установлен) | 2.101.1 |
| Spaced repetition | ts-fsrs | 5.3.2 |
| Валидация | Zod (установлен, не используется) | 4.3.6 |
| PWA | @ducanh2912/next-pwa | 10.2.9 |
| Контент-генерация | Claude API (будущее) | — |
| Хостинг | Vercel (будущее) | — |

---

## Архитектура

### Файловая структура (текущая)
```
gastro-ed/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root: Inter font, PWA meta, viewport
│   │   ├── page.tsx            # Redirect → /feed
│   │   ├── globals.css         # @theme (14 цветов), snap-scroll, card-shadow
│   │   ├── feed/page.tsx       # Лента с Suspense + useSearchParams
│   │   ├── review/page.tsx     # FSRS-ревью с 4 кнопками
│   │   ├── topics/page.tsx     # Динамический список тем
│   │   └── profile/page.tsx    # Johannis-статистика
│   ├── components/
│   │   ├── cards/              # 7 интерактивных компонентов
│   │   ├── feed/CardFeed.tsx   # Shuffle + snap + dual hooks
│   │   ├── feed/CardRenderer.tsx # Switch по card.type
│   │   └── ui/                 # TopBar, BottomNav, StreakBadge
│   ├── hooks/
│   │   ├── useProgress.ts      # Streak, points, localStorage
│   │   └── useReview.ts        # FSRS scheduling, localStorage
│   ├── types/
│   │   ├── card.ts             # 7 CardType + BaseCard + Card union
│   │   └── user.ts             # UserProgress, CardAnswer
│   └── data/
│       └── cards.ts            # 21 демо-карточка
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # 192 + 512 png
├── next.config.ts              # PWA + turbopack root
└── package.json
```

### Типы карточек

| Тип | Интерфейс | Механика |
|-----|-----------|----------|
| clinical_case | ClinicalCaseCard | Сценарий → 4 варианта → объяснение |
| myth_or_fact | MythOrFactCard | Утверждение → Миф/Факт → объяснение |
| build_scheme | BuildSchemeCard | Multi-select компонентов → проверка |
| visual_quiz | VisualQuizCard | Изображение → 4 варианта → объяснение |
| blitz_test | BlitzTestCard | 5 Да/Нет за 30 сек → результат |
| fill_blank | FillBlankCard | Ввод текста → проверка acceptableAnswers |
| red_flags | RedFlagsCard | Multi-select опасных симптомов |

### Тема / цвета
```
background: #f8f9fc  foreground: #1a1a2e  primary: #6366f1
success: #10b981  danger: #f43f5e  warning: #f59e0b
card: #ffffff  muted: #94a3b8  border: #e2e8f0  surface: #f1f5f9
```

### Хранение данных (текущее)
- `localStorage("gastro-ed-progress")` → UserProgress (streak, points, cards)
- `localStorage("gastro-ed-review")` → ReviewCard[] (FSRS state per card)

---

## Контент: текущие 21 карточка

| Тема | clinical_case | myth_or_fact | build_scheme | blitz_test | fill_blank | red_flags | Итого |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| H. pylori | 1 | — | 2 | — | 1 | — | 4 |
| Гастроэнтерология | — | 1 | — | 1 | 1 | — | 3 |
| Фармакология | — | 2 | — | 1 | — | — | 3 |
| ГЭРБ | 1 | — | — | — | — | 1 | 2 |
| Панкреатит | 1 | — | — | — | 1 | — | 2 |
| Гепатология | 1 | 1 | — | — | — | — | 2 |
| СРК | 1 | — | — | — | — | — | 1 |
| Диетология | — | 1 | — | — | — | — | 1 |
| Диагностика | — | 1 | — | — | — | — | 1 |
| Диарея | — | — | — | — | — | 1 | 1 |
| Инфекции | 1 | — | — | — | — | — | 1 |

---

## Следующие шаги: план реализации

### Шаг 1: SPEC.md → CLAUDE.md (сейчас)
Обновить CLAUDE.md проекта с ключевыми конвенциями

### Шаг 2: Контент-пайплайн (приоритет)
1. `scripts/generate-cards.ts` — скрипт генерации
2. Читает протоколы → Claude API → JSON карточки
3. Zod-валидация вывода
4. Цель: 200+ карточек

### Шаг 3: Supabase
1. Создать проект в Supabase Dashboard
2. Миграции: profiles, user_answers, review_cards
3. Auth: magic link
4. Sync hooks: localStorage ↔ Supabase

### Шаг 4: Vercel деплой
1. `vercel deploy`
2. Env-переменные Supabase
3. PWA-тест на мобильном

### Шаг 5: Тесты
1. Vitest: useProgress, useReview, card types
2. Playwright: E2E flow

---

## Верификация

1. `npm run build` — без ошибок TypeScript
2. `npm run dev` → Claude Preview — все 4 экрана работают
3. Feed: ответить на карточку → streak обновился, карточка запланирована
4. Review: карточка появляется после ответа, 4 кнопки работают
5. Topics: клик → фильтрованная лента
6. Profile: все метрики отображаются
7. PWA: установка на телефон, standalone mode
