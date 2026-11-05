import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { orderStatuses } from "@/features/orders/domain/order";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { hasPermission } from "@/server/modules/auth/permissions";
import { getNeonSql } from "@/server/db/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk mengekspor pesanan." }, { status: 401 });
  if (!hasPermission(session.role, "orders:export")) return NextResponse.json({ error: "Akses ekspor pesanan tidak diizinkan." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Ekspor pesanan tersedia saat database aktif." }, { status: 503 });

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().slice(0, 100);
  const status = url.searchParams.get("status");
  const dueFilter = url.searchParams.get("due");
  const paymentFilter = url.searchParams.get("payment");
  if (status && !orderStatuses.includes(status as (typeof orderStatuses)[number])) {
    return NextResponse.json({ error: "Filter status tidak valid." }, { status: 400 });
  }
  if (dueFilter && dueFilter !== "today" && dueFilter !== "overdue") {
    return NextResponse.json({ error: "Filter tanggal target tidak valid." }, { status: 400 });
  }
  if (paymentFilter && paymentFilter !== "unpaid" && paymentFilter !== "paid") {
    return NextResponse.json({ error: "Filter pembayaran tidak valid." }, { status: 400 });
  }
  if (paymentFilter && !hasPermission(session.role, "finance:read")) {
    return NextResponse.json({ error: "Akses filter pembayaran tidak diizinkan." }, { status: 403 });
  }
  const params: string[] = [session.branchId];
  const conditions = ["o.branch_id = $1"];
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(o.id ILIKE $${params.length} OR c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (dueFilter) {
    conditions.push("o.status NOT IN ('completed', 'cancelled')");
    conditions.push(dueFilter === "today"
      ? "o.due_at = (now() AT TIME ZONE b.timezone)::date"
      : "o.due_at < (now() AT TIME ZONE b.timezone)::date");
  }
  if (paymentFilter) {
    conditions.push("o.status <> 'cancelled'");
    conditions.push(paymentFilter === "unpaid" ? "o.paid_amount < o.amount" : "o.paid_amount >= o.amount");
  }
  const result = await getNeonSql().query(
    "SELECT o.id, c.name AS customer, c.phone, o.service_name_snapshot AS service, o.quantity, o.unit, o.status, o.amount, o.express_fee, o.delivery_fee, o.discount_amount, o.paid_amount, to_char(o.due_at, 'YYYY-MM-DD') AS due_date " +
    "FROM laundry_orders o JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id " +
    "JOIN laundry_branches b ON b.id = o.branch_id " +
    "WHERE " + conditions.join(" AND ") + " ORDER BY o.received_at DESC LIMIT 10000",
    params,
  );
  const rows = Array.isArray(result) ? result as Array<Record<string, string | number>> : [];
  await getNeonSql().query(
    "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "VALUES ($1::uuid, $2, $3, 'orders.exported', 'order', 'branch', jsonb_build_object('search', $4, 'status', $5, 'due', $6, 'payment', $7, 'rows', $8::int))",
    [randomUUID(), session.branchId, session.userId, search || null, status, dueFilter, paymentFilter, rows.length],
  );
  const output = [
    ["Pesanan", "Pelanggan", "Telepon", "Layanan", "Jumlah", "Satuan", "Status", "Biaya express (Rp)", "Biaya antar (Rp)", "Diskon (Rp)", "Total (Rp)", "Dibayar (Rp)", "Sisa (Rp)", "Jatuh tempo"].map(cell).join(","),
    ...rows.map((row) => [row.id, row.customer, row.phone, row.service, row.quantity, row.unit, row.status, row.express_fee, row.delivery_fee, row.discount_amount, row.amount, row.paid_amount, Number(row.amount) - Number(row.paid_amount), row.due_date].map(cell).join(",")),
  ].join("\r\n");
  return new NextResponse("\uFEFF" + output, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="pesanan-laundry.csv"', "Cache-Control": "no-store" } });
}
