import { NextResponse } from "next/server";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isProActive } from "@/server/modules/license/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  return "\"" + String(value ?? "").replaceAll("\"", "\"\"") + "\"";
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk mengunduh laporan." }, { status: 401 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Laporan CSV tersedia setelah database aktif." }, { status: 503 });
  if (!(await isProActive(session.branchId))) return NextResponse.json({ error: "Ekspor laporan CSV adalah fitur LaundryOS Pro. Aktifkan Pro di Pengaturan untuk mengunduh laporan." }, { status: 403 });

  const result = await getNeonSql().query(
    "WITH branch_clock AS (" +
    "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
    "), bounds AS (" +
    "SELECT id, timezone, date_trunc('month', local_now) AS month_start, " +
    "(date_trunc('month', local_now) + interval '1 month') AS next_month_start FROM branch_clock" +
    ") SELECT to_char((p.received_at AT TIME ZONE b.timezone)::date, 'YYYY-MM-DD') AS date, " +
    "COUNT(*)::int AS payments, COALESCE(SUM(p.amount), 0)::bigint AS income " +
    "FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id " +
    "AND p.received_at >= (b.month_start AT TIME ZONE b.timezone) " +
    "AND p.received_at < (b.next_month_start AT TIME ZONE b.timezone) " +
    "GROUP BY (p.received_at AT TIME ZONE b.timezone)::date " +
    "ORDER BY (p.received_at AT TIME ZONE b.timezone)::date",
    [session.branchId],
  );
  const rows = Array.isArray(result) ? result as Array<{ date: string; payments: number | string; income: number | string }> : [];
  const body = [
    ["Tanggal", "Jumlah pembayaran", "Pemasukan (Rp)"].map(csvCell).join(","),
    ...rows.map((row) => [row.date, row.payments, row.income].map(csvCell).join(",")),
  ].join("\r\n");
  return new NextResponse("\uFEFF" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"laporan-pembayaran-bulanan.csv\"",
      "Cache-Control": "no-store",
    },
  });
}
