"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_PATHS = ["/welcome", "/auth", "/profile/setup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, profileConfirmed, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  // Ведём на setup ТОЛЬКО если профиль подтверждённо без nickname.
  // Неизвестное состояние (profileConfirmed=false) не триггерит редирект —
  // пускаем юзера в приложение оптимистично, фоновый loadProfile уточнит.
  const needsSetup =
    !!user &&
    profileConfirmed &&
    profile !== undefined &&
    profile !== null &&
    profile.nickname === null;

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace("/welcome");
      return;
    }
    if (needsSetup && pathname !== "/profile/setup") {
      router.replace("/profile/setup");
    }
  }, [user, loading, isPublic, needsSetup, pathname, router]);

  if (loading || (user && profile === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }

  if (needsSetup && pathname !== "/profile/setup") {
    return null;
  }

  return <>{children}</>;
}
