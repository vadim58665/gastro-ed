"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const steps = [
  {
    title: "GastroEd",
    subtitle: "ИНТЕРАКТИВНОЕ ОБУЧЕНИЕ ГАСТРОЭНТЕРОЛОГИИ",
    button: "Далее",
  },
  {
    title: "198",
    subtitle: "КАРТОЧЕК · 7 ТИПОВ ЗАДАНИЙ · 17 ТЕМ",
    button: "Далее",
  },
  {
    title: "Готовы?",
    subtitle: "УЧИТЕСЬ ПО 10 КАРТОЧЕК В ДЕНЬ",
    button: "Начать",
  },
];

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-8">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        <h1 className="text-6xl font-extralight text-foreground text-center">
          {current.title}
        </h1>

        <div className="w-12 h-px bg-border" />

        <p className="text-xs uppercase tracking-widest text-muted text-center">
          {current.subtitle}
        </p>

        <div className="mt-12">
          <button
            onClick={handleNext}
            className="px-10 py-4 rounded-full bg-foreground text-background font-medium"
          >
            {current.button}
          </button>
        </div>
      </div>
    </div>
  );
}
