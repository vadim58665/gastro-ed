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
      <header className="bg-white/90 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <span className="text-sm font-medium tracking-wide text-foreground">
            УмныйВрач
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
            <div className="space-y-6">
              <div className="bg-surface rounded-xl p-6 border border-border">
                <p className="text-sm text-foreground leading-relaxed mb-1">
                  Введите 8-значный код, отправленный на
                </p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>

              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                    className="w-11 h-14 rounded-xl border border-border bg-card text-center text-xl font-light text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {error && (
                <p className="text-sm text-danger text-center">{error}</p>
              )}

              {loading && (
                <div className="flex justify-center">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs text-muted hover:text-primary transition-colors uppercase tracking-wider font-medium disabled:opacity-50"
                >
                  Отправить снова
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={() => { setSent(false); setEmail(""); setOtp(["", "", "", "", "", "", "", ""]); setError(null); }}
                  className="text-xs text-muted hover:text-primary transition-colors uppercase tracking-wider font-medium"
                >
                  Другой email
                </button>
              </div>
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
                  className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
                {loading ? "Отправка..." : "Получить код"}
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
