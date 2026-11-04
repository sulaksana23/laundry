import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthSession, setAuthSession } from "@/server/modules/auth/auth.session";
import { AuthRepository } from "@/server/modules/auth/auth.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ branchId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Permintaan lintas situs tidak diizinkan." }, { status: 403 });
  }
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Cabang tidak valid." }, { status: 400 });

  const branchUser = await new AuthRepository().findActiveUserForBranch(session.userId, parsed.data.branchId);
  if (!branchUser) return NextResponse.json({ error: "Anda tidak memiliki akses ke cabang tersebut." }, { status: 403 });
  await setAuthSession(branchUser);
  return NextResponse.json({ ok: true, branchId: branchUser.branchId, branchName: branchUser.branchName });
}
