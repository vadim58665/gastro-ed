/**
 * RAG retrieval orchestrator.
 * Searches wiki, topic map, and learned facts for relevant context.
 */

import { searchWiki } from "./search";
import { getTopicWikiPages } from "./topic-map";
import { loadWikiPage } from "./loader";

export interface RAGResult {
  content: string;
  source: string;
  relevance: number;
}

/**
 * Retrieves relevant medical context for a query.
 * Strategy:
 * 1. Static topic map (deterministic, free)
 * 2. Full-text search over wiki (for free-text queries)
 * Max tokens: limits output to approximately this many tokens.
 */
export async function retrieveContext(
  query: string,
  specialty?: string,
  maxTokens = 1500
): Promise<string> {
  const results: RAGResult[] = [];

  // 1. Check static topic map
  const wikiPaths = getTopicWikiPages(query);
  for (const path of wikiPaths) {
    const content = await loadWikiPage(path);
    if (content) {
      results.push({
        content,
        source: path,
        relevance: 1.0,
      });
    }
  }

  // 2. Full-text search if topic map didn't find enough
  if (results.length === 0) {
    const searchResults = await searchWiki(query, specialty);
    results.push(...searchResults);
  }

  if (results.length === 0) return "";

  // Sort by relevance and truncate to max tokens (~4 chars per token)
  results.sort((a, b) => b.relevance - a.relevance);

  let accumulated = "";
  const maxChars = maxTokens * 4;

  for (const result of results) {
    if (accumulated.length + result.content.length > maxChars) {
      const remaining = maxChars - accumulated.length;
      if (remaining > 100) {
        accumulated += `\nИсточник: ${result.source}\n${result.content.slice(0, remaining)}...\n`;
      }
      break;
    }
    accumulated += `Источник: ${result.source}\n${result.content}\n\n`;
  }

  return accumulated.trim();
}
