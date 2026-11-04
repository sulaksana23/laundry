import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { importCustomersFromCsv } from "@/server/modules/customers/import-customers";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const importSchema = z.object({
  csv: z.string().min(1).max(512_000),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  }
  if (!hasPermission(session.role, "customers:write")) return NextResponse.json({ error: "Akses impor pelanggan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) {
    return NextResponse.json({ error: "Impor pelanggan belum aktif pada mode demo." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Berkas CSV kosong atau terlalu besar (maksimum sekitar 512 KB)." }, { status: 400 });
  }

  try {
    const report = await importCustomersFromCsv(session.branchId, session.userId, parsed.data.csv);
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impor gagal diproses.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
