import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Custom no-op lock: отключаем navigatorLock, который под React Strict Mode
  // в dev приводит к "Lock was released because another request stole it"
  // и зависанию getSession()/профильных запросов. Мы не используем multi-tab
  // session sync, так что последовательный доступ не нужен.
  client = createClient(url, key, {
    auth: {
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
