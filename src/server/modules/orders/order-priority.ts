import "server-only";

import type { OrderStatus } from "@/features/orders/domain/order";
import type { OrderPriority } from "@/features/orders/domain/order-priority";
import { getNeonSql } from "@/server/db/neon";

type PriorityRow = {
  id: string;
  customer_name: string;
  service_name: string;
  due_date: string;
  status: OrderStatus;
  priority: OrderPriority;
  total: string | number;
  overdue: string | number;
};

// Tanggal target adalah tanggal cabang, bukan perkiraan jam selesai.
export async function getOrderPriorities(branchId: string) {
  const rows = await getNeonSql().query(
    "WITH branch_clock AS (" +
      " SELECT id, (now() AT TIME ZONE timezone)::date AS today FROM laundry_branches WHERE id = $1" +
    "), priority AS (" +
      " SELECT o.id, c.name AS customer_name, o.service_name_snapshot AS service_name, o.status," +
      " o.due_at, o.received_at, to_char(o.due_at, 'YYYY-MM-DD') AS due_date," +
      " CASE WHEN o.due_at < b.today THEN 'overdue' ELSE 'today' END AS priority," +
      " COUNT(*) OVER() AS total," +
      " COUNT(*) FILTER (WHERE o.due_at < b.today) OVER() AS overdue" +
      " FROM laundry_orders o JOIN branch_clock b ON b.id = o.branch_id" +
      " JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id" +
      " WHERE o.branch_id = $1 AND o.status IN ('received', 'washing', 'drying', 'ironing')" +
      " AND o.due_at <= b.today" +
    ") SELECT * FROM priority ORDER BY due_at ASC, received_at ASC, id ASC LIMIT 5",
    [branchId],
  ) as PriorityRow[];
  const total = Number(rows[0]?.total ?? 0);
  const overdue = Number(rows[0]?.overdue ?? 0);
  return {
    overdue,
    today: total - overdue,
    items: rows.map((row) => ({
      id: row.id,
      customerName: row.customer_name,
      serviceName: row.service_name,
      dueDate: row.due_date,
      status: row.status,
      priority: row.priority,
    })),
  };
}
