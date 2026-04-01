"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signInWithEmail(email);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-white/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <span className="text-sm font-medium tracking-wide text-foreground">
            GastroEd
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-extralight text-foreground mb-2">
            Вход
          </h1>
          <p className="text-sm text-muted mb-8">
            Сохраните прогресс между устройствами
          </p>

          {sent ? (
            <div className="bg-surface rounded-xl p-6 border border-border">
              <p className="text-sm text-foreground leading-relaxed">
                Ссылка для входа отправлена на{" "}
                <span className="font-medium">{email}</span>. Проверьте почту и
                перейдите по ссылке.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.2em] text-muted font-medium mb-2">
                  Электронная почта
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-border bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <p className="text-sm text-danger">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-medium btn-press transition-colors disabled:opacity-50"
              >
                {loading ? "Отправка..." : "Получить ссылку"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/feed"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Продолжить без входа
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
