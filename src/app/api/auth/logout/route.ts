import { NextResponse } from "next/server";
import { clearAuthSession } from "@/server/modules/auth/auth.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthSession();
  return NextResponse.json({ ok: true });
}
