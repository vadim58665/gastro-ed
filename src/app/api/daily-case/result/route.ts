import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  AuthError,
  getServiceSupabase,
} from "@/app/api/_lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);

    // Dev bypass: не пишем в БД фиктивный userId, чтобы не ломать FK на profiles.id
    if (userId === "dev-test-user") {
      return NextResponse.json({ ok: true, skipped: "dev" });
    }

    const body = await req.json();
    const { caseDate, caseId, totalPoints, maxPoints } = body as {
      caseDate?: unknown;
      caseId?: unknown;
      totalPoints?: unknown;
      maxPoints?: unknown;
    };

    if (typeof caseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(caseDate))
      return NextResponse.json({ error: "Bad caseDate" }, { status: 400 });
    if (typeof caseId !== "string" || caseId.length === 0)
      return NextResponse.json({ error: "Bad caseId" }, { status: 400 });
    if (typeof totalPoints !== "number" || !Number.isFinite(totalPoints) || totalPoints < 0)
      return NextResponse.json({ error: "Bad totalPoints" }, { status: 400 });
    if (typeof maxPoints !== "number" || !Number.isFinite(maxPoints) || maxPoints <= 0)
      return NextResponse.json({ error: "Bad maxPoints" }, { status: 400 });

    const admin = getServiceSupabase();

    const { error } = await admin.from("daily_case_results").upsert({
      user_id: userId,
      case_date: caseDate,
      case_id: caseId,
      total_points: Math.floor(totalPoints),
      max_points: Math.floor(maxPoints),
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error("daily_case_results upsert failed", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
