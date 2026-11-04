import { NextResponse } from "next/server";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { listOrderHistory } from "@/server/modules/workspace/operations";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "orders:read")) return NextResponse.json({ error: "Akses pesanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) {
    return NextResponse.json({ error: "Riwayat pesanan hanya tersedia saat database aktif." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const history = await listOrderHistory(session.branchId, id);
    return NextResponse.json({ history });
  } catch {
    return NextResponse.json({ error: "Riwayat pesanan gagal dimuat." }, { status: 500 });
  }
}
