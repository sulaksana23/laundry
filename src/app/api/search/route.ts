import { NextResponse } from "next/server";
import { hasPermission } from "@/server/modules/auth/permissions";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rowsOf<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

function jsonArray<Row>(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed as Row[] : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Silakan masuk untuk melanjutkan." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const canSearchOrders = hasPermission(session.role, "orders:read");
  const canSearchCustomers = hasPermission(session.role, "customers:read");
  if (!canSearchOrders && !canSearchCustomers) return NextResponse.json({ error: "Pencarian tidak diizinkan." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  if (!isOrdersDatabaseEnabled()) return NextResponse.json({ error: "Pencarian memerlukan database aktif." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80) return NextResponse.json({ error: "Masukkan 2 sampai 80 karakter untuk mencari." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  try {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const result = await getNeonSql().query(
      "WITH order_matches AS MATERIALIZED (" +
      "SELECT order_row.id, customer.name AS customer_name, order_row.service_name_snapshot AS service_name, order_row.status, order_row.received_at " +
      "FROM laundry_orders order_row JOIN laundry_customers customer " +
      "ON customer.id = order_row.customer_id AND customer.branch_id = order_row.branch_id " +
      "WHERE order_row.branch_id = $1 AND $3::boolean " +
      "AND (order_row.id ILIKE $2 ESCAPE E'\\\\' OR customer.name ILIKE $2 ESCAPE E'\\\\' OR customer.phone ILIKE $2 ESCAPE E'\\\\') " +
      "ORDER BY order_row.received_at DESC, order_row.id DESC LIMIT 5" +
      "), customer_matches AS MATERIALIZED (" +
      "SELECT id, name, phone FROM laundry_customers customer " +
      "WHERE customer.branch_id = $1 AND $4::boolean " +
      "AND (customer.name ILIKE $2 ESCAPE E'\\\\' OR customer.phone ILIKE $2 ESCAPE E'\\\\') " +
      "ORDER BY customer.name ASC, customer.id ASC LIMIT 5" +
      ") SELECT " +
      "(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'customerName', customer_name, 'serviceName', service_name, 'status', status) ORDER BY received_at DESC), '[]'::jsonb) FROM order_matches) AS orders, " +
      "(SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id::text, 'name', name, 'phone', phone) ORDER BY name ASC), '[]'::jsonb) FROM customer_matches) AS customers",
      [session.branchId, pattern, canSearchOrders, canSearchCustomers],
    );
    const row = rowsOf<{ orders: unknown; customers: unknown }>(result)[0];
    return NextResponse.json({ orders: jsonArray(row?.orders), customers: jsonArray(row?.customers) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Pencarian gagal dimuat. Coba lagi." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
