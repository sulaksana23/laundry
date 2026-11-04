import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { validateBackup } from "@/lib/backup-format";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isProActive } from "@/server/modules/license/license";
import { restoreBranchBackup } from "@/server/modules/backup/backup";
import { hasPermission } from "@/server/modules/auth/permissions";
import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

export const dynamic = "force-dynamic";

const MAX_BODY_LENGTH = 12_000_000;

// POST /api/backup/restore — pulihkan backup ke cabang yang sama (fitur Pro).
// Menggantikan seluruh data operasional cabang dengan isi berkas.
export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 });
  if (!hasPermission(session.role, "backup:manage")) return NextResponse.json({ error: "Akses pemulihan backup tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Restore memerlukan mode database." }, { status: 503 });
  if (!(await isProActive(session.branchId))) {
    return NextResponse.json({ error: "Backup & restore adalah fitur LaundryOS Pro. Aktifkan Pro di Pengaturan." }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: "Berkas backup terlalu besar." }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "Berkas bukan JSON yang valid." }, { status: 400 });
  }
  const body = (parsed && typeof parsed === "object" ? (parsed as { backup?: unknown }) : {});
  const validation = validateBackup(body.backup ?? parsed);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }
  if (validation.backup.branch.id !== session.branchId) {
    return NextResponse.json(
      { error: "Backup ini berasal dari cabang lain dan tidak dapat dipulihkan di sini demi keamanan." },
      { status: 422 },
    );
  }

  let counts;
  let auditRecorded = true;
  try {
    counts = await restoreBranchBackup(session.branchId, validation.backup);
  } catch {
    return NextResponse.json({ error: "Restore gagal. Periksa kembali berkas backup dan coba lagi." }, { status: 500 });
  }
  try {
    await getNeonSql().query(
      "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
      "VALUES ($1::uuid, $2, $3, 'backup.restored', 'backup', 'branch', jsonb_build_object('rows', $4::int))",
      [randomUUID(), session.branchId, session.userId, counts.total],
    );
  } catch {
    auditRecorded = false;
  }
  for (const path of ["/", "/orders", "/customers", "/services", "/inventory", "/finance", "/reports", "/settings", "/activity"]) {
    revalidatePath(path);
  }
  return NextResponse.json({ ok: true, counts, auditRecorded });
}
