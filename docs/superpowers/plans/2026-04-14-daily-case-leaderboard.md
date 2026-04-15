# Рейтинг «Диагноза дня» + регистрация с никнеймом — План реализации

## Context

Доктор, проходящий ежедневный кейс «Диагноз дня», хочет видеть под кнопкой «Показать разбор» рейтинг всех пользователей, прошедших сегодняшний кейс, отсортированный по набранным очкам. Это требует:

1. Идентификации пользователя в рейтинге — в `profiles` сейчас только `email`. Показывать email нельзя (приватность), поэтому вводим обязательный уникальный **никнейм**.
2. Поля **телефон** в профиле (запрошено пользователем как контактный реквизит, **без** SMS-верификации).
3. Серверного хранилища результатов дня — сейчас `daily_case_history` лежит JSONB-ом внутри `user_progress`, для агрегации по всем пользователям не пригоден. Добавляем таблицу `daily_case_results` (одна запись на (user, date)).
4. Обновлённого welcome-флоу с разделением «Войти» / «Регистрация» — при регистрации заполняются nickname и phone.
5. Гварда для легаси-пользователей, которые зарегистрировались до этой фичи: после логина, если `nickname IS NULL`, они отправляются на экран обязательного ввода никнейма.

**Supabase MCP доступен** — миграцию применяем через `mcp__supabase__apply_migration` (если MCP-коннект жив на момент реализации). Есть страховочный fallback на ручное применение через Supabase Studio.

## Решения, зафиксированные ранее

- Никнейм case-insensitive уникальный (`CREATE UNIQUE INDEX ... ON (LOWER(nickname))`), 3–20 символов, `[a-z0-9_]`.
- Телефон — просто `text` в profiles, без верификации.
- Рейтинг привязан к `case_date` (дата кейса), один результат на пользователя в день, UPSERT.
- Сессия кейса (фикс прошлой итерации) не затрагивается — оставляем `sd-daily-case-session` как есть.
- Легаси-юзеры получают редирект на `/profile/setup` из `AuthGuard`.

## Архитектурный подход

Три независимых блока, реализуемые последовательно. После Блока 1 БД готова. После Блока 2 новые пользователи регистрируются с никнеймом, старые проходят `profile/setup`. После Блока 3 рейтинг виден на экране результата.

| Блок | Что делает | Можно выкатить отдельно? |
|------|-----------|--------------------------|
| 1. Миграция БД | ALTER profiles + новая таблица `daily_case_results` + RLS | Да (код ещё не зависит) |
| 2. Регистрация + setup | Welcome с табами, форма setup, API check-nickname, гвард | Да, рейтинг пока не подключён |
| 3. Рейтинг | API `/api/daily-case/result` + `/api/daily-case/leaderboard` + компонент `DailyLeaderboard` | Требует 1 и 2 |

## Ключевые файлы

### Создаются
- `supabase/migrations/007_nicknames_and_leaderboard.sql`
- `src/app/profile/setup/page.tsx` — экран «Выбери никнейм» для легаси-юзеров и после регистрации
- `src/components/auth/NicknameField.tsx` — переиспользуемое поле с debounced-проверкой доступности
- `src/app/api/auth/check-nickname/route.ts`
- `src/app/api/profile/update/route.ts` — сохранение nickname/phone после регистрации
- `src/app/api/daily-case/result/route.ts` — UPSERT результата в `daily_case_results`
- `src/app/api/daily-case/leaderboard/route.ts` — GET рейтинга за дату
- `src/components/daily/DailyLeaderboard.tsx`
- `src/lib/validation/nickname.ts` — единая валидация (формат, длина) для клиента и сервера

### Модифицируются
- `src/app/welcome/page.tsx` — таб-переключатель «Войти / Регистрация», форма регистрации с nickname + phone
- `src/components/AuthGuard.tsx` — после загрузки user проверить `profiles.nickname IS NULL` → `router.replace("/profile/setup")`
- `src/contexts/AuthContext.tsx` — добавить `profile: { nickname, phone } | null` в контекст, подгрузка из `profiles` при SIGNED_IN
- `src/app/daily-case/page.tsx` — в `handleComplete` после `saveProgress` вызвать `POST /api/daily-case/result`
- `src/components/daily/DailyCaseResult.tsx` — встроить `<DailyLeaderboard date={dateStr} />` под кнопкой «Показать разбор» (или под `BreakdownAccordion` когда он открыт)
- `src/lib/supabase/sync.ts` — `pullProfile(userId)` добавить подгрузку nickname/phone в AuthContext (переиспользуемая функция)

### Читаются (не меняются)
- `src/app/api/_lib/auth.ts` — `authenticateRequest()` уже есть
- `src/app/globals.css` — `.input-refined`, `.btn-raised-dark`, `.divider-soft`
- `src/types/dailyCase.ts` — `StepResult`, `STEP_TIME_LIMIT`, `MAX_POINTS_PER_STEP`

---

## Блок 1 — Миграция БД

### Task 1.1: Создать миграционный файл

**Файл:** `supabase/migrations/007_nicknames_and_leaderboard.sql`

- [ ] **Шаг 1: Написать SQL**

```sql
-- 1. Profiles: nickname + phone
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Регистронезависимая уникальность никнейма (NULL допускается для существующих)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_ci_unique
  ON profiles (LOWER(nickname))
  WHERE nickname IS NOT NULL;

-- 3. Формат nickname: 3-20 символов, [a-z0-9_]
ALTER TABLE profiles
  ADD CONSTRAINT profiles_nickname_format
  CHECK (nickname IS NULL OR nickname ~ '^[a-z0-9_]{3,20}$');

-- 4. Таблица с результатами дня
CREATE TABLE IF NOT EXISTS daily_case_results (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  case_date date NOT NULL,
  case_id text NOT NULL,
  total_points int NOT NULL CHECK (total_points >= 0),
  max_points int NOT NULL CHECK (max_points > 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, case_date)
);

-- 5. Индекс под leaderboard-запрос (отбор по дате + сортировка по очкам)
CREATE INDEX IF NOT EXISTS idx_daily_case_results_leaderboard
  ON daily_case_results (case_date, total_points DESC);

-- 6. RLS
ALTER TABLE daily_case_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_case_results_select_authenticated"
  ON daily_case_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "daily_case_results_insert_self"
  ON daily_case_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_case_results_update_self"
  ON daily_case_results FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. RLS для SELECT профилей только по nickname — для leaderboard JOIN
-- profiles уже имеет политику SELECT на себя. Добавляем возможность читать чужой nickname (не email).
-- Делаем через VIEW public_profiles, чтобы не ослаблять основную политику.
CREATE OR REPLACE VIEW public_profiles AS
  SELECT id, nickname FROM profiles WHERE nickname IS NOT NULL;

GRANT SELECT ON public_profiles TO authenticated;
```

- [ ] **Шаг 2: Применить миграцию**

Если Supabase MCP активен — вызвать `mcp__supabase__apply_migration` (имя миграции `007_nicknames_and_leaderboard`, содержимое из файла). Если MCP недоступен — Supabase Studio → SQL Editor → вставить содержимое файла → Run.

Ожидаемый результат: таблица `daily_case_results` создана, у `profiles` появились колонки `nickname`, `phone`.

- [ ] **Шаг 3: Проверить через Studio**

Выполнить в SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
  WHERE table_name = 'profiles' AND column_name IN ('nickname','phone');
SELECT COUNT(*) FROM daily_case_results;
```

Ожидается: 2 строки (nickname, phone), и 0 результатов (таблица пуста).

- [ ] **Шаг 4: Коммит миграционного файла**

```bash
git add supabase/migrations/007_nicknames_and_leaderboard.sql
git commit -m "db: add nickname/phone to profiles and daily_case_results table"
```

---

## Блок 2 — Регистрация с никнеймом + гвард

### Task 2.1: Единая валидация никнейма

**Файл (новый):** `src/lib/validation/nickname.ts`

- [ ] **Шаг 1: Написать модуль**

```ts
export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 20;
export const NICKNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export type NicknameValidation =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateNickname(raw: string): NicknameValidation {
  const value = raw.trim().toLowerCase();
  if (value.length < NICKNAME_MIN) return { ok: false, error: `Минимум ${NICKNAME_MIN} символа` };
  if (value.length > NICKNAME_MAX) return { ok: false, error: `Максимум ${NICKNAME_MAX} символов` };
  if (!NICKNAME_PATTERN.test(value)) return { ok: false, error: "Только латиница, цифры и _" };
  return { ok: true, value };
}
```

### Task 2.2: API проверки уникальности

**Файл (новый):** `src/app/api/auth/check-nickname/route.ts`

- [ ] **Шаг 1: Реализовать**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateNickname } from "@/lib/validation/nickname";

export async function POST(req: NextRequest) {
  const { nickname } = await req.json();
  const v = validateNickname(String(nickname ?? ""));
  if (!v.ok) return NextResponse.json({ available: false, error: v.error });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("nickname", v.value)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ available: false, error: "Server error" }, { status: 500 });
  return NextResponse.json({ available: !data, normalized: v.value });
}
```

Rate-limit не делаем на первой итерации (endpoint низкочастотный, доступен только авторизованным не требуется — нужен и для регистрации).

### Task 2.3: API обновления профиля

**Файл (новый):** `src/app/api/profile/update/route.ts`

- [ ] **Шаг 1: Реализовать**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError, errorResponse } from "@/app/api/_lib/auth";
import { validateNickname } from "@/lib/validation/nickname";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const { nickname, phone } = await req.json();

    const v = validateNickname(String(nickname ?? ""));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const phoneStr = typeof phone === "string" ? phone.trim().slice(0, 20) : null;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await admin
      .from("profiles")
      .update({ nickname: v.value, phone: phoneStr, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Этот никнейм уже занят" }, { status: 409 });
      if (error.code === "23514") return NextResponse.json({ error: "Неверный формат никнейма" }, { status: 400 });
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, nickname: v.value });
  } catch (e) {
    if (e instanceof AuthError) return errorResponse(e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
```

Проверить наличие экспорта `errorResponse` из `_lib/auth.ts`; если нет — вернуть `NextResponse.json({ error: e.message }, { status: 401 })`.

### Task 2.4: NicknameField компонент

**Файл (новый):** `src/components/auth/NicknameField.tsx`

- [ ] **Шаг 1: Реализовать**

```tsx
"use client";
import { useEffect, useState } from "react";
import { validateNickname } from "@/lib/validation/nickname";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onValidityChange: (ok: boolean) => void;
}

type Status = "idle" | "checking" | "available" | "taken" | "invalid";

export default function NicknameField({ value, onChange, onValidityChange }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const v = validateNickname(value);
    if (!v.ok) {
      setStatus(value === "" ? "idle" : "invalid");
      setMessage(value === "" ? "" : v.error);
      onValidityChange(false);
      return;
    }

    setStatus("checking");
    setMessage("Проверяем...");
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/check-nickname", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: v.value }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (data.available) {
          setStatus("available"); setMessage("Свободен");
          onValidityChange(true);
        } else {
          setStatus("taken"); setMessage(data.error ?? "Занят");
          onValidityChange(false);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setStatus("invalid"); setMessage("Ошибка проверки");
          onValidityChange(false);
        }
      }
    }, 400);

    return () => { ctrl.abort(); clearTimeout(t); };
  }, [value, onValidityChange]);

  const color =
    status === "available" ? "text-emerald-600" :
    status === "taken" || status === "invalid" ? "text-rose-600" :
    "text-muted";

  return (
    <div className="flex flex-col gap-1">
      <input
        className="input-refined w-full px-4 py-3 rounded-xl text-sm text-foreground"
        type="text"
        autoComplete="off"
        inputMode="text"
        placeholder="никнейм"
        value={value}
        onChange={(e) => onChange(e.target.value.toLowerCase())}
        maxLength={20}
      />
      <span className={`text-[11px] ${color}`}>{message || "3-20 символов: a-z, 0-9, _"}</span>
    </div>
  );
}
```

### Task 2.5: Обновлённый welcome

**Файл:** `src/app/welcome/page.tsx`

- [ ] **Шаг 1: Добавить режим `mode: "signin" | "signup"`**

Верх формы — сегмент с двумя кнопками (в стиле `.btn-press`). Дефолт `signin` (чтобы не ломать возвращающихся пользователей).

- [ ] **Шаг 2: signin-ветка остаётся без изменений** (email → 8-значный OTP → авто-редирект)

- [ ] **Шаг 3: signup-ветка**

Шаги внутри режима signup:
1. Ввод email + nickname (`NicknameField`) + phone → кнопка «Получить код» (активна только когда nickname валиден и свободен, email заполнен).
2. После `signInWithEmail(email)` показываем OTP-8-полей (тот же UI что и в signin).
3. При успешной `verifyOtp` — вызываем `POST /api/profile/update` с nickname+phone, затем redirect на `/topics`.
4. Если `profile/update` вернул 409 «занят» (гонка — другой пользователь успел занять никнейм) — возвращаем на шаг 1 с подсвеченной ошибкой.

Компонент возвращает два отдельных JSX-дерева внутри `mode === "signup"`, общим остаётся контейнер с логотипом и сегментом.

### Task 2.6: Экран /profile/setup

**Файл (новый):** `src/app/profile/setup/page.tsx`

- [ ] **Шаг 1: Реализовать**

Форма с `NicknameField` + поле phone + кнопка «Сохранить». Submit → `POST /api/profile/update` → если ok → `router.replace("/topics")`. Не показываем BottomNav, максимально простой экран.

### Task 2.7: AuthContext подгружает profile

**Файл:** `src/contexts/AuthContext.tsx`

- [ ] **Шаг 1: Расширить тип контекста**

```ts
interface UserProfile { nickname: string | null; phone: string | null; }

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  // ... existing
}
```

- [ ] **Шаг 2: После `setUser(newUser)` при SIGNED_IN и при начальном getSession — загружать profile**

```ts
const loadProfile = async (userId: string) => {
  const { data } = await supabase.from("profiles")
    .select("nickname, phone").eq("id", userId).maybeSingle();
  setProfile(data ? { nickname: data.nickname, phone: data.phone } : null);
};
```

Вызывать в двух местах: начальный `getSession().then` и `onAuthStateChange` (SIGNED_IN).

### Task 2.8: AuthGuard редиректит на setup

**Файл:** `src/components/AuthGuard.tsx`

- [ ] **Шаг 1: Учитывать profile**

Добавить `/profile/setup` в `PUBLIC_PATHS` (доступен без nickname, но под авторизацией).

```ts
useEffect(() => {
  if (loading) return;
  if (!user && !isPublic) { router.replace("/welcome"); return; }
  if (user && profile && profile.nickname === null && pathname !== "/profile/setup") {
    router.replace("/profile/setup");
  }
}, [user, profile, loading, isPublic, pathname, router]);
```

Показывать spinner также пока `profile` грузится для залогиненного user.

### Task 2.9: Проверка через Claude Preview (Блок 2)

- [ ] **Шаг 1: Запустить preview_start `gastro-ed-dev`**

- [ ] **Шаг 2: Сценарий «Новая регистрация»**

В браузере: открыть `/welcome`, переключиться в «Регистрация», ввести email + nickname (проверить, что кнопка «Получить код» дизейблится при невалидном никнейме), phone. Кнопку нажать, на email придёт код (или можно в Supabase Studio взять код для тестового пользователя). Ввести код → ожидать редиректа на `/topics`. В Studio → profiles → запись с nickname/phone.

Если реальный email недоступен — заменить проверку на: `preview_eval` выполняет fetch `/api/auth/check-nickname` с валидным/занятым/кривым ником, сравнить ответы.

- [ ] **Шаг 3: Сценарий «Легаси-юзер без nickname»**

В Supabase Studio: `UPDATE profiles SET nickname=NULL WHERE id='<существующий_id>'`. Залогиниться этим пользователем → ожидать редирект на `/profile/setup`. Заполнить форму → редирект на `/topics`, профиль обновлён.

- [ ] **Шаг 4: Коммит Блока 2**

```bash
git add src/lib/validation src/components/auth src/app/api/auth src/app/api/profile \
        src/app/profile/setup src/app/welcome src/components/AuthGuard.tsx src/contexts/AuthContext.tsx
git commit -m "feat(auth): signup with unique nickname, legacy-user setup gate"
```

---

## Блок 3 — Рейтинг дня

### Task 3.1: API сохранения результата

**Файл (новый):** `src/app/api/daily-case/result/route.ts`

- [ ] **Шаг 1: Реализовать**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/app/api/_lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const body = await req.json();
    const { caseDate, caseId, totalPoints, maxPoints } = body;

    // Базовая валидация
    if (typeof caseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(caseDate))
      return NextResponse.json({ error: "Bad caseDate" }, { status: 400 });
    if (typeof caseId !== "string" || caseId.length === 0)
      return NextResponse.json({ error: "Bad caseId" }, { status: 400 });
    if (!Number.isFinite(totalPoints) || totalPoints < 0)
      return NextResponse.json({ error: "Bad totalPoints" }, { status: 400 });
    if (!Number.isFinite(maxPoints) || maxPoints <= 0)
      return NextResponse.json({ error: "Bad maxPoints" }, { status: 400 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error } = await admin.from("daily_case_results").upsert({
      user_id: userId,
      case_date: caseDate,
      case_id: caseId,
      total_points: totalPoints,
      max_points: maxPoints,
      completed_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: "Server error" }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
```

### Task 3.2: API получения рейтинга

**Файл (новый):** `src/app/api/daily-case/leaderboard/route.ts`

- [ ] **Шаг 1: Реализовать**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/app/api/_lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const date = req.nextUrl.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: "Bad date" }, { status: 400 });

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await admin
      .from("daily_case_results")
      .select("user_id, total_points, max_points, completed_at, profiles:user_id(nickname)")
      .eq("case_date", date)
      .order("total_points", { ascending: false })
      .order("completed_at", { ascending: true })
      .limit(100);

    if (error) return NextResponse.json({ error: "Server error" }, { status: 500 });

    const rows = (data ?? []).map((r: any, i: number) => ({
      position: i + 1,
      nickname: r.profiles?.nickname ?? "доктор",
      totalPoints: r.total_points,
      maxPoints: r.max_points,
      isSelf: r.user_id === userId,
    }));

    return NextResponse.json({ rows });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
```

Сортировка: сначала очки DESC, при равенстве — кто раньше завершил. Лимит 100.

### Task 3.3: Отправка результата в `handleComplete`

**Файл:** `src/app/daily-case/page.tsx`

- [ ] **Шаг 1: После `saveProgress(updated)` отправить результат на сервер**

```ts
// внутри handleComplete, после saveProgress(updated):
(async () => {
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token ?? (process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : null);
  if (!token) return;
  try {
    await fetch("/api/daily-case/result", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ caseDate: dateStr, caseId: dailyCase.id, totalPoints, maxPoints }),
    });
  } catch {
    // fail silently — рейтинг покажет "нет данных", прогресс не теряется
  }
})();
```

Импорт `getSupabase` из `@/lib/supabase/client`. Для локальной разработки (`NEXT_PUBLIC_DEV_MODE=true`) — используется dev-bypass, результат запишется на фиктивный userId.

### Task 3.4: Компонент DailyLeaderboard

**Файл (новый):** `src/components/daily/DailyLeaderboard.tsx`

- [ ] **Шаг 1: Реализовать**

```tsx
"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

interface Row {
  position: number;
  nickname: string;
  totalPoints: number;
  maxPoints: number;
  isSelf: boolean;
}

interface Props { date: string; }

export default function DailyLeaderboard({ date }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await getSupabase().auth.getSession();
        const token = session?.access_token ?? (process.env.NEXT_PUBLIC_DEV_MODE === "true" ? "dev-test-token" : null);
        if (!token) { setError("Нужен вход"); return; }
        const res = await fetch(`/api/daily-case/leaderboard?date=${encodeURIComponent(date)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error ?? "Не удалось загрузить"); return; }
        setRows(data.rows);
      } catch (e) {
        if (!cancelled) setError("Сетевая ошибка");
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  return (
    <section className="mt-6 rounded-2xl border border-border/60 bg-surface/70 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">Рейтинг дня</h3>
        {rows && <span className="text-[10px] text-muted">{rows.length} участников</span>}
      </div>

      {error && <div className="text-[12px] text-danger">{error}</div>}
      {!rows && !error && <div className="text-[12px] text-muted">Загружаем...</div>}
      {rows && rows.length === 0 && (
        <div className="text-[12px] text-muted">Вы первый сегодня — список обновится, когда кто-то ещё пройдёт кейс.</div>
      )}
      {rows && rows.length > 0 && (
        <ol className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={r.position}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-[13px] ${
                r.isSelf ? "bg-foreground/5 border border-foreground/20" : "bg-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-right text-muted font-medium tabular-nums">{r.position}</span>
                <span className="truncate">
                  {r.isSelf ? "Вы" : r.nickname}
                </span>
              </div>
              <span className="tabular-nums font-semibold">{r.totalPoints}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
```

### Task 3.5: Встроить в DailyCaseResult

**Файл:** `src/components/daily/DailyCaseResult.tsx`

- [ ] **Шаг 1: Добавить prop `dateStr` (если ещё нет) и рендер**

Под блоком `{showDetails && <BreakdownAccordion ... />}`:

```tsx
<DailyLeaderboard date={dateStr} />
```

Проверить, что `dateStr` уже прокидывается из `page.tsx` (в предыдущей итерации мы это сделали).

### Task 3.6: Проверка через Claude Preview

- [ ] **Шаг 1: Запустить preview_start `gastro-ed-dev`**

- [ ] **Шаг 2: В Supabase Studio предзаполнить БД**

```sql
INSERT INTO daily_case_results (user_id, case_date, case_id, total_points, max_points)
VALUES
  ('<real-uuid-1>', '2026-04-14', '<case-id>', 3800, 5000),
  ('<real-uuid-2>', '2026-04-14', '<case-id>', 2100, 5000);
UPDATE profiles SET nickname='doctor_smirnov' WHERE id='<real-uuid-1>';
UPDATE profiles SET nickname='neuro_junior' WHERE id='<real-uuid-2>';
```

(caseId посмотреть в `src/data/dailyCases.ts` для сегодняшней даты.)

- [ ] **Шаг 3: Пройти кейс как текущий пользователь**

Залогиниться → `/daily-case` → «Начать» → завершить. На экране результата ниже «Показать разбор» — виден `DailyLeaderboard`. В списке — три строки: две из сидов и «Вы» подсвеченной. Сортировка по очкам.

- [ ] **Шаг 4: preview_screenshot**

Снять скриншот блока рейтинга, приложить пользователю.

- [ ] **Шаг 5: Коммит**

```bash
git add src/app/api/daily-case src/components/daily/DailyLeaderboard.tsx \
        src/components/daily/DailyCaseResult.tsx src/app/daily-case/page.tsx
git commit -m "feat(daily-case): player leaderboard on result screen"
```

---

## Верификация end-to-end

После всех трёх блоков — прогнать сценарий целиком:

1. Новая регистрация → nickname занят → подсветить → сменить → получить OTP → ввести → попасть на `/topics`.
2. Открыть `/daily-case`, пройти кейс.
3. Результат → «Показать разбор» → виден список, где текущий пользователь подсвечен.
4. Выйти (signOut), залогиниться другим аккаунтом без nickname → редирект на `/profile/setup` → заполнить → `/topics`.
5. Пройти тот же кейс вторым пользователем → в рейтинге теперь 2 строки.

Если всё зелёное — снять финальный скриншот и закрыть задачу.

---

## Self-Review

**Покрытие требований пользователя:**
- [x] Рейтинг под кнопкой «Показать разбор» со списком сегодняшних прохождений → Блок 3, Task 3.4/3.5.
- [x] Никнейм индивидуальный с проверкой уникальности → Блок 1 (UNIQUE INDEX) + Блок 2 (API check-nickname + CHECK constraint).
- [x] Регистрация с номером телефона + email + никнейм → Блок 2, Task 2.5.
- [x] Первая страничка: выбор Регистрация/Войти → Блок 2, Task 2.5 (сегмент режимов).
- [x] При входе — структура как сейчас → Блок 2, Task 2.5 (ветка signin без изменений).
- [x] Легаси-юзеры проходят ввод никнейма → Блок 2, Task 2.8.

**Placeholder-скан:** все endpoint'ы, SQL и компоненты написаны полностью.

**Согласованность:**
- `validateNickname()` используется на клиенте (NicknameField) и сервере (check-nickname, profile/update) — одна логика.
- `daily_case_results` PK `(user_id, case_date)` совпадает с UPSERT-семантикой в Task 3.1.
- Лимит `limit(100)` в leaderboard совпадает с UI (список помещается).

**Риски / не делаем на этой итерации:**
- Нет rate-limit на `/api/auth/check-nickname` — при массовом абьюзе добавим отдельной задачей.
- Нет SMS-верификации телефона — согласовано с пользователем.
- Легаси-юзеры, не заходившие после выката — не пройдут setup до следующего логина (это ожидаемо).
- Кнопки «поделиться результатом» / аватарки в рейтинге — вне скоупа.
