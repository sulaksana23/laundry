import { NextResponse } from "next/server";

import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isProActive } from "@/server/modules/license/license";
import { buildBranchBackup } from "@/server/modules/backup/backup";
import { hasPermission } from "@/server/modules/auth/permissions";

export const dynamic = "force-dynamic";

// GET /api/backup/export — unduh backup JSON seluruh data cabang (fitur Pro).
export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (!hasPermission(session.role, "backup:manage")) return NextResponse.json({ error: "Akses backup tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Backup memerlukan mode database." }, { status: 503 });
  if (!(await isProActive(session.branchId))) {
    return NextResponse.json({ error: "Backup & restore adalah fitur LaundryOS Pro. Aktifkan Pro di Pengaturan." }, { status: 403 });
  }
  const backup = await buildBranchBackup(session.branchId);
  const date = backup.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="laundryos-backup-${session.branchId}-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
