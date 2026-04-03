"use client";

import Link from "next/link";
import type { ExamResult } from "@/types/accreditation";

interface Props {
  result: ExamResult;
}

export default function ExamResultView({ result }: Props) {
  const minutes = Math.floor(result.duration / 60);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className={`text-7xl font-extralight tracking-tight leading-none mb-2 ${
          result.passed ? "text-emerald-600" : "text-rose-500"
        }`}>
          {result.percentage}%
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted font-medium mb-1">
          {result.correct} из {result.total} правильно
        </p>
        <p className="text-xs text-muted mb-8">
          {minutes} мин
        </p>

        <div className="w-12 h-px bg-border mx-auto mb-8" />

        <div className={`inline-block px-4 py-2 rounded-xl text-sm font-medium mb-8 ${
          result.passed
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-600"
        }`}>
          {result.passed ? "Зачёт" : "Не сдано"}
        </div>

        <div className="space-y-3">
          <Link
            href="/modes"
            className="block w-full py-3 text-xs uppercase tracking-[0.15em] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Вернуться к режимам
          </Link>
        </div>
      </div>
    </div>
  );
}
