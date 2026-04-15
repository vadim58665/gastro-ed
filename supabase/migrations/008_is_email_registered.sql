-- Функция проверяет, есть ли у данного email профиль с непустым nickname.
-- Используется публичным API /api/auth/check-email для гейтинга signin.
CREATE OR REPLACE FUNCTION public.is_email_registered(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(u.email) = lower(p_email)
      AND p.nickname IS NOT NULL
  );
$$;

-- Доступ только для service role (anon/authenticated не нужен — вызов через API).
REVOKE ALL ON FUNCTION public.is_email_registered(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_email_registered(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_registered(text) TO service_role;
