import "server-only";

import { mockOrders } from "@/features/orders/data/mock-orders";
import type { OrderStatus, OrderUnit, PaymentStatus } from "@/features/orders/domain/order";
import { normalizePhoneNumber } from "@/lib/phone";
import { getNeonSql } from "@/server/db/neon";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { listOrderHistory } from "@/server/modules/workspace/operations";

export interface TrackedOrderHistory {
  status: OrderStatus;
  changedAt: string;
}

export interface TrackedOrder {
  code: string;
  customerName: string;
  serviceName: string;
  quantity: number;
  unit: OrderUnit;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  paidAmount: number;
  remaining: number;
  receivedAt: string;
  dueDate: string;
  branchName: string;
  branchPhone: string | null;
  branchTimezone: string;
  history: TrackedOrderHistory[];
  demo: boolean;
}

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

type TrackingRow = {
  id: string;
  branch_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  quantity: string | number;
  unit: OrderUnit;
  amount: string | number;
  paid_amount: string | number;
  payment_status: PaymentStatus;
  status: OrderStatus;
  received_at: string | Date;
  due_date: string;
  branch_name: string;
  branch_phone: string | null;
  branch_timezone: string;
};

async function findInDatabase(code: string, phone: string): Promise<TrackedOrder | null> {
  const rows = resultRows<TrackingRow>(await getNeonSql().query(
    "SELECT o.id, o.branch_id, c.name AS customer_name, c.phone AS customer_phone, " +
    "o.service_name_snapshot AS service_name, o.quantity, o.unit, o.amount, o.paid_amount, o.status, " +
    "o.received_at, to_char(o.due_at, 'YYYY-MM-DD') AS due_date, " +
    "CASE WHEN o.paid_amount <= 0 THEN 'unpaid' WHEN o.paid_amount < o.amount THEN 'partial' ELSE 'paid' END AS payment_status, " +
    "b.name AS branch_name, b.phone AS branch_phone, b.timezone AS branch_timezone " +
    "FROM laundry_orders o " +
    "JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id " +
    "JOIN laundry_branches b ON b.id = o.branch_id " +
    "WHERE upper(o.id) = upper($1) LIMIT 5",
    [code],
  ));
  const wanted = normalizePhoneNumber(phone);
  const row = rows.find((candidate) => normalizePhoneNumber(candidate.customer_phone) === wanted);
  if (!row) return null;

  const history = await listOrderHistory(row.branch_id, row.id);
  const amount = Number(row.amount);
  const paidAmount = Number(row.paid_amount);
  return {
    code: row.id,
    customerName: row.customer_name,
    serviceName: row.service_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    status: row.status,
    paymentStatus: row.payment_status,
    amount,
    paidAmount,
    remaining: Math.max(amount - paidAmount, 0),
    receivedAt: new Date(String(row.received_at)).toISOString(),
    dueDate: row.due_date,
    branchName: row.branch_name,
    branchPhone: row.branch_phone,
    branchTimezone: row.branch_timezone || "Asia/Makassar",
    history: history.map((entry) => ({ status: entry.nextStatus as OrderStatus, changedAt: entry.changedAt })),
    demo: false,
  };
}

function findInDemo(code: string, phone: string): TrackedOrder | null {
  const wanted = normalizePhoneNumber(phone);
  const order = mockOrders.find(
    (candidate) => candidate.id.toUpperCase() === code.toUpperCase()
      && normalizePhoneNumber(candidate.customerPhone) === wanted,
  );
  if (!order) return null;
  return {
    code: order.id,
    customerName: order.customerName,
    serviceName: order.serviceName,
    quantity: order.quantity,
    unit: order.unit,
    status: order.status,
    paymentStatus: order.paymentStatus,
    amount: order.amount,
    paidAmount: order.paidAmount,
    remaining: Math.max(order.amount - order.paidAmount, 0),
    receivedAt: order.receivedAt,
    dueDate: order.dueAt.slice(0, 10),
    branchName: "Cabang Bangli",
    branchPhone: null,
    branchTimezone: "Asia/Makassar",
    history: [{ status: order.status, changedAt: order.receivedAt }],
    demo: true,
  };
}

// Pelacakan publik: kode pesanan saja tidak cukup — nomor HP terdaftar
// berfungsi sebagai kredensial, dan hasil hanya memuat data pesanan itu sendiri.
export async function findTrackedOrder(code: string, phone: string): Promise<TrackedOrder | null> {
  const normalizedCode = code.trim();
  if (!normalizedCode || !phone.trim()) return null;
  if (isOrdersDatabaseEnabled()) return findInDatabase(normalizedCode, phone);
  return findInDemo(normalizedCode, phone);
}
