"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function WelcomePage() {
  const { user, loading, signInWithEmail } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/topics");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: authError } = await signInWithEmail(email);
    setSubmitting(false);

    if (authError) {
      setError(authError);
    } else {
      setSent(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted font-medium mb-4">
            Медицинское образование
          </p>
          <h1 className="text-4xl font-extralight text-foreground tracking-tight mb-3">
            GastroEd
          </h1>
          <div className="w-12 h-px bg-border mx-auto mb-4" />
          <p className="text-sm text-muted font-light leading-relaxed">
            Подготовка к аккредитации и&nbsp;непрерывное
            медицинское образование
          </p>
        </div>

        {sent ? (
          /* OTP sent confirmation */
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground mb-2">
              Проверьте почту
            </h2>
            <p className="text-sm text-muted font-light mb-6">
              Мы отправили ссылку для входа на{" "}
              <span className="text-foreground font-medium">{email}</span>
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-xs text-muted hover:text-primary transition-colors uppercase tracking-wider font-medium"
            >
              Другой email
            </button>
          </div>
        ) : (
          /* Email form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-4 py-3.5 bg-card border border-border rounded-2xl text-base font-light text-foreground placeholder:text-muted/60 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !email}
              className="w-full py-3.5 bg-foreground text-background rounded-2xl text-sm font-medium tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? "Отправка..." : "Войти"}
            </button>

            <p className="text-[10px] text-muted text-center font-light leading-relaxed mt-4">
              Мы отправим магическую ссылку для входа.
              Пароль не&nbsp;нужен.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
