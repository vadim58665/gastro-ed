"use client";

import { useEffect } from "react";
import TopBar from "@/components/ui/TopBar";
import BottomNav from "@/components/ui/BottomNav";
import FeedProfile from "@/components/profile/FeedProfile";
import PrepProfile from "@/components/profile/PrepProfile";
import { useMode } from "@/contexts/ModeContext";
import { useMedMind } from "@/contexts/MedMindContext";

export default function ProfilePage() {
  const { mode } = useMode();
  const { setScreen } = useMedMind();

  useEffect(() => {
    setScreen({ kind: "profile" });
  }, [setScreen]);

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <main className="flex-1 pt-24 pb-20 overflow-y-auto">
        {mode === "prep" ? <PrepProfile /> : <FeedProfile />}
      </main>
      <BottomNav />
    </div>
  );
}
