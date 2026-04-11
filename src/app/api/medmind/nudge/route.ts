import { authenticateRequest, errorResponse, getServiceSupabase } from "../../_lib/auth";

/** GET: fetch unread nudges for the current user */
export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const supabase = getServiceSupabase();

    const { data } = await supabase
      .from("medmind_nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5);

    return Response.json({ nudges: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

/** PATCH: mark nudge as read */
export async function PATCH(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const body = await req.json();
    const { id } = body as { id: string };

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    await supabase
      .from("medmind_nudges")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);

    return Response.json({ updated: true });
  } catch (err) {
    return errorResponse(err);
  }
}
