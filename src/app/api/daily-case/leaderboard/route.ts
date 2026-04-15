import { NextRequest, NextResponse } from "next/server";
import {
  authenticateRequest,
  AuthError,
  getServiceSupabase,
} from "@/app/api/_lib/auth";

interface LeaderboardRow {
  user_id: string;
  total_points: number;
  max_points: number;
  completed_at: string;
  profiles: { nickname: string | null } | { nickname: string | null }[] | null;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const date = req.nextUrl.searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
      return NextResponse.json({ error: "Bad date" }, { status: 400 });

    const admin = getServiceSupabase();

    const { data, error } = await admin
      .from("daily_case_results")
      .select("user_id, total_points, max_points, completed_at, profiles:user_id(nickname)")
      .eq("case_date", date)
      .order("total_points", { ascending: false })
      .order("completed_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("leaderboard select failed", error);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const rows = ((data ?? []) as LeaderboardRow[]).map((r, i) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        position: i + 1,
        nickname: profile?.nickname ?? "доктор",
        totalPoints: r.total_points,
        maxPoints: r.max_points,
        isSelf: r.user_id === userId,
      };
    });

    return NextResponse.json({ rows });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
