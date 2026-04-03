"use client";

import Link from "next/link";

export default function EmptySpecialty({ specialtyName }: { specialtyName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl font-extralight text-foreground tracking-tight leading-none mb-3">
          0
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-2">
          карточек
        </p>
        <div className="w-12 h-px bg-border mx-auto my-6" />
        <p className="text-sm text-muted leading-relaxed max-w-[260px] mx-auto mb-8">
          Контент для специальности &laquo;{specialtyName}&raquo; находится в разработке
        </p>
        <Link
          href="/topics"
          className="text-xs uppercase tracking-[0.15em] text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Выбрать другую специальность
        </Link>
      </div>
    </div>
  );
}
