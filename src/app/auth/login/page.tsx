"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function LoginPage() {
  const { signInWithEmail, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newOtp.join("");
    if (code.length === 8) {
      submitOtp(code);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 8);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 8; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtp(newOtp);
    if (pasted.length === 8) {
      submitOtp(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const submitOtp = async (code: string) => {
    setError(null);
    setLoading(true);
    const { error: authError } = await verifyOtp(email, code);
    setLoading(false);
    if (authError) {
      setError("Неверный код. Проверьте и попробуйте снова.");
      setOtp(["", "", "", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    await signInWithEmail(email);
    setLoading(false);
    setOtp(["", "", "", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/85 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <span
            className="text-sm font-semibold tracking-wide aurora-text"
          >
            УмныйВрач
          </span>
        </div>
      </header>

      <div className="aurora-welcome-band" />

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3" style={{ color: "var(--color-aurora-violet)" }}>
              Вход
            </p>
            <h1 className="text-4xl font-extralight text-foreground tracking-tight mb-2">
              <span className="aurora-text">Добро пожаловать</span>
            </h1>
            <p className="text-sm text-muted">
              Сохраните прогресс между устройствами
            </p>
          </div>

          <div className="relative rounded-3xl aurora-hairline bg-card p-6 sm:p-7 shadow-[var(--shadow-aurora-md)]">

          {sent ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-surface border border-border p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted font-semibold mb-1.5">
                  8-значный код
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  Отправлен на
                </p>
                <p className="text-sm font-semibold text-foreground truncate">{email}</p>
              </div>

              <div className="flex justify-center gap-1.5" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={loading}
                    className="aurora-otp-cell w-10 h-13 sm:w-11 sm:h-14 rounded-xl border border-border bg-card text-center text-xl font-light text-foreground disabled:opacity-50"
                    style={{ height: "3.25rem" }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-center" style={{ color: "var(--color-aurora-pink)" }}>{error}</p>
              )}

              {loading && (
                <div className="flex justify-center">
                  <div
                    className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--color-aurora-indigo)", borderTopColor: "transparent" }}
                  />
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-[10px] text-muted uppercase tracking-[0.22em] font-semibold disabled:opacity-50 aurora-hover-pink transition-colors"
                >
                  Отправить снова
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => { setSent(false); setEmail(""); setOtp(["", "", "", "", "", "", "", ""]); setError(null); }}
                  className="text-[10px] text-muted uppercase tracking-[0.22em] font-semibold aurora-hover-pink transition-colors"
                >
                  Другой email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.24em] text-muted font-semibold mb-2">
                  Электронная почта
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@example.com"
                  required
                  className="input-refined w-full px-4 py-3 rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: "var(--color-aurora-pink)" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-press btn-premium-dark w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-[0.22em] disabled:opacity-50"
              >
                {loading ? "Отправка..." : "Получить код"}
              </button>
            </form>
          )}

          </div>

          <div className="mt-6 text-center">
            <Link
              href="/feed"
              className="text-xs text-muted uppercase tracking-[0.22em] font-semibold aurora-hover-pink transition-colors"
            >
              Продолжить без входа
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
