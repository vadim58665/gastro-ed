"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase/client";
import NicknameField from "@/components/auth/NicknameField";

export default function ProfileSetupPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [nicknameValid, setNicknameValid] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Если неавторизован — уводим на welcome. Если уже есть nickname — на /topics.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/welcome");
      return;
    }
    if (profile && profile.nickname) {
      router.replace("/topics");
    }
  }, [user, profile, loading, router]);

  const handleValidityChange = useCallback((ok: boolean) => {
    setNicknameValid(ok);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nicknameValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError("Нужен вход");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname, phone: phone.trim() || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        setSubmitting(false);
        return;
      }

      await refreshProfile();
      router.replace("/topics");
    } catch {
      setError("Сетевая ошибка");
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted font-medium mb-4">
            Последний шаг
          </p>
          <h1 className="text-3xl font-extralight text-foreground tracking-tight mb-3">
            Выберите никнейм
          </h1>
          <div className="w-16 divider-soft mx-auto mb-4" />
          <p className="text-sm text-muted font-light leading-relaxed">
            Никнейм будет виден другим врачам в рейтинге «Диагноза дня».
            Почту никто не увидит.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <NicknameField
            value={nickname}
            onChange={setNickname}
            onValidityChange={handleValidityChange}
          />

          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Телефон (необязательно)"
            inputMode="tel"
            maxLength={20}
            className="input-refined w-full px-4 py-3.5 rounded-2xl text-base font-light text-foreground placeholder:text-muted/60"
          />

          {error && (
            <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !nicknameValid}
            className="btn-raised-dark w-full py-3.5 text-white rounded-2xl text-sm font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {submitting ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </div>
    </div>
  );
}
