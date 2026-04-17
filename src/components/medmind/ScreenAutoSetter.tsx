"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useMedMind, type ScreenContext } from "@/contexts/MedMindContext";

/**
 * Defaults MedMind.screen for pages that don't own a specific entity context
 * (profile, topics, tests list, etc.). Pages with detailed context (feed card,
 * accreditation question, exam) overwrite it via their own useEffect — since
 * those effects run after this one, the specific screen wins.
 */
export default function ScreenAutoSetter() {
  const pathname = usePathname();
  const { setScreen } = useMedMind();

  useEffect(() => {
    const next = screenForPath(pathname);
    if (next) setScreen(next);
  }, [pathname, setScreen]);

  return null;
}

function screenForPath(pathname: string): ScreenContext | null {
  // Pages that set their own detailed screen — skip here.
  if (pathname.startsWith("/feed")) return null;
  if (pathname.startsWith("/tests/") && pathname !== "/tests") return null;
  if (pathname.startsWith("/modes/exam")) return null;
  // DailyCasePlayer сам выставит daily_case_step при каждом шаге.
  if (pathname.startsWith("/daily-case")) return null;
  if (pathname.startsWith("/profile") && !pathname.startsWith("/profile/setup")) {
    // /profile owns its screen, but /profile/setup is pre-auth.
    return null;
  }

  if (pathname === "/topics" || pathname === "/specialties") {
    return { kind: "topics" };
  }
  if (pathname === "/tests" || pathname.startsWith("/modes")) {
    return { kind: "tests_list" };
  }

  return { kind: "other", label: pathname.replace(/^\//, "") || "главная" };
}
