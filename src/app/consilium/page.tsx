"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import { useSubscription } from "@/hooks/useSubscription";
import { getSupabase } from "@/lib/supabase/client";
import ConsiliumHero from "@/components/consilium/ConsiliumHero";
import ConsiliumChat, { type ChatMessage } from "@/components/consilium/ConsiliumChat";
import ConsiliumReview, { type Evaluation } from "@/components/consilium/ConsiliumReview";

type Phase = "idle" | "chat" | "evaluating" | "review";

const INTRO_MESSAGE =
  "Начни приём. Представься как пациент и опиши свою жалобу в 1-2 предложениях.";

export default function ConsiliumPage() {
  const router = useRouter();
  const { isPro } = useSubscription();

  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [userDiagnosis, setUserDiagnosis] = useState<string>("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canDiagnose = messages.filter((m) => m.role === "assistant").length >= 2;

  if (!isPro) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack />
        <main className="flex-1 pt-24 pb-20 flex items-center justify-center px-6 relative">
          <div className="aurora-welcome-band absolute top-20 left-0 right-0" />
          <div className="relative">
            <ConsiliumHero
              eyebrow="Консилиум"
              title="AI-пациент ждёт приёма"
              description="Собирайте анамнез, задавайте вопросы, назначайте обследования и поставьте диагноз. AI оценит вашу работу."
              ctaLabel="Подключить подписку"
              onCta={() => router.push("/subscription")}
            />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  async function fetchAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const session = await getSupabase().auth.getSession();
    const token = session.data.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  async function startSession() {
    setMessages([]);
    setEvaluation(null);
    setUserDiagnosis("");
    setStartedAt(Date.now());
    setPhase("chat");
    await streamPatient([], INTRO_MESSAGE, { trackUserMsg: false });
  }

  async function sendQuestion(text: string) {
    const userMsg: ChatMessage = { role: "user", content: text };
    await streamPatient(messages, text, { trackUserMsg: true, newMsg: userMsg });
  }

  async function streamPatient(
    history: ChatMessage[],
    message: string,
    opts: { trackUserMsg: boolean; newMsg?: ChatMessage }
  ) {
    setIsStreaming(true);
    if (opts.trackUserMsg && opts.newMsg) {
      setMessages((prev) => [...prev, opts.newMsg!]);
    }

    try {
      abortRef.current = new AbortController();
      const headers = await fetchAuthHeaders();

      const res = await fetch("/api/medmind/consilium", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "patient", history, message }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (typeof parsed.text === "string") {
              if (!assistantAdded) {
                setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
                assistantAdded = true;
              }
              accumulated += parsed.text;
              const snapshot = accumulated;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: snapshot };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Ошибка соединения. Попробуйте ещё раз." },
        ]);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  async function submitDiagnosis(diagnosis: string) {
    setUserDiagnosis(diagnosis);
    setPhase("evaluating");
    try {
      const headers = await fetchAuthHeaders();
      const res = await fetch("/api/medmind/consilium", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "evaluate", history: messages, message: diagnosis }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Evaluation;
      setEvaluation(data);
      setPhase("review");
    } catch {
      setEvaluation({
        correct: false,
        actualDiagnosis: "",
        anamnesisScore: 0,
        questionsScore: 0,
        diagnosticsScore: 0,
        missed: [],
        advice: "Ошибка соединения. Попробуйте ещё раз позже.",
      });
      setPhase("review");
    }
  }

  function handleBack() {
    if (phase === "chat") {
      if (messages.length <= 1 || window.confirm("Прервать приём?")) {
        abortRef.current?.abort();
        setPhase("idle");
        setMessages([]);
      }
      return;
    }
    if (phase === "review") {
      setPhase("idle");
      setMessages([]);
      setEvaluation(null);
      return;
    }
    router.back();
  }

  if (phase === "idle") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack onBack={handleBack} />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6 relative">
          <div className="aurora-welcome-band absolute top-20 left-0 right-0" />
          <div className="relative">
            <ConsiliumHero
              eyebrow="Консилиум"
              title="Ведите приём AI-пациента"
              description="Собирайте анамнез, задавайте вопросы, назначайте обследования и поставьте диагноз. AI оценит вашу работу."
              ctaLabel="Начать приём"
              onCta={startSession}
            />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack onBack={handleBack} />
        <main className="flex-1 pt-24 pb-24 flex items-center justify-center px-6">
          <div className="text-center">
            <p
              className="text-[10px] uppercase tracking-[0.28em] font-semibold mb-3"
              style={{ color: "var(--color-aurora-violet)" }}
            >
              Анализ приёма
            </p>
            <h2 className="text-xl font-extralight aurora-text tracking-tight mb-5">
              AI оценивает вашу работу
            </h2>
            <div className="flex justify-center">
              <div
                className="w-12 h-12 rounded-full animate-spin"
                style={{
                  borderWidth: "3px",
                  borderStyle: "solid",
                  borderColor: "var(--aurora-indigo-border)",
                  borderTopColor: "var(--color-aurora-violet)",
                }}
                aria-label="Загрузка"
              />
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (phase === "review" && evaluation) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar showBack onBack={handleBack} />
        <main className="flex-1 pt-24 pb-24 overflow-y-auto">
          <ConsiliumReview
            evaluation={evaluation}
            userDiagnosis={userDiagnosis}
            onNewPatient={startSession}
            onGoToStudy={() => router.push("/topics")}
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col">
      <TopBar showBack onBack={handleBack} />
      <main className="flex-1 flex flex-col min-h-0 pt-[72px] pb-[72px]">
        <ConsiliumChat
          messages={messages}
          isStreaming={isStreaming}
          startedAt={startedAt}
          canDiagnose={canDiagnose}
          onSend={sendQuestion}
          onDiagnose={submitDiagnosis}
        />
      </main>
      <BottomNav />
    </div>
  );
}
