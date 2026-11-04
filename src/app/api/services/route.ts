import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getServicesService } from "@/server/modules/services/services.runtime";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDuplicateService(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "services:read")) return NextResponse.json({ error: "Akses layanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Katalog layanan belum aktif." }, { status: 503 });

  try {
    const services = await getServicesService().list(session.branchId);
    return NextResponse.json({ services });
  } catch {
    return NextResponse.json({ error: "Katalog layanan gagal dimuat." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "services:manage")) return NextResponse.json({ error: "Akses mengelola layanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Katalog layanan belum aktif." }, { status: 503 });

  try {
    const input: unknown = await request.json();
    const service = await getServicesService().create(session.branchId, session.userId, input);
    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Data layanan tidak valid." }, { status: 400 });
    if (isDuplicateService(error)) return NextResponse.json({ error: "Nama layanan sudah dipakai pada cabang ini." }, { status: 409 });
    return NextResponse.json({ error: "Layanan gagal disimpan." }, { status: 500 });
  }
}
