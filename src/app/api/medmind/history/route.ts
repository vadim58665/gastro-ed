import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";

/**
 * GET /api/medmind/history?limit=20
 * Returns the user's recent chat messages from medmind_chat_history
 * so MedMindChat/CompanionOverlay can restore a conversation across devices.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("medmind_chat_history")
      .select("id, role, content, context_topic, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Return in chronological (oldest → newest) order for easy append.
    const messages = (data ?? []).slice().reverse().map((row) => ({
      id: (row as { id: string }).id,
      role: (row as { role: "user" | "assistant" }).role,
      content: (row as { content: string }).content,
      contextTopic: (row as { context_topic: string | null }).context_topic ?? undefined,
      createdAt: (row as { created_at: string }).created_at,
    }));

    return Response.json({ messages });
  } catch (err) {
    return errorResponse(err);
  }
}
