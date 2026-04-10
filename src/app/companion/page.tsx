"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopBar from "@/components/ui/TopBar";
import CompanionChat from "@/components/medmind/CompanionChat";

function CompanionContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic");
  const question = searchParams.get("q");

  return (
    <CompanionChat
      contextTopic={topic || undefined}
      contextQuestion={question || undefined}
    />
  );
}

export default function CompanionPage() {
  return (
    <div className="h-screen flex flex-col">
      <TopBar showBack />
      <main className="flex-1 pt-14 overflow-hidden flex flex-col">
        <Suspense>
          <CompanionContent />
        </Suspense>
      </main>
    </div>
  );
}
