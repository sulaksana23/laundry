import { randomUUID } from "node:crypto";
import type { LaundryOrder, OrderStatus } from "@/features/orders/domain/order";
import { getNeonSql } from "@/server/db/neon";
import type {
  NewOrderRecord,
  OrderListQuery,
  OrderListResult,
  OrdersRepository,
  UpdateOrderStatusRecord,
} from "@/server/modules/orders/orders.repository";

type OrderRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  weight_kg: string | number;
  amount: string | number;
  paid_amount: string | number;
  payment_status: "paid" | "partial" | "unpaid";
  status: OrderStatus;
  received_at: string | Date;
  due_at: string;
};

const ORDER_COLUMNS =
  "o.id, c.name AS customer_name, c.phone AS customer_phone, " +
  "o.service_name_snapshot AS service_name, o.weight_kg, o.amount, o.paid_amount, o.status, " +
  "o.received_at, to_char(o.due_at, 'YYYY-MM-DD') || 'T12:00:00.000Z' AS due_at, " +
  "CASE WHEN o.paid_amount <= 0 THEN 'unpaid' " +
  "WHEN o.paid_amount < o.amount THEN 'partial' ELSE 'paid' END AS payment_status";

const ORDER_JOINS =
  " FROM laundry_orders o " +
  "JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id";

function toLaundryOrder(row: OrderRow): LaundryOrder {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceName: row.service_name,
    weightKg: Number(row.weight_kg),
    amount: Number(row.amount),
    paidAmount: Number(row.paid_amount),
    paymentStatus: row.payment_status,
    status: row.status,
    receivedAt: new Date(String(row.received_at)).toISOString(),
    dueAt: new Date(row.due_at).toISOString(),
  };
}

export class PostgresOrdersRepository implements OrdersRepository {
  async list(query: OrderListQuery): Promise<OrderListResult> {
    const conditions = ["o.branch_id = $1"];
    const parameters: Array<string | number> = [query.branchId];
    if (query.search) {
      parameters.push("%" + query.search.trim() + "%");
      const index = parameters.length;
      conditions.push("(o.id ILIKE $" + index + " OR c.name ILIKE $" + index + " OR c.phone ILIKE $" + index + ")");
    }
    if (query.status) {
      parameters.push(query.status);
      conditions.push("o.status = $" + parameters.length);
    }
    const where = " WHERE " + conditions.join(" AND ");
    const sql = getNeonSql();
    const countRows = await sql.query(
      "SELECT COUNT(*)::int AS total" + ORDER_JOINS + where,
      parameters,
    );
    const total = Number(((countRows as unknown as Array<{ total: number | string }>)[0])?.total ?? 0);
    const pageParameters = [...parameters, query.pageSize, (query.page - 1) * query.pageSize];
    const rows = await sql.query(
      "SELECT " + ORDER_COLUMNS + ORDER_JOINS + where +
      " ORDER BY o.received_at DESC LIMIT $" + (parameters.length + 1) +
      " OFFSET $" + (parameters.length + 2),
      pageParameters,
    );
    return {
      items: (rows as OrderRow[]).map(toLaundryOrder),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(id: string, branchId: string): Promise<LaundryOrder | null> {
    const rows = await getNeonSql().query(
      "SELECT " + ORDER_COLUMNS + ORDER_JOINS + " WHERE o.id = $1 AND o.branch_id = $2 LIMIT 1",
      [id, branchId],
    );
    const row = (rows as OrderRow[])[0];
    return row ? toLaundryOrder(row) : null;
  }

  async create(input: NewOrderRecord): Promise<LaundryOrder> {
    const id = "LND-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + randomUUID().slice(0, 4).toUpperCase();
    const historyId = randomUUID();
    const actorId = process.env.LAUNDRY_DEMO_ACTOR_ID || "preview-user";
    const dueDate = input.dueAt.slice(0, 10);
    const sql = getNeonSql();
    const rows = await sql.query(
      "WITH customer_upsert AS (" +
        "INSERT INTO laundry_customers (id, branch_id, name, phone) " +
        "VALUES ($1::uuid, $2, $3, $4) " +
        "ON CONFLICT (branch_id, phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now() " +
        "RETURNING id" +
      "), inserted_order AS (" +
        "INSERT INTO laundry_orders (id, branch_id, customer_id, service_id, service_name_snapshot, weight_kg, amount, paid_amount, status, due_at) " +
        "SELECT $5, $2, customer_upsert.id, service.id, service.name, $6, $7, 0, 'received', $8::date " +
        "FROM customer_upsert CROSS JOIN laundry_services service " +
        "WHERE service.branch_id = $2 AND service.name = $9 AND service.unit = 'kg' AND service.is_active = true " +
        "RETURNING *" +
      "), inserted_history AS (" +
        "INSERT INTO laundry_order_status_history (id, branch_id, order_id, previous_status, next_status, actor_id, changed_at) " +
        "SELECT $10::uuid, $2, id, NULL, 'received', $11, now() FROM inserted_order RETURNING order_id" +
      ") " +
      "SELECT " + ORDER_COLUMNS +
      " FROM inserted_order o JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id",
      [randomUUID(), input.branchId, input.customerName, input.customerPhone, id, input.weightKg, input.amount, dueDate, input.serviceName, historyId, actorId],
    );
    const row = (rows as OrderRow[])[0];
    if (!row) throw new Error("Layanan tidak tersedia pada cabang ini.");
    return toLaundryOrder(row);
  }

  async updateStatus(input: UpdateOrderStatusRecord): Promise<LaundryOrder> {
    const historyId = randomUUID();
    const actorId = input.actorId || process.env.LAUNDRY_DEMO_ACTOR_ID || "preview-user";
    const rows = await getNeonSql().query(
      "WITH updated_order AS (" +
        "UPDATE laundry_orders SET status = $1, updated_at = $2::timestamptz " +
        "WHERE id = $3 AND branch_id = $4 AND status = $5 RETURNING *" +
      "), inserted_history AS (" +
        "INSERT INTO laundry_order_status_history (id, branch_id, order_id, previous_status, next_status, actor_id, changed_at) " +
        "SELECT $6::uuid, $4, id, $5, $1, $7, $2::timestamptz FROM updated_order RETURNING order_id" +
      ") " +
      "SELECT " + ORDER_COLUMNS +
      " FROM updated_order o JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id",
      [input.nextStatus, input.changedAt, input.id, input.branchId, input.expectedStatus, historyId, actorId],
    );
    const row = (rows as OrderRow[])[0];
    if (!row) throw new Error("ORDER_CONFLICT");
    return toLaundryOrder(row);
  }
}
