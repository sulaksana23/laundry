import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { hasPermission } from "@/server/modules/auth/permissions";
import { importOrdersFromCsv, OrderImportError } from "@/server/modules/orders/import-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({ csv: z.string().min(1).max(512_000) });

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "orders:create")) return NextResponse.json({ error: "Akses impor pesanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Impor pesanan memerlukan database aktif." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "CSV kosong atau terlalu besar (maksimum 512 KB)." }, { status: 400 });

  try {
    const report = await importOrdersFromCsv(session.branchId, session.userId, parsed.data.csv);
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof OrderImportError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Impor pesanan gagal diproses. Coba lagi nanti." }, { status: 500 });
  }
}
