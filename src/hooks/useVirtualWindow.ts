"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

interface UseVirtualWindowOptions {
  itemCount: number;
  itemHeight: number | null;
  containerRef: RefObject<HTMLElement | null>;
  overscanBefore?: number;
  overscanAfter?: number;
}

interface UseVirtualWindowResult {
  startIndex: number;
  endIndex: number;
  currentIndex: number;
  topSpacerPx: number;
  bottomSpacerPx: number;
  measuredHeight: number;
}

// Fixed-height windowing: рендерим только окно вокруг текущей видимой карточки,
// остальное — пустые распорки нужной высоты. Рассчитано на списки, где все
// элементы одного размера (CardFeed: каждая карточка = 100vh контейнера).
// Для variable-height списков (BrowseFeed) нужен другой подход.
export function useVirtualWindow({
  itemCount,
  itemHeight,
  containerRef,
  overscanBefore = 2,
  overscanAfter = 3,
}: UseVirtualWindowOptions): UseVirtualWindowResult {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setMeasuredHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    const h = itemHeight ?? measuredHeight;
    if (!el || h === 0) return;

    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const idx = Math.max(0, Math.min(itemCount - 1, Math.round(el.scrollTop / h)));
        setCurrentIndex((prev) => (prev === idx ? prev : idx));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, itemCount, itemHeight, measuredHeight]);

  const effectiveHeight = itemHeight ?? measuredHeight;

  if (effectiveHeight === 0) {
    return {
      startIndex: 0,
      endIndex: Math.min(itemCount, 5),
      currentIndex: 0,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      measuredHeight: 0,
    };
  }

  const safeIndex = Math.max(0, Math.min(itemCount - 1, currentIndex));
  const startIndex = Math.max(0, safeIndex - overscanBefore);
  const endIndex = Math.min(itemCount, safeIndex + overscanAfter + 1);
  const topSpacerPx = startIndex * effectiveHeight;
  const bottomSpacerPx = Math.max(0, itemCount - endIndex) * effectiveHeight;

  return {
    startIndex,
    endIndex,
    currentIndex: safeIndex,
    topSpacerPx,
    bottomSpacerPx,
    measuredHeight: effectiveHeight,
  };
}
