import { authenticateRequest, errorResponse } from "../../_lib/auth";
import { checkRateLimit, rateLimitResponse } from "../../_lib/rate-limit";
import { validateFact } from "../../_lib/pubmed";

export async function POST(req: Request) {
  try {
    const { userId } = await authenticateRequest(req);

    const rl = checkRateLimit(userId, "validate");
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!);

    const body = await req.json();
    const { claim, topic } = body as { claim: string; topic: string };

    if (!claim || !topic) {
      return Response.json(
        { error: "claim and topic required" },
        { status: 400 }
      );
    }

    const result = await validateFact(claim, topic);
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
