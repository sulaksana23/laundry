import { NextResponse } from "next/server";
import { csvCell } from "@/lib/csv";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isProActive } from "@/server/modules/license/license";
import { hasPermission } from "@/server/modules/auth/permissions";
import { getCurrentReportDateRange } from "@/server/modules/workspace/operations";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


function validDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk mengunduh laporan." }, { status: 401 });
  if (!hasPermission(session.role, "reports:export")) return NextResponse.json({ error: "Ekspor laporan hanya tersedia bagi pemilik." }, { status: 403 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Laporan CSV tersedia setelah database aktif." }, { status: 503 });
  if (!(await isProActive(session.branchId))) return NextResponse.json({ error: "Ekspor laporan CSV adalah fitur LaundryOS Pro. Aktifkan Pro di Pengaturan untuk mengunduh laporan." }, { status: 403 });

  const url = new URL(request.url);
  const defaultRange = await getCurrentReportDateRange(session.branchId);
  const from = url.searchParams.get("from") ?? defaultRange.from;
  const to = url.searchParams.get("to") ?? defaultRange.to;
  const dayCount = Math.round((new Date(to + "T00:00:00.000Z").getTime() - new Date(from + "T00:00:00.000Z").getTime()) / 86400000) + 1;
  if (!validDate(from) || !validDate(to) || dayCount < 1 || dayCount > 366) {
    return NextResponse.json({ error: "Pilih rentang tanggal valid antara 1 dan 366 hari." }, { status: 400 });
  }
  const result = await getNeonSql().query(
    "WITH bounds AS (SELECT id, timezone, $2::date AS from_date, ($3::date + 1) AS until_date FROM laundry_branches WHERE id = $1) " +
    "SELECT date, method, SUM(payments)::int AS payments, SUM(income)::bigint AS income FROM (" +
    "SELECT to_char((p.received_at AT TIME ZONE b.timezone)::date, 'YYYY-MM-DD') AS date, p.method, COUNT(*)::int AS payments, SUM(p.amount)::bigint AS income " +
    "FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= (b.from_date::timestamp AT TIME ZONE b.timezone) AND p.received_at < (b.until_date::timestamp AT TIME ZONE b.timezone) GROUP BY (p.received_at AT TIME ZONE b.timezone)::date, p.method " +
    "UNION ALL SELECT to_char((r.created_at AT TIME ZONE b.timezone)::date, 'YYYY-MM-DD'), r.method, -COUNT(*)::int, -SUM(r.amount)::bigint " +
    "FROM laundry_order_refunds r CROSS JOIN bounds b WHERE r.branch_id = b.id AND r.created_at >= (b.from_date::timestamp AT TIME ZONE b.timezone) AND r.created_at < (b.until_date::timestamp AT TIME ZONE b.timezone) GROUP BY (r.created_at AT TIME ZONE b.timezone)::date, r.method" +
    ") flows GROUP BY date, method ORDER BY date, method",
    [session.branchId, from, to],
  );
  const rows = Array.isArray(result) ? result as Array<{ date: string; method: string; payments: number | string; income: number | string }> : [];
  await getNeonSql().query(
    "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "VALUES ($1::uuid, $2, $3, 'report.exported', 'report', $4, jsonb_build_object('from', $5, 'to', $6))",
    [randomUUID(), session.branchId, session.userId, `${from}:${to}`, from, to],
  );
  const body = [
    ["Tanggal", "Metode", "Jumlah pembayaran", "Pemasukan (Rp)"].map(csvCell).join(","),
    ...rows.map((row) => [row.date, row.method, row.payments, row.income].map(csvCell).join(",")),
  ].join("\r\n");
  return new NextResponse("\uFEFF" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-pembayaran-${from}-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
