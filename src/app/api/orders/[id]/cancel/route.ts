import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ reason: z.string().trim().min(3).max(300) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  if (session.role !== "owner") return NextResponse.json({ error: "Pembatalan hanya dapat dilakukan pemilik." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Database tidak aktif." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Alasan pembatalan wajib diisi (3–300 karakter)." }, { status: 400 });
  const { id } = await context.params;
  const result = await getNeonSql().query(
    "WITH target AS (SELECT id, status FROM laundry_orders WHERE id = $1 AND branch_id = $2 AND status NOT IN ('completed', 'cancelled') FOR UPDATE), " +
    "changed AS (UPDATE laundry_orders SET status = 'cancelled', updated_at = now() WHERE id IN (SELECT id FROM target) RETURNING id, amount, paid_amount), " +
    "history AS (INSERT INTO laundry_order_status_history (id, branch_id, order_id, previous_status, next_status, actor_id) " +
    "SELECT $3::uuid, $2, changed.id, target.status, 'cancelled', $4 FROM changed JOIN target USING (id) RETURNING order_id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $5::uuid, $2, $4, 'order.cancelled', 'order', id, jsonb_build_object('reason', $6, 'paid_amount', paid_amount) FROM changed RETURNING id) " +
    "SELECT id, amount, paid_amount FROM changed",
    [id, session.branchId, randomUUID(), session.userId, randomUUID(), parsed.data.reason],
  );
  const rows = Array.isArray(result) ? result as Array<{ id: string; amount: number | string; paid_amount: number | string }> : [];
  if (!rows[0]) return NextResponse.json({ error: "Pesanan tidak ditemukan, sudah selesai, atau sudah dibatalkan." }, { status: 409 });
  return NextResponse.json({ ok: true, orderId: rows[0].id, refundableAmount: Number(rows[0].paid_amount) });
}
