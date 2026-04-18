-- Расширяем prebuilt_content на пользовательско-сгенерированные материалы
-- (мнемоники, стишки, объяснения, планы обучения). Первый пользователь,
-- который попросит action по карточке, генерирует ответ и upsert-ит сюда.
-- Следующие пользователи получают его бесплатно — экономим токены.
-- user_saved_content продолжает жить как личная коллекция «В избранное».

alter table prebuilt_content
  drop constraint if exists prebuilt_content_content_type_check;

alter table prebuilt_content
  add constraint prebuilt_content_content_type_check
  check (content_type in (
    'hint',
    'explain_short',
    'explain_long',
    'mnemonic',
    'poem',
    'explanation',
    'learning_plan'
  ));

-- Write-путь наполняет кэш через service-role (см. /api/medmind/content),
-- RLS тут не обходим — клиент не пишет в prebuilt_content напрямую.
-- Чтение остаётся по существующей policy «только для подписчиков».
