const FLAG = "sd-ai-mnemonics-migrated";
const KEY = "sd-ai-mnemonics";

type LegacyType = "mnemonic" | "poem" | "explanation";

interface LegacyMnemonic {
  topic: string;
  question: string;
  content: string;
  type: LegacyType;
  createdAt: string;
}

type SaveContent = (c: {
  contentType: string;
  topic: string;
  questionContext?: string;
  contentRu: string;
}) => Promise<string | null>;

export async function migrateLegacyMnemonics(saveContent: SaveContent): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FLAG) === "1") return;

  const raw = localStorage.getItem(KEY);
  if (!raw) {
    localStorage.setItem(FLAG, "1");
    return;
  }

  let items: LegacyMnemonic[] = [];
  try {
    items = JSON.parse(raw) as LegacyMnemonic[];
  } catch {
    localStorage.removeItem(KEY);
    localStorage.setItem(FLAG, "1");
    return;
  }

  for (const m of items) {
    if (!m?.content || !m?.topic || !m?.type) continue;
    await saveContent({
      contentType: m.type,
      topic: m.topic,
      questionContext: m.question,
      contentRu: m.content,
    });
  }

  localStorage.removeItem(KEY);
  localStorage.setItem(FLAG, "1");
}
