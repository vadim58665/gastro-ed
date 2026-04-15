import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateNickname } from "@/lib/validation/nickname";

export async function POST(req: NextRequest) {
  let payload: { nickname?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ available: false, error: "Bad request" }, { status: 400 });
  }

  const v = validateNickname(String(payload.nickname ?? ""));
  if (!v.ok) return NextResponse.json({ available: false, error: v.error });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .ilike("nickname", v.value)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ available: false, error: "Server error" }, { status: 500 });
  return NextResponse.json({ available: !data, normalized: v.value });
}
