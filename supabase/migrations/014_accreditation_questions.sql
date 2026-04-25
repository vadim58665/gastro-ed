-- Миграция банка тестовых вопросов для раздела «Подготовка к аккредитации».
-- 301k вопросов из «Мед. тестов» — плоский row-per-question table, индексы
-- для быстрой выборки по (специальность, блок, номер). Аутентифицированным
-- юзерам — чтение, запись только через service_role (скрипт импорта).

create table public.test_questions (
  id              text        primary key,           -- stable id из приложения-источника (e.g. "z0o6f7m2ck4b80sa")
  section         text        not null,              -- ПСА_ординатура, Первичная_аккредитация_специалитет, ...
  specialty_id    text        not null,              -- slug: "31_08_09_rentgenologiya"
  specialty_name  text        not null,              -- "Рентгенология"
  block_number    int         not null,              -- 1-based, computed: ceil(num / 100)
  num             int         not null,              -- 1-based глобальный номер внутри специальности
  question        text        not null,
  options         jsonb       not null,              -- ["вариант 0","вариант 1",...]
  correct_idx     smallint    not null check (correct_idx >= 0 and correct_idx <= 7),
  picture         text,                              -- имя файла в Storage bucket, NULL если нет
  created_at      timestamptz not null default now()
);

-- Доступ к специальности сортированно по номеру — основной запрос ленты/блока.
create index test_questions_specialty_num_idx
  on public.test_questions (specialty_id, num);

-- Навигация по блокам одной специальности (TestsPage blocks view).
create index test_questions_specialty_block_idx
  on public.test_questions (specialty_id, block_number);

-- Листинг специальностей в секции (SpecialtyListView).
create index test_questions_section_specialty_idx
  on public.test_questions (section, specialty_id);

-- Категория → специальность → количество вопросов/блоков.
create materialized view public.test_specialty_counts as
  select
    section,
    specialty_id,
    specialty_name,
    count(*)::int                            as total_questions,
    max(block_number)::int                   as block_count,
    count(*) filter (where picture is not null)::int as picture_count
  from public.test_questions
  group by section, specialty_id, specialty_name;

create unique index test_specialty_counts_id_idx
  on public.test_specialty_counts (specialty_id);

-- RLS: читать можно любому аутентифицированному пользователю,
-- писать только service_role (через скрипт импорта).
alter table public.test_questions enable row level security;

create policy "test_questions read for authenticated"
  on public.test_questions
  for select
  to authenticated
  using (true);

-- Anonymous пользователи (незалогиненные) тоже могут читать — тесты
-- доступны в режиме «ознакомления» до регистрации.
create policy "test_questions read for anon"
  on public.test_questions
  for select
  to anon
  using (true);

-- Грант на materialized view (Postgres требует явных прав).
grant select on public.test_specialty_counts to anon, authenticated;
