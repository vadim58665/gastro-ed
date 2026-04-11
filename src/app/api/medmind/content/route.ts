import {
  authenticateRequest,
  errorResponse,
  getServiceSupabase,
} from "../../_lib/auth";

export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const topic = url.searchParams.get("topic");
    const favoritesOnly = url.searchParams.get("favorites") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

    const supabase = getServiceSupabase();

    let query = supabase
      .from("user_saved_content")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("content_type", type);
    if (topic) query = query.eq("topic", topic);
    if (favoritesOnly) query = query.eq("is_favorite", true);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ items: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const body = await req.json();

    const {
      contentType,
      specialty,
      topic,
      questionContext,
      contentRu,
      imageUrl,
      metadata,
    } = body as {
      contentType: string;
      specialty?: string;
      topic: string;
      questionContext?: string;
      contentRu: string;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
    };

    if (!contentType || !topic || !contentRu) {
      return Response.json(
        { error: "contentType, topic, and contentRu are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("user_saved_content")
      .insert({
        user_id: userId,
        content_type: contentType,
        specialty: specialty ?? null,
        topic,
        question_context: questionContext ?? null,
        content_ru: contentRu,
        image_url: imageUrl ?? null,
        metadata: metadata ?? {},
      })
      .select("id")
      .single();

    if (error) throw error;

    return Response.json({ id: data?.id, saved: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("user_saved_content")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return Response.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);
    const body = await req.json();
    const { id, isFavorite } = body as { id: string; isFavorite: boolean };

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase
      .from("user_saved_content")
      .update({ is_favorite: isFavorite })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) throw error;

    return Response.json({ updated: true });
  } catch (err) {
    return errorResponse(err);
  }
}
