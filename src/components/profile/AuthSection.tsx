"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthSection() {
  const { user, signOut, loading } = useAuth();

  if (loading) return null;

  return (
    <>
      <div className="w-full divider-soft my-8" />
      <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-4 text-center">
        Облачная синхронизация
      </p>

      {user ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-foreground">{user.email}</p>
          <p className="text-xs text-success font-medium">
            Синхронизировано
          </p>
          <button
            onClick={() => signOut()}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Выйти
          </button>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <p className="text-sm text-muted">
            Сохраните прогресс между устройствами
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-7 py-3 rounded-full btn-premium-dark text-sm font-medium btn-press"
          >
            Войти
          </Link>
        </div>
      )}
    </>
  );
}
