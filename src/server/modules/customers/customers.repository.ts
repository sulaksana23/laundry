import "server-only";
import { getNeonSql } from "@/server/db/neon";

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) return result.rows as Row[];
  return [];
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  lastOrder: string | null;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  transactions: number;
  revenue: number;
}

export class PostgresCustomersRepository {
  async metrics(branchId: string): Promise<CustomerMetrics> {
    const rows = resultRows<Record<string, unknown>>(await getNeonSql().query(
      "WITH branch_clock AS (SELECT id, timezone, (now() AT TIME ZONE timezone)::date AS today FROM laundry_branches WHERE id = $1), " +
      "order_metrics AS (SELECT COUNT(o.id)::int AS transactions, COALESCE(SUM(o.amount), 0)::bigint AS revenue, " +
      "COUNT(DISTINCT o.customer_id) FILTER (WHERE o.received_at >= ((b.today - 30)::timestamp AT TIME ZONE b.timezone))::int AS active_customers " +
      "FROM branch_clock b LEFT JOIN laundry_orders o ON o.branch_id = b.id) " +
      "SELECT (SELECT COUNT(*)::int FROM laundry_customers WHERE branch_id = $1) AS total_customers, " +
      "order_metrics.active_customers, order_metrics.transactions, order_metrics.revenue FROM order_metrics",
      [branchId],
    ));
    const row = rows[0];
    return {
      totalCustomers: Number(row?.total_customers ?? 0),
      activeCustomers: Number(row?.active_customers ?? 0),
      transactions: Number(row?.transactions ?? 0),
      revenue: Number(row?.revenue ?? 0),
    };
  }

  async count(branchId: string, search: string): Promise<number> {
    const rows = resultRows<Record<string, unknown>>(await getNeonSql().query(
      "SELECT COUNT(*)::int AS total FROM laundry_customers c WHERE c.branch_id = $1 " +
      "AND ($2 = '' OR c.name ILIKE $3 OR c.phone ILIKE $3)",
      [branchId, search, "%" + search + "%"],
    ));
    return Number(rows[0]?.total ?? 0);
  }

  async list(branchId: string, search: string, page: number, pageSize: number): Promise<CustomerSummary[]> {
    const rows = resultRows<Record<string, unknown>>(await getNeonSql().query(
      "WITH selected AS (SELECT c.id, c.branch_id, c.name, c.phone, b.timezone " +
      "FROM laundry_customers c JOIN laundry_branches b ON b.id = c.branch_id " +
      "WHERE c.branch_id = $1 AND ($2 = '' OR c.name ILIKE $3 OR c.phone ILIKE $3) " +
      "ORDER BY c.name ASC, c.id ASC LIMIT $4 OFFSET $5) " +
      "SELECT c.id::text AS id, c.name, c.phone, COUNT(o.id)::int AS orders, " +
      "COALESCE(SUM(o.amount), 0)::bigint AS total_spent, " +
      "to_char(MAX(o.received_at AT TIME ZONE c.timezone), 'YYYY-MM-DD') AS last_order " +
      "FROM selected c LEFT JOIN laundry_orders o ON o.customer_id = c.id AND o.branch_id = c.branch_id " +
      "GROUP BY c.id, c.name, c.phone ORDER BY c.name ASC, c.id ASC",
      [branchId, search, "%" + search + "%", pageSize, (page - 1) * pageSize],
    ));
    return rows.map((row) => ({
      id: String(row.id), name: String(row.name), phone: String(row.phone),
      orders: Number(row.orders), totalSpent: Number(row.total_spent),
      lastOrder: row.last_order ? String(row.last_order) : null,
    }));
  }
}
