"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  className?: string;
}

/**
 * Анимирует цифру от 0 до `value`. Запускается сразу при монтировании —
 * раньше обёртка в IntersectionObserver с threshold 0.3 не срабатывала,
 * если блок был скрыт под скроллом или только частично попадал в кадр,
 * и число навсегда оставалось нулём (BUG-002 на /daily-case).
 *
 * Также реагируем на смену пропса `value`: если значение пересчитали
 * (напр. refresh результата), перезапускаем анимацию.
 *
 * Уважаем `prefers-reduced-motion`: без анимации сразу показываем
 * конечное значение.
 */
export default function NumberTicker({ value, duration = 1200, className }: Props) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      setDisplay(value);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(value);
      return;
    }

    const from = 0;
    const to = value;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString("ru-RU")}</span>;
}
