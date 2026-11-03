import { NextResponse } from "next/server";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getAuthSession } from "@/server/modules/auth/auth.session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  return "\"" + String(value ?? "").replaceAll("\"", "\"\"") + "\"";
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk mengunduh laporan." }, { status: 401 });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Laporan CSV tersedia setelah database aktif." }, { status: 503 });

  const result = await getNeonSql().query(
    "SELECT to_char(date_trunc('day', p.received_at), 'YYYY-MM-DD') AS date, COUNT(*)::int AS payments, " +
    "COALESCE(SUM(p.amount), 0)::bigint AS income " +
    "FROM laundry_payments p WHERE p.branch_id = $1 " +
    "AND p.received_at >= date_trunc('month', now()) GROUP BY date_trunc('day', p.received_at) ORDER BY date_trunc('day', p.received_at)",
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
