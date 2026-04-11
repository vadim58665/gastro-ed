/**
 * Wiki page loader with in-memory cache.
 */

import { readFile } from "fs/promises";
import { join } from "path";

const cache = new Map<string, string | null>();

/**
 * Loads a wiki page from disk. Returns null if not found.
 * Results are cached in memory.
 */
export async function loadWikiPage(path: string): Promise<string | null> {
  if (cache.has(path)) return cache.get(path)!;

  try {
    const fullPath = join(process.cwd(), path);
    const content = await readFile(fullPath, "utf-8");

    // Strip YAML frontmatter
    const stripped = content.replace(/^---[\s\S]*?---\n*/, "").trim();
    cache.set(path, stripped);
    return stripped;
  } catch {
    cache.set(path, null);
    return null;
  }
}

/** Clear cache (used in tests or when wiki is updated) */
export function clearWikiCache(): void {
  cache.clear();
}
