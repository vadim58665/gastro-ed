/**
 * Self-learning RAG: saves new knowledge from AI responses.
 * Learned facts are periodically verified and migrated to wiki.
 */

import { getServiceSupabase } from "../auth";

export interface LearnedFact {
  topic: string;
  specialty?: string;
  content: string;
  source: string; // "claude_response" | "pubmed:12345" | "clinical_guidelines"
  confidence?: number;
}

/**
 * Save a new fact discovered during an AI response.
 * Facts start with low confidence and get verified by cron job.
 */
export async function saveLearnedFact(fact: LearnedFact): Promise<void> {
  const supabase = getServiceSupabase();

  // Check if similar fact already exists (avoid duplicates)
  const { data: existing } = await supabase
    .from("learned_facts")
    .select("id")
    .eq("topic", fact.topic)
    .ilike("content", `%${fact.content.slice(0, 50)}%`)
    .limit(1)
    .maybeSingle();

  if (existing) return;

  await supabase.from("learned_facts").insert({
    topic: fact.topic,
    specialty: fact.specialty ?? null,
    content: fact.content,
    source: fact.source,
    confidence: fact.confidence ?? 0.5,
  });
}

/**
 * Retrieve learned facts for a topic (used in RAG pipeline).
 * Only returns verified or high-confidence facts.
 */
export async function getLearnedFacts(
  topic: string,
  maxResults = 3
): Promise<{ content: string; source: string }[]> {
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from("learned_facts")
    .select("content, source")
    .eq("topic", topic)
    .or("verified.eq.true,confidence.gte.0.7")
    .order("confidence", { ascending: false })
    .limit(maxResults);

  return (data ?? []).map((f: { content: string; source: string }) => ({
    content: f.content,
    source: f.source,
  }));
}
