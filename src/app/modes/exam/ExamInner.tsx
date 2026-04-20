"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import QuestionView from "@/components/accreditation/QuestionView";
import BrowseFeed from "@/components/accreditation/BrowseFeed";
import ExamTimer from "@/components/accreditation/ExamTimer";
import ExamResultView from "@/components/accreditation/ExamResult";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { useAccreditation } from "@/hooks/useAccreditation";
import { getQuestionsForSpecialty } from "@/data/accreditation/index";
import type { TestQuestion, ExamResult } from "@/types/accreditation";

interface ExamAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type ExamType = "trial" | "learned" | "accreditation" | "mistakes" | "random" | "marathon" | "topic";

const EXAM_CONFIG: Record<ExamType, { title: string; count: number; timed: boolean; marathon: boolean }> = {
  trial:         { title: "Пробный экзамен",    count: 80,  timed: false, marathon: false },
  learned:       { title: "По изученным",       count: 80,  timed: false, marathon: false },
  accreditation: { title: "Аккредитация",       count: 80,  timed: true,  marathon: false },
  mistakes:      { title: "Работа над ошибками", count: 999, timed: false, marathon: false },
  random:        { title: "Случайные",          count: 50,  timed: false, marathon: false },
  marathon:      { title: "Марафон",            count: 999, timed: false, marathon: true  },
  topic:         { title: "По теме",            count: 999, timed: false, marathon: false },
};

export default function ExamInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeSpecialty, hydrated } = useSpecialty();
  const specialtyId = activeSpecialty?.id || "";
  const { progress, recordAnswer, saveExamResult, markQuestionLearned } = useAccreditation(specialtyId);

  const examType = (searchParams.get("type") || "trial") as ExamType;
  const blockFilter = useMemo(() => {
    const raw = searchParams.get("block");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);
  const config = EXAM_CONFIG[examType] || EXAM_CONFIG.trial;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [marathonFailed, setMarathonFailed] = useState(false);
  const [examAnswers, setExamAnswers] = useState<ExamAnswer[]>([]);

  const allQuestions = useMemo(
    () => getQuestionsForSpecialty(specialtyId),
    [specialtyId]
  );

  // Снапшот набора вопросов фиксируется один раз при монтировании —
  // иначе recordAnswer/markQuestionLearned в handleAnswer меняют
  // progress.blocks/mistakes → useMemo перезапускает shuffle →
  // questions[currentIndex] подменяется на другой вопрос, хотя индекс
  // тот же. Визуально это выглядит как «клик по ответу → другой вопрос,
  // счётчик тот же».
  const [questions] = useState<TestQuestion[]>(() => {
    let pool: TestQuestion[];

    // ?ids= — явный whitelist id-вопросов (используется для «По темам»
    // на /tests и в режимах /accreditation/mistakes). Применяется
    // поверх examType-фильтра если указан.
    const idsParam = searchParams.get("ids");
    const idWhitelist =
      idsParam && idsParam.length > 0
        ? new Set(idsParam.split(",").filter(Boolean))
        : null;

    switch (examType) {
      case "learned": {
        const learnedBlocks = new Set(
          progress.blocks.filter((b) => b.learned > 0).map((b) => b.blockNumber)
        );
        pool = allQuestions.filter((q) => learnedBlocks.has(q.blockNumber));
        break;
      }
      case "mistakes": {
        const mistakeSet = new Set(progress.mistakes);
        pool = allQuestions.filter(
          (q) =>
            mistakeSet.has(q.id) &&
            (blockFilter === null || q.blockNumber === blockFilter)
        );
        break;
      }
      case "topic": {
        // «По теме» = строгий набор id-вопросов из ?ids=
        pool = idWhitelist
          ? allQuestions.filter((q) => idWhitelist.has(q.id))
          : allQuestions;
        break;
      }
      default:
        pool = allQuestions;
    }

    // Применяем ids-whitelist поверх уже отфильтрованного пула (актуально
    // для type=mistakes + ids=, если нужна тема внутри ошибок).
    if (idWhitelist && examType !== "topic") {
      pool = pool.filter((q) => idWhitelist.has(q.id));
    }

    const shuffled = shuffle(pool);
    return shuffled.slice(0, config.count);
  });

  useEffect(() => {
    // Wait for SpecialtyContext to rehydrate; otherwise direct deep links
    // (/modes/exam?type=trial) bounce to /topics before the saved specialty
    // is restored from localStorage.
    if (!hydrated) return;
    if (!activeSpecialty) router.push("/topics");
  }, [activeSpecialty, hydrated, router]);

  const handleAnswer = useCallback(
    (isCorrect: boolean, selectedIndex: number) => {
      const q = questions[currentIndex];
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
      } else if (config.marathon) {
        setMarathonFailed(true);
      }
      if (q) {
        setExamAnswers((prev) => [
          ...prev,
          { questionId: q.id, selectedIndex, isCorrect },
        ]);
        recordAnswer(q.id, isCorrect);
        // Засчитываем правильно отвеченный вопрос в прогресс по блоку —
        // так пробный экзамен тоже двигает % готовности специальности.
        if (isCorrect) {
          markQuestionLearned(q.blockNumber, q.id);
        }
      }
    },
    [currentIndex, questions, recordAnswer, markQuestionLearned, config.marathon]
  );

  const handleNext = useCallback(() => {
    if (marathonFailed || currentIndex + 1 >= questions.length) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const total = marathonFailed ? currentIndex + 1 : questions.length;
      const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      const result: ExamResult = {
        total,
        correct: correctCount,
        percentage: pct,
        passed: pct >= 70,
        duration,
        timestamp: Date.now(),
      };
      saveExamResult(result);
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, questions.length, startTime, correctCount, saveExamResult, marathonFailed]);

  if (!hydrated || !activeSpecialty) return null;

  // Режим просмотра (`?mode=browse`) — лента всех подобранных вопросов с
  // подсвеченными правильными ответами, без прорешивания. Родительский
  // entity (блок / тема / ошибки) задаёт пул через examType; browse —
  // это layer сверху, переключатель представления.
  const viewMode = searchParams.get("mode");
  if (viewMode === "browse" && questions.length > 0) {
    const label =
      examType === "mistakes"
        ? blockFilter
          ? `Ошибки · блок ${blockFilter}`
          : "Все ошибки"
        : config.title;
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 overflow-y-auto">
          <BrowseFeed
            questions={questions}
            specialtyId={specialtyId}
            label={label}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 flex flex-col items-center justify-center px-6">
          <p className="text-sm text-muted text-center mb-4">
            Недостаточно вопросов для этого режима
          </p>
          <button
            onClick={() => router.push("/modes")}
            className="text-xs uppercase tracking-[0.15em] font-semibold text-primary"
          >
            Назад к режимам
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (finished) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const total = marathonFailed ? currentIndex + 1 : questions.length;
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const result: ExamResult = {
      total,
      correct: correctCount,
      percentage: pct,
      passed: pct >= 70,
      duration,
      timestamp: Date.now(),
    };

    return (
      <div className="h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-20 pb-20 flex flex-col">
          {config.marathon && marathonFailed && (
            <div className="text-center px-6 pt-6 pb-2">
              <p
                className="text-xs uppercase tracking-[0.15em] font-medium"
                style={{ color: "var(--color-aurora-pink)" }}
              >
                Марафон окончен
              </p>
            </div>
          )}
          <ExamResultView
            result={result}
            questions={questions.slice(0, total)}
            answers={examAnswers}
            onRestart={() => router.refresh()}
            // Открываем ту же сессию в режиме Просмотр: добавляем
            // ?mode=browse к текущему URL (type, block, ids сохраняются).
            onBrowseAll={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("mode", "browse");
              router.push(`/modes/exam?${params.toString()}`);
            }}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const current = questions[currentIndex];
  // Режимы из раздела «Экзамен» (+ марафон) — строгий экзамен: ответы
  // и разбор только в конце. Режимы из раздела «Тренировки» (mistakes,
  // random, topic) показывают верный ответ сразу, чтобы на ошибках/темах
  // можно было учиться по ходу. Параметр ?strict=1 форсит exam-режим
  // (ответы в конце) — используется из /accreditation/mistakes когда
  // пользователь выбирает «Экзамен» вместо «Тренировка».
  const strictParam = searchParams.get("strict");
  const mode =
    (examType === "mistakes" || examType === "random" || examType === "topic") &&
    strictParam !== "1"
      ? "test"
      : "exam";

  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-20 pb-20 overflow-y-auto">
        {/* Заголовок */}
        <div className="px-6 pt-4 pb-2 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-muted font-medium mb-1">
            {config.title}
          </p>
          <div className="text-2xl font-extralight text-foreground tracking-tight leading-none">
            {currentIndex + 1}{" "}
            <span className="text-muted">/ {questions.length}</span>
          </div>
        </div>

        {/* Таймер */}
        {config.timed && (
          <div className="px-6 mb-2">
            <ExamTimer totalSeconds={3600} onTimeUp={handleNext} />
          </div>
        )}

        {/* Прогресс */}
        <div className="px-6 mb-4">
          <div className="w-full h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Вопрос */}
        <div className="px-3">
          <div className="w-full max-w-lg mx-auto bg-card rounded-3xl border border-border card-shadow">
            <QuestionView
              key={current.id}
              question={current}
              mode={mode}
              specialtyId={specialtyId}
              onAnswer={handleAnswer}
              onNext={handleNext}
            />
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
