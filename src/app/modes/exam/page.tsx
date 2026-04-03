"use client";

import { Suspense } from "react";
import ExamInner from "./ExamInner";

export default function ExamPage() {
  return (
    <Suspense fallback={null}>
      <ExamInner />
    </Suspense>
  );
}
