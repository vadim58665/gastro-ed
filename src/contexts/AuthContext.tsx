"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { getSupabase } from "@/lib/supabase/client";
import { fullSync } from "@/lib/supabase/sync";

export interface UserProfile {
  nickname: string | null;
  phone: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null | undefined;
  // true = профиль подтверждён из сети или кеша; false = оптимистичный fallback
  // (ещё не знаем точно, может быть нужен setup). AuthGuard уводит на setup
  // только при profileConfirmed && profile.nickname === null.
  profileConfirmed: boolean;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: undefined,
  profileConfirmed: false,
  loading: true,
  signInWithEmail: async () => ({ error: null }),
  verifyOtp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const PROFILE_CACHE_KEY = "sd-profile-cache";

function loadCachedProfile(userId: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; profile: UserProfile };
    if (parsed.userId !== userId) return null;
    return parsed.profile;
  } catch {
    return null;
  }
}

function saveCachedProfile(userId: string, profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile }));
  } catch {
    /* ignore */
  }
}

function clearCachedProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // undefined = ещё не загружали; null = загружено, но профиля нет; объект = есть
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [profileConfirmed, setProfileConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Возвращает true если профиль успешно обновлён из сети.
  // Если вернул false — значит была ошибка/таймаут, кешированный профиль
  // (если есть) остаётся в силе, и мы НЕ перезаписываем его на `null nickname`.
  const loadProfile = useCallback(async (userId: string): Promise<boolean> => {
    const supabase = getSupabase();
    // Safety net: если запрос зависнет, не держим AuthGuard на спиннере вечно.
    const query = supabase
      .from("profiles")
      .select("nickname, phone")
      .eq("id", userId)
      .maybeSingle();
    const TIMEOUT_SENTINEL = Symbol("timeout");
    const timeout = new Promise<typeof TIMEOUT_SENTINEL>((resolve) =>
      setTimeout(() => resolve(TIMEOUT_SENTINEL), 15000)
    );
    const result = await Promise.race([query, timeout]);
    if (result === TIMEOUT_SENTINEL) {
      console.warn("[Auth] loadProfile timeout - keeping cached profile");
      return false;
    }
    const { data, error } = result as {
      data: { nickname: string | null; phone: string | null } | null;
      error: { message: string; code?: string } | null;
    };
    if (error) {
      console.error("[Auth] loadProfile error:", error);
      return false;
    }
    console.log("[Auth] loadProfile ok, data=", data);
    if (data) {
      const next: UserProfile = {
        nickname: data.nickname ?? null,
        phone: data.phone ?? null,
      };
      setProfile(next);
      setProfileConfirmed(true);
      saveCachedProfile(userId, next);
    } else {
      // Профиля действительно нет в БД (строка не найдена) — новый юзер.
      setProfile({ nickname: null, phone: null });
      setProfileConfirmed(true);
      clearCachedProfile();
    }
    return true;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;
    let initialHandled = false;

    // Safety net: если по какой-то причине первое событие не придёт,
    // не держим AuthGuard вечно на спиннере.
    const loadingTimeout = setTimeout(() => {
      if (!cancelled && !initialHandled) {
        initialHandled = true;
        setLoading(false);
      }
    }, 4000);

    const finishInitial = () => {
      if (!initialHandled) {
        initialHandled = true;
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      const newUser = session?.user ?? null;
      setUser(newUser);

      // Любое первое событие (INITIAL_SESSION / SIGNED_IN / TOKEN_REFRESHED)
      // завершает начальную загрузку. Supabase-js отдаёт одно из них сразу
      // при подписке — какое именно зависит от состояния хранилища.
      const isFirst = !initialHandled;

      if (newUser) {
        if (isFirst) {
          // Мгновенно хидратируем профиль из кеша — он считается подтверждённым
          // (юзер уже заходил и загружал его хотя бы раз).
          const cached = loadCachedProfile(newUser.id);
          if (cached) {
            setProfile(cached);
            setProfileConfirmed(true);
          } else {
            // Нет кеша — оптимистичный fallback. AuthGuard не уведёт на setup,
            // пока profileConfirmed=false. Фоновый loadProfile подтвердит.
            setProfile({ nickname: null, phone: null });
            setProfileConfirmed(false);
          }

          // Снимаем спиннер сразу — сеть догрузит профиль в фоне.
          finishInitial();

          if (event === "SIGNED_IN" && posthog.__loaded) {
            posthog.identify(newUser.id, { email: newUser.email });
          }
          fullSync(newUser.id).catch(console.error);

          // Фоновое обновление профиля. Если упадёт — profileConfirmed
          // останется false, и AuthGuard не уведёт ошибочно на setup.
          loadProfile(newUser.id).catch((e) => {
            console.error("loadProfile failed", e);
          });
        } else if (event === "SIGNED_IN") {
          // Последующий SIGNED_IN (напр. token refresh перевыпустил) —
          // НЕ сбрасываем profile, просто тихо обновляем в фоне.
          if (posthog.__loaded) {
            posthog.identify(newUser.id, { email: newUser.email });
          }
          fullSync(newUser.id).catch(console.error);
          loadProfile(newUser.id).catch((e) => {
            console.error("loadProfile failed", e);
          });
        }
      } else {
        // Нет юзера
        setProfile(null);
        clearCachedProfile();
        if (event === "SIGNED_OUT" && posthog.__loaded) {
          posthog.reset();
        }
      }

      if (isFirst && !cancelled) finishInitial();
    });

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Re-sync when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        fullSync(user.id).catch(console.error);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  const signInWithEmail = useCallback(async (email: string) => {
    const supabase = getSupabase();
    // Единый флоу: любой email получает код. Новый → auth.users создаётся,
    // далее AuthGuard уведёт на /profile/setup для ввода никнейма.
    const { error } = await supabase.auth.signInWithOtp({ email });
    return { error: error?.message ?? null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setProfileConfirmed(false);
    clearCachedProfile();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        profileConfirmed,
        loading,
        signInWithEmail,
        verifyOtp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
