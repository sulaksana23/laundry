import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { ServiceNotFoundError } from "@/server/modules/services/services.service";
import { getServicesService } from "@/server/modules/services/services.runtime";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDuplicateService(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "services:manage")) return NextResponse.json({ error: "Akses mengelola layanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Katalog layanan belum aktif." }, { status: 503 });

  try {
    const { id } = await context.params;
    if (!id || id.length > 80) return NextResponse.json({ error: "ID layanan tidak valid." }, { status: 400 });
    const input: unknown = await request.json();
    const service = await getServicesService().update(session.branchId, session.userId, id, input);
    return NextResponse.json({ service });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Data layanan tidak valid." }, { status: 400 });
    if (error instanceof ServiceNotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    if (isDuplicateService(error)) return NextResponse.json({ error: "Nama layanan sudah dipakai pada cabang ini." }, { status: 409 });
    return NextResponse.json({ error: "Layanan gagal diperbarui." }, { status: 500 });
  }
}
