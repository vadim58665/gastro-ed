/**
 * Simple in-memory full-text search over wiki pages.
 * Used as fallback when static topic map doesn't match.
 */

import { readdir, readFile, stat } from "fs/promises";
import { join } from "path";
import type { RAGResult } from "./index";

interface WikiEntry {
  path: string;
  title: string;
  content: string;
  words: Set<string>;
}

let entries: WikiEntry[] | null = null;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\wа-яёА-ЯЁ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

async function walkDir(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const items = await readdir(dir);
    for (const item of items) {
      const full = join(dir, item);
      const s = await stat(full);
      if (s.isDirectory()) {
        results.push(...(await walkDir(full)));
      } else if (item.endsWith(".md") && item !== "schema.md" && item !== "log.md") {
        results.push(full);
      }
    }
  } catch {
    // Directory doesn't exist yet
  }
  return results;
}

async function buildIndex(): Promise<WikiEntry[]> {
  if (entries) return entries;

  const wikiDir = join(process.cwd(), "wiki", "medical");
  const files = await walkDir(wikiDir);

  entries = [];
  for (const file of files) {
    try {
      const raw = await readFile(file, "utf-8");
      const content = raw.replace(/^---[\s\S]*?---\n*/, "").trim();

      // Extract title from first heading or frontmatter
      const titleMatch = raw.match(/title:\s*["']?(.+?)["']?\s*$/m)
        ?? content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1] ?? file.split("/").pop()?.replace(".md", "") ?? "";

      const relativePath = file.replace(process.cwd() + "/", "");

      entries.push({
        path: relativePath,
        title,
        content,
        words: tokenize(title + " " + content),
      });
    } catch {
      // Skip unreadable files
    }
  }

  return entries;
}

/**
 * Search wiki pages using simple word overlap scoring.
 */
export async function searchWiki(
  query: string,
  specialty?: string,
  maxResults = 3
): Promise<RAGResult[]> {
  const index = await buildIndex();
  if (index.length === 0) return [];

  const queryWords = tokenize(query);
  if (queryWords.size === 0) return [];

  const scored = index.map((entry) => {
    let overlap = 0;
    for (const word of queryWords) {
      if (entry.words.has(word)) overlap++;
    }
    const relevance = overlap / queryWords.size;
    return { entry, relevance };
  });

  return scored
    .filter((s) => s.relevance > 0.2)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
    .map((s) => ({
      content: s.entry.content.slice(0, 2000),
      source: s.entry.path,
      relevance: s.relevance,
    }));
}
