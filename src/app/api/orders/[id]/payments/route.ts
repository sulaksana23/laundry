import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { hasPermission } from "@/server/modules/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentSchema = z.object({
  amount: z.coerce.number().int().positive().safe(),
  method: z.enum(["cash", "transfer", "qris", "other"]),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401 });
  if (!hasPermission(session.role, "payments:record")) return NextResponse.json({ error: "Akses pencatatan pembayaran tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Pencatatan pembayaran belum aktif." }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nominal atau metode pembayaran tidak valid." }, { status: 400 });

  const { id } = await context.params;
  const paymentId = randomUUID();
  const result = await getNeonSql().query(
    "WITH updated_order AS (" +
    "UPDATE laundry_orders SET paid_amount = paid_amount + $4, updated_at = now() " +
    "WHERE id = $3 AND branch_id = $2 AND amount - paid_amount >= $4 " +
    "RETURNING id, paid_amount, amount" +
    "), inserted_payment AS (" +
    "INSERT INTO laundry_payments (id, branch_id, order_id, amount, method, actor_id, received_at) " +
    "SELECT $1::uuid, $2, id, $4, $5, $6, now() FROM updated_order RETURNING id" +
    "), audit AS (" +
    "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $7::uuid, $2, $6, 'payment.recorded', 'order', id, jsonb_build_object('amount', $4, 'method', $5) " +
    "FROM updated_order RETURNING id" +
    ") SELECT id, paid_amount, amount FROM updated_order",
    [paymentId, session.branchId, id, parsed.data.amount, parsed.data.method, session.userId, randomUUID()],
  );
  const rows = Array.isArray(result) ? result as Array<{ id: string; paid_amount: number | string; amount: number | string }> : [];
  if (!rows[0]) {
    const existing = await getNeonSql().query(
      "SELECT amount, paid_amount FROM laundry_orders WHERE id = $1 AND branch_id = $2 LIMIT 1",
      [id, session.branchId],
    );
    if (!Array.isArray(existing) || existing.length === 0) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ error: "Nominal melebihi sisa tagihan. Muat ulang pesanan." }, { status: 409 });
  }
  const paidAmount = Number(rows[0].paid_amount);
  const amount = Number(rows[0].amount);
  return NextResponse.json({
    paymentId,
    paidAmount,
    paymentStatus: paidAmount >= amount ? "paid" : "partial",
  }, { status: 201 });
}
