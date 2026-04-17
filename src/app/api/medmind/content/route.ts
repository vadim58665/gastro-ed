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

// Допустимые типы для общего кэша prebuilt_content — mirror миграции 010.
const PREBUILT_CONTENT_TYPES = new Set([
  "hint",
  "explain_short",
  "explain_long",
  "mnemonic",
  "poem",
  "explanation",
  "learning_plan",
]);

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
      entityType,
      entityId,
      modelUsed,
    } = body as {
      contentType: string;
      specialty?: string;
      topic: string;
      questionContext?: string;
      contentRu: string;
      imageUrl?: string;
      metadata?: Record<string, unknown>;
      entityType?: "card" | "accreditation_question";
      entityId?: string;
      modelUsed?: string;
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

    // Best-effort upsert в общий кэш prebuilt_content. Если кто-то уже
    // просил то же действие на ту же сущность, ответ останется прежним —
    // ON CONFLICT do nothing, экономим токены всем следующим.
    // Image-контент не кэшируем (image_url хранит ссылку на файл пользователя).
    if (
      entityType &&
      entityId &&
      contentType !== "image" &&
      PREBUILT_CONTENT_TYPES.has(contentType)
    ) {
      await supabase
        .from("prebuilt_content")
        .upsert(
          {
            entity_type: entityType,
            entity_id: entityId,
            content_type: contentType,
            content_ru: contentRu,
            model_used: modelUsed ?? "runtime",
            tokens_used: 0,
            cost_usd: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,entity_id,content_type", ignoreDuplicates: true }
        )
        .then(
          () => undefined,
          () => undefined // silent: миграция 010 могла быть ещё не применена
        );
    }

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
