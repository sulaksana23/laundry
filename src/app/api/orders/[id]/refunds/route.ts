import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ amount: z.coerce.number().int().positive().safe(), reason: z.string().trim().min(3).max(300), method: z.enum(["cash", "transfer", "qris", "other"]) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk." }, { status: 401 });
  if (session.role !== "owner") return NextResponse.json({ error: "Refund hanya dapat dicatat pemilik." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Database tidak aktif." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nominal, alasan, atau metode refund tidak valid." }, { status: 400 });
  const { id } = await context.params;
  const refundId = randomUUID();
  const result = await getNeonSql().query(
    "WITH changed AS (UPDATE laundry_orders SET paid_amount = paid_amount - $3, updated_at = now() " +
    "WHERE id = $1 AND branch_id = $2 AND status = 'cancelled' AND paid_amount >= $3 RETURNING id, paid_amount), " +
    "refund AS (INSERT INTO laundry_order_refunds (id, branch_id, order_id, amount, reason, method, actor_id) " +
    "SELECT $4::uuid, $2, id, $3, $5, $6, $7 FROM changed RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $8::uuid, $2, $7, 'order.refunded', 'order', id, jsonb_build_object('amount', $3, 'method', $6, 'reason', $5) FROM changed RETURNING id) " +
    "SELECT id, paid_amount FROM changed",
    [id, session.branchId, parsed.data.amount, refundId, parsed.data.reason, parsed.data.method, session.userId, randomUUID()],
  );
  const rows = Array.isArray(result) ? result as Array<{ id: string; paid_amount: number | string }> : [];
  if (!rows[0]) return NextResponse.json({ error: "Refund melebihi pembayaran bersih atau pesanan belum dibatalkan." }, { status: 409 });
  return NextResponse.json({ ok: true, refundId, paidAmount: Number(rows[0].paid_amount) }, { status: 201 });
}
