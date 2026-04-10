"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "gastro_ai_mnemonics";

interface SavedMnemonic {
  topic: string;
  question: string;
  content: string;
  type: "mnemonic" | "poem" | "explanation";
  createdAt: string;
}

export function saveMnemonic(mnemonic: SavedMnemonic) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SavedMnemonic[];
    saved.push(mnemonic);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {}
}

export function getSavedMnemonics(): SavedMnemonic[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function exportToAnki(mnemonics: SavedMnemonic[]) {
  // Anki tab-separated format: front\tback\ttags
  const lines = mnemonics.map((m) => {
    const front = m.question || m.topic;
    const back = m.content.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const tag = `GastroEd::${m.topic.replace(/\s+/g, "_")}`;
    return `${front}\t${back}\t${tag}`;
  });

  const header = "#separator:tab\n#html:true\n#tags column:3\n";
  const content = header + lines.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `gastroed_anki_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnkiExport() {
  const [mnemonics, setMnemonics] = useState<SavedMnemonic[]>([]);

  useEffect(() => {
    setMnemonics(getSavedMnemonics());
  }, []);

  if (mnemonics.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted">
          Создавайте мнемоники через AI-помощника - они сохранятся для экспорта
        </p>
      </div>
    );
  }

  const byType = {
    mnemonic: mnemonics.filter((m) => m.type === "mnemonic").length,
    poem: mnemonics.filter((m) => m.type === "poem").length,
    explanation: mnemonics.filter((m) => m.type === "explanation").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-foreground font-medium">
            {mnemonics.length} карточек для Anki
          </p>
          <p className="text-[10px] text-muted mt-0.5">
            {byType.mnemonic > 0 && `${byType.mnemonic} мнемоник`}
            {byType.poem > 0 && ` / ${byType.poem} стишков`}
            {byType.explanation > 0 && ` / ${byType.explanation} объяснений`}
          </p>
        </div>
      </div>

      <button
        onClick={() => exportToAnki(mnemonics)}
        className="w-full py-2.5 rounded-xl border border-border text-xs font-medium text-foreground hover:border-primary/30 hover:text-primary transition-colors"
      >
        Экспорт в Anki (.txt)
      </button>

      <p className="text-[10px] text-muted/60 mt-2 text-center">
        Файл в формате Anki. Импортируйте через File - Import
      </p>
    </div>
  );
}
