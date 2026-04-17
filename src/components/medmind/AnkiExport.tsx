"use client";

import { useEffect } from "react";
import { useSavedContent, type SavedContentItem } from "@/hooks/useSavedContent";
import { migrateLegacyMnemonics } from "@/lib/migrateLegacyMnemonics";

const EXPORTABLE_TYPES = ["mnemonic", "poem", "explanation"] as const;
type ExportableType = (typeof EXPORTABLE_TYPES)[number];

function isExportable(item: SavedContentItem): item is SavedContentItem & { content_type: ExportableType } {
  return (EXPORTABLE_TYPES as readonly string[]).includes(item.content_type);
}

function exportToAnki(items: SavedContentItem[]) {
  const lines = items.map((m) => {
    const front = (m.question_context || m.topic).replace(/\t/g, " ").replace(/\n/g, " ");
    const back = m.content_ru.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const tag = `УмныйВрач::${m.topic.replace(/\s+/g, "_")}`;
    return `${front}\t${back}\t${tag}`;
  });

  const header = "#separator:tab\n#html:true\n#tags column:3\n";
  const content = header + lines.join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `smartdoc_anki_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnkiExport() {
  const { items, saveContent, refresh } = useSavedContent();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const migrated = await migrateLegacyMnemonicsReturning(saveContent);
      if (migrated && !cancelled) refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [saveContent, refresh]);

  const exportable = items.filter(isExportable);

  if (exportable.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-xs text-muted">
          Создавайте мнемоники через AI-помощника - они сохранятся для экспорта
        </p>
      </div>
    );
  }

  const byType = {
    mnemonic: exportable.filter((m) => m.content_type === "mnemonic").length,
    poem: exportable.filter((m) => m.content_type === "poem").length,
    explanation: exportable.filter((m) => m.content_type === "explanation").length,
  };

  const parts: string[] = [];
  if (byType.mnemonic > 0) parts.push(`${byType.mnemonic} мнемоник`);
  if (byType.poem > 0) parts.push(`${byType.poem} стишков`);
  if (byType.explanation > 0) parts.push(`${byType.explanation} объяснений`);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-foreground font-medium">
            {exportable.length} карточек для Anki
          </p>
          <p className="text-[10px] text-muted mt-0.5">{parts.join(" / ")}</p>
        </div>
      </div>

      <button
        onClick={() => exportToAnki(exportable)}
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

async function migrateLegacyMnemonicsReturning(
  saveContent: Parameters<typeof migrateLegacyMnemonics>[0]
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const hadLegacy = !!localStorage.getItem("sd-ai-mnemonics");
  await migrateLegacyMnemonics(saveContent);
  return hadLegacy;
}
