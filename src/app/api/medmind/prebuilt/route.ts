import {
  authenticateRequest,
  errorResponse,
  getServiceSupabase,
} from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";

type EntityType = "card" | "accreditation_question";
type ContentType = "hint" | "explain_short" | "explain_long";

const ENTITY_TYPES: EntityType[] = ["card", "accreditation_question"];
const CONTENT_TYPES: ContentType[] = ["hint", "explain_short", "explain_long"];

export async function GET(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "prebuilt");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType") as EntityType | null;
    const entityId = url.searchParams.get("entityId");
    const contentType = url.searchParams.get("contentType") as ContentType | null;

    if (!entityType || !ENTITY_TYPES.includes(entityType)) {
      return Response.json({ error: "invalid entityType" }, { status: 400 });
    }
    if (!entityId) {
      return Response.json({ error: "entityId required" }, { status: 400 });
    }
    if (!contentType || !CONTENT_TYPES.includes(contentType)) {
      return Response.json({ error: "invalid contentType" }, { status: 400 });
    }

    // Gate by subscription before touching prebuilt table.
    // RLS would also block, but we want an explicit 403 for UI paywall.
    const supabase = getServiceSupabase();
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("user_id", userId)
      .maybeSingle();

    // Dev-bypass: оставляем только для локальной разработки.
    // NEXT_PUBLIC_ префикс подталкивает операторов ставить флаг в превью/стейдж,
    // что на сервере открыло бы доступ всем авторизованным — гейтим NODE_ENV.
    const devBypass =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEV_MODE === "true";
    const isPro =
      devBypass || sub?.status === "active" || sub?.status === "trial";

    if (!isPro) {
      return Response.json(
        { error: "subscription required", paywall: true },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("prebuilt_content")
      .select("content_ru, model_used, updated_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("content_type", contentType)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json(
        {
          error: "not found",
          shouldFallback: true,
          entityType,
          entityId,
          contentType,
        },
        { status: 404 }
      );
    }

    return Response.json({
      content: data.content_ru,
      model: data.model_used,
      updatedAt: data.updated_at,
      cached: true,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
