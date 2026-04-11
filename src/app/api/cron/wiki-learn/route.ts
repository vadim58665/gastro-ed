import { getServiceSupabase } from "../../_lib/auth";
import { generateText } from "../../_lib/claude";

/**
 * Cron: verify learned facts and migrate to wiki.
 * Runs daily at 03:00 MSK via Vercel Cron.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  // Get unverified facts with confidence >= 0.7
  const { data: facts } = await supabase
    .from("learned_facts")
    .select("*")
    .eq("verified", false)
    .gte("confidence", 0.7)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!facts || facts.length === 0) {
    return Response.json({ verified: 0, rejected: 0 });
  }

  let verified = 0;
  let rejected = 0;

  for (const fact of facts) {
    try {
      // Verify fact via Haiku
      const result = await generateText(
        `Проверь медицинский факт на точность. Тема: ${fact.topic}. Факт: "${fact.content}". Ответь JSON: { "accurate": true/false, "reason": "почему" }`,
        { model: "claude-haiku-4-5-20251001", maxTokens: 128 }
      );

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.accurate) {
          // Mark as verified
          await supabase
            .from("learned_facts")
            .update({ verified: true, confidence: 0.9 })
            .eq("id", fact.id);

          // Upsert to wiki_pages table for full-text search
          const slug = fact.topic
            .toLowerCase()
            .replace(/[^a-zа-яё0-9\s]/gi, "")
            .replace(/\s+/g, "-")
            .slice(0, 60);

          await supabase.from("wiki_pages").upsert(
            {
              path: `learned/${slug}`,
              title: fact.topic,
              content: fact.content,
              specialty: fact.specialty,
              tags: ["learned", "auto-verified"],
            },
            { onConflict: "path" }
          );

          verified++;
        } else {
          // Lower confidence of inaccurate facts
          await supabase
            .from("learned_facts")
            .update({ confidence: 0.2 })
            .eq("id", fact.id);
          rejected++;
        }
      }
    } catch {
      // Skip on error
    }
  }

  return Response.json({ verified, rejected, total: facts.length });
}
