import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authenticateRequest, AuthError } from "@/app/api/_lib/auth";
import { validateNickname } from "@/lib/validation/nickname";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticateRequest(req);
    const body = await req.json();
    const { nickname, phone } = body as { nickname?: unknown; phone?: unknown };

    const v = validateNickname(String(nickname ?? ""));
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

    const phoneStr = typeof phone === "string" && phone.trim().length > 0
      ? phone.trim().slice(0, 20)
      : null;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Если у юзера уже есть nickname — не даём перезаписать через этот эндпоинт.
    // Защищает сценарий: signup с email, у которого уже есть аккаунт.
    const { data: existing } = await admin
      .from("profiles")
      .select("nickname")
      .eq("id", userId)
      .maybeSingle();
    if (existing?.nickname && existing.nickname !== v.value) {
      return NextResponse.json(
        { error: "У этого аккаунта уже есть никнейм. Используйте «Войти»." },
        { status: 409 }
      );
    }

    const { error } = await admin
      .from("profiles")
      .update({ nickname: v.value, phone: phoneStr, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Этот никнейм уже занят" }, { status: 409 });
      if (error.code === "23514") return NextResponse.json({ error: "Неверный формат никнейма" }, { status: 400 });
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, nickname: v.value });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
