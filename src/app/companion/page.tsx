"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import CompanionChat from "@/components/medmind/CompanionChat";
import type { PostAction } from "@/components/medmind/PostAnswerActions";

const VALID_ACTIONS: ReadonlySet<PostAction> = new Set([
  "explain",
  "mnemonic",
  "poem",
  "image",
  "plan",
]);

function CompanionContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic");
  const question = searchParams.get("q");
  const actionParam = searchParams.get("action");
  const initialAction = VALID_ACTIONS.has(actionParam as PostAction)
    ? (actionParam as PostAction)
    : undefined;

  return (
    <CompanionChat
      contextTopic={topic || undefined}
      contextQuestion={question || undefined}
      initialAction={initialAction}
    />
  );
}

function CompanionTopBar() {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      window.history.back();
    } else {
      router.push("/feed");
    }
  };
  return <TopBar showBack onBack={handleBack} />;
}

export default function CompanionPage() {
  return (
    <div className="h-screen flex flex-col">
      <CompanionTopBar />
      <main className="flex-1 pt-14 overflow-hidden flex flex-col">
        <Suspense>
          <CompanionContent />
        </Suspense>
      </main>
    </div>
  );
}
