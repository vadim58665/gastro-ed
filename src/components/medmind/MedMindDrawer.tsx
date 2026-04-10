"use client";

import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import MedMindTips from "./MedMindTips";
import MedMindSession from "./MedMindSession";
import MedMindChat from "./MedMindChat";

interface Props {
  open: boolean;
  onClose: () => void;
}

type Tab = "chat" | "tips" | "session";

export default function MedMindDrawer({ open, onClose }: Props) {
  const { engagementLevel } = useSubscription();
  const hasChat = engagementLevel === "maximum";
  const [activeTab, setActiveTab] = useState<Tab>(hasChat ? "chat" : "tips");

  const height = engagementLevel === "maximum" ? "h-[85vh]" : "h-[60vh]";

  const tabs: { key: Tab; label: string }[] = hasChat
    ? [
        { key: "chat", label: "ЧАТ" },
        { key: "tips", label: "СОВЕТЫ" },
        { key: "session", label: "СЕССИЯ" },
      ]
    : [
        { key: "tips", label: "СОВЕТЫ" },
        { key: "session", label: "СЕССИЯ" },
      ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-card rounded-t-2xl card-shadow transition-transform duration-300 ease-out ${height} ${
        open ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-8 h-1 rounded-full bg-border" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-4">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 text-[10px] uppercase tracking-[0.15em] font-medium transition-colors ${
              activeTab === key
                ? "text-primary border-b-2 border-primary"
                : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ height: "calc(100% - 80px)" }}>
        {activeTab === "chat" && hasChat && <MedMindChat />}
        {activeTab === "tips" && <MedMindTips />}
        {activeTab === "session" && <MedMindSession />}
      </div>
    </div>
  );
}
