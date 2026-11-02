import { NextResponse } from "next/server";
import { getAuthSession } from "@/server/modules/auth/auth.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ user: await getAuthSession() });
}
