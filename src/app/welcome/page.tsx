"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function WelcomePage() {
  const { user, loading, signInWithEmail, verifyOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/topics");
    }
  }, [user, loading, router]);

  function translateError(msg: string): string {
    if (msg.includes("rate limit")) return "Слишком частые запросы. Подождите минуту.";
    if (msg.includes("invalid")) return "Неверный email.";
    return msg;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: authError } = await signInWithEmail(email);
    setSubmitting(false);

    if (authError) {
      setError(translateError(authError));
      if (authError.includes("rate limit")) {
        setCooldown(60);
      }
    } else {
      setSent(true);
      setCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Allow only digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 8 digits entered
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
    setSubmitting(true);
    const { error: authError } = await verifyOtp(email, code);
    setSubmitting(false);
    if (authError) {
      setError("Неверный код. Проверьте и попробуйте снова.");
      setOtp(["", "", "", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setSubmitting(true);
    const { error: authError } = await signInWithEmail(email);
    setSubmitting(false);
    if (authError) {
      setError(translateError(authError));
    } else {
      setOtp(["", "", "", "", "", "", "", ""]);
      setCooldown(60);
      inputRefs.current[0]?.focus();
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
            УмныйВрач
          </h1>
          <div className="w-16 divider-soft mx-auto mb-4" />
          <p className="text-sm text-muted font-light leading-relaxed">
            Подготовка к аккредитации и&nbsp;непрерывное
            медицинское образование
          </p>
        </div>

        {sent ? (
          /* OTP code input */
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-light text-foreground mb-2">
              Введите код
            </h2>
            <p className="text-sm text-muted font-light mb-6">
              Отправили 8-значный код на{" "}
              <span className="text-foreground font-medium">{email}</span>
            </p>

            {/* 8 digit inputs */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handleOtpPaste}>
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
                  disabled={submitting}
                  className="w-11 h-14 rounded-xl border border-border bg-card text-center text-xl font-light text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium mb-4">{error}</p>
            )}

            {submitting && (
              <div className="flex justify-center mb-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={handleResend}
                disabled={submitting || cooldown > 0}
                className="text-xs text-muted hover:text-primary transition-colors uppercase tracking-wider font-medium disabled:opacity-50"
              >
                {cooldown > 0 ? `Повторно через ${cooldown} сек` : "Отправить снова"}
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
          /* Email form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="input-refined w-full px-4 py-3.5 rounded-2xl text-base font-light text-foreground placeholder:text-muted/60"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-500 font-medium px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !email}
              className="btn-raised-dark w-full py-3.5 text-background rounded-2xl text-sm font-medium tracking-wide disabled:opacity-40"
            >
              {submitting ? "Отправка..." : "Получить код"}
            </button>

            <p className="text-[10px] text-muted text-center font-light leading-relaxed mt-4">
              Мы отправим 8-значный код на вашу почту.
              Пароль не&nbsp;нужен.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
