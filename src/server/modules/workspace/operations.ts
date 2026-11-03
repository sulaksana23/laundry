import "server-only";
import { getNeonSql } from "@/server/db/neon";

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
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

export async function listCustomers(branchId: string, search = ""): Promise<CustomerSummary[]> {
  const parameters: string[] = [branchId];
  const filter = search.trim()
    ? (parameters.push("%" + search.trim() + "%"), " AND (c.name ILIKE $2 OR c.phone ILIKE $2)")
    : "";
  const rows = resultRows<{
    id: string; name: string; phone: string; orders: number | string;
    total_spent: number | string; last_order: string | null;
  }>(await getNeonSql().query(
    "SELECT c.id::text AS id, c.name, c.phone, COUNT(o.id)::int AS orders, " +
    "COALESCE(SUM(o.amount), 0)::bigint AS total_spent, " +
    "to_char(MAX(o.received_at AT TIME ZONE b.timezone), 'YYYY-MM-DD') AS last_order " +
    "FROM laundry_customers c JOIN laundry_branches b ON b.id = c.branch_id " +
    "LEFT JOIN laundry_orders o ON o.customer_id = c.id AND o.branch_id = c.branch_id " +
    "WHERE c.branch_id = $1" + filter + " GROUP BY c.id, c.name, c.phone, b.timezone ORDER BY c.name ASC",
    parameters,
  ));
  return rows.map((row) => ({
    id: row.id, name: row.name, phone: row.phone, orders: Number(row.orders),
    totalSpent: Number(row.total_spent), lastOrder: row.last_order,
  }));
}

export interface OrderSummary {
  today: number;
  active: number;
  ready: number;
  unpaid: number;
}

export async function getOrderSummary(branchId: string): Promise<OrderSummary> {
  const rows = resultRows<Record<string, number | string>>(await getNeonSql().query(
    "WITH branch_clock AS (" +
    "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
    "), bounds AS (" +
    "SELECT id, timezone, ((local_now::date)::timestamp AT TIME ZONE timezone) AS day_start, " +
    "(((local_now::date + 1)::timestamp) AT TIME ZONE timezone) AS next_day_start FROM branch_clock" +
    ") SELECT " +
    "(COUNT(o.id) FILTER (WHERE o.received_at >= b.day_start AND o.received_at < b.next_day_start))::int AS today, " +
    "(COUNT(o.id) FILTER (WHERE o.status <> 'completed'))::int AS active, " +
    "(COUNT(o.id) FILTER (WHERE o.status = 'ready'))::int AS ready, " +
    "(COUNT(o.id) FILTER (WHERE o.paid_amount < o.amount))::int AS unpaid " +
    "FROM bounds b LEFT JOIN laundry_orders o ON o.branch_id = b.id",
    [branchId],
  ));
  const row = rows[0] ?? {};
  return {
    today: Number(row.today ?? 0),
    active: Number(row.active ?? 0),
    ready: Number(row.ready ?? 0),
    unpaid: Number(row.unpaid ?? 0),
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
}

export async function listInventory(branchId: string): Promise<InventoryItem[]> {
  const rows = resultRows<{
    id: string; name: string; category: string; unit: string;
    quantity: number | string; min_quantity: number | string; unit_price: number | string;
  }>(await getNeonSql().query(
    "SELECT id::text, name, category, unit, quantity, min_quantity, unit_price " +
    "FROM laundry_inventory_items WHERE branch_id = $1 ORDER BY name ASC",
    [branchId],
  ));
  return rows.map((row) => ({
    id: row.id, name: row.name, category: row.category, unit: row.unit,
    stock: Number(row.quantity), minStock: Number(row.min_quantity), price: Number(row.unit_price),
  }));
}

export interface ExpenseItem {
  id: string;
  label: string;
  category: string;
  amount: number;
  date: string;
  method: string;
}

export async function listExpenses(branchId: string): Promise<ExpenseItem[]> {
  const rows = resultRows<{
    id: string; description: string; category: string; amount: number | string;
    incurred_at: string; method: string;
  }>(await getNeonSql().query(
    "SELECT id::text, description, category, amount, to_char(incurred_at, 'YYYY-MM-DD') AS incurred_at, method " +
    "FROM laundry_expenses WHERE branch_id = $1 ORDER BY incurred_at DESC, created_at DESC LIMIT 100",
    [branchId],
  ));
  return rows.map((row) => ({
    id: row.id, label: row.description, category: row.category,
    amount: Number(row.amount), date: row.incurred_at, method: row.method,
  }));
}

export interface FinanceSummary {
  incomeMonth: number;
  expenseMonth: number;
  outstanding: number;
  unpaidCount: number;
  incomeToday: number;
  expensesToday: number;
  paymentsToday: number;
  expensesTodayCount: number;
}

export async function getFinanceSummary(branchId: string): Promise<FinanceSummary> {
  const rows = resultRows<Record<string, number | string>>(await getNeonSql().query(
    "WITH branch_clock AS (" +
    "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
    "), bounds AS (" +
    "SELECT id, timezone, local_now, date_trunc('month', local_now) AS month_start, " +
    "(date_trunc('month', local_now) + interval '1 month') AS next_month_start, " +
    "((local_now::date)::timestamp AT TIME ZONE timezone) AS day_start, " +
    "(((local_now::date + 1)::timestamp) AT TIME ZONE timezone) AS next_day_start FROM branch_clock" +
    ") SELECT " +
    "COALESCE((SELECT SUM(p.amount) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= (b.month_start AT TIME ZONE b.timezone) AND p.received_at < (b.next_month_start AT TIME ZONE b.timezone)), 0) AS income_month, " +
    "COALESCE((SELECT SUM(e.amount) FROM laundry_expenses e CROSS JOIN bounds b WHERE e.branch_id = b.id AND e.incurred_at >= b.month_start::date AND e.incurred_at < b.next_month_start::date), 0) AS expense_month, " +
    "COALESCE((SELECT SUM(o.amount - o.paid_amount) FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id AND o.paid_amount < o.amount), 0) AS outstanding, " +
    "(SELECT COUNT(*) FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id AND o.paid_amount < o.amount) AS unpaid_count, " +
    "COALESCE((SELECT SUM(p.amount) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= b.day_start AND p.received_at < b.next_day_start), 0) AS income_today, " +
    "COALESCE((SELECT SUM(e.amount) FROM laundry_expenses e CROSS JOIN bounds b WHERE e.branch_id = b.id AND e.incurred_at = b.local_now::date), 0) AS expenses_today, " +
    "(SELECT COUNT(*) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= b.day_start AND p.received_at < b.next_day_start) AS payments_today, " +
    "(SELECT COUNT(*) FROM laundry_expenses e CROSS JOIN bounds b WHERE e.branch_id = b.id AND e.incurred_at = b.local_now::date) AS expenses_today_count",
    [branchId],
  ));
  const row = rows[0] ?? {};
  return {
    incomeMonth: Number(row.income_month ?? 0), expenseMonth: Number(row.expense_month ?? 0),
    outstanding: Number(row.outstanding ?? 0), unpaidCount: Number(row.unpaid_count ?? 0),
    incomeToday: Number(row.income_today ?? 0), expensesToday: Number(row.expenses_today ?? 0),
    paymentsToday: Number(row.payments_today ?? 0), expensesTodayCount: Number(row.expenses_today_count ?? 0),
  };
}

export interface BranchProfile {
  name: string;
  phone: string;
  email: string;
  address: string;
  timezone: string;
}

export async function getBranchProfile(branchId: string): Promise<BranchProfile | null> {
  const rows = resultRows<{
    name: string; phone: string | null; email: string | null; address: string | null; timezone: string;
  }>(await getNeonSql().query(
    "SELECT name, phone, email, address, timezone FROM laundry_branches WHERE id = $1",
    [branchId],
  ));
  const row = rows[0];
  if (!row) return null;
  return {
    name: row.name, phone: row.phone ?? "", email: row.email ?? "",
    address: row.address ?? "", timezone: row.timezone,
  };
}

export interface OrderHistoryEntry {
  id: string;
  previousStatus: string | null;
  nextStatus: string;
  changedAt: string;
}

export async function listOrderHistory(branchId: string, orderId: string): Promise<OrderHistoryEntry[]> {
  const rows = resultRows<{
    id: string; previous_status: string | null; next_status: string; changed_at: string | Date;
  }>(await getNeonSql().query(
    "SELECT id::text, previous_status, next_status, changed_at FROM laundry_order_status_history " +
    "WHERE branch_id = $1 AND order_id = $2 ORDER BY changed_at ASC",
    [branchId, orderId],
  ));
  return rows.map((row) => ({
    id: row.id, previousStatus: row.previous_status, nextStatus: row.next_status,
    changedAt: new Date(String(row.changed_at)).toISOString(),
  }));
}

export interface DashboardData {
  statusCounts: Record<string, number>;
  dailyIncome: { date: string; amount: number }[];
}

export async function getDashboardData(branchId: string): Promise<DashboardData> {
  const sql = getNeonSql();
  const [statusResult, incomeResult] = await Promise.all([
    sql.query(
      "SELECT status, COUNT(*)::int AS count FROM laundry_orders " +
      "WHERE branch_id = $1 AND status <> 'completed' GROUP BY status",
      [branchId],
    ),
    sql.query(
      "WITH branch_clock AS (" +
      "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
      ") SELECT to_char((p.received_at AT TIME ZONE b.timezone)::date, 'YYYY-MM-DD') AS day, " +
      "COALESCE(SUM(p.amount), 0)::bigint AS amount " +
      "FROM laundry_payments p CROSS JOIN branch_clock b WHERE p.branch_id = b.id " +
      "AND (p.received_at AT TIME ZONE b.timezone)::date > b.local_now::date - 7 " +
      "AND (p.received_at AT TIME ZONE b.timezone)::date <= b.local_now::date " +
      "GROUP BY 1 ORDER BY 1",
      [branchId],
    ),
  ]);
  const statusCounts: Record<string, number> = {};
  for (const row of resultRows<{ status: string; count: number | string }>(statusResult)) {
    statusCounts[row.status] = Number(row.count);
  }
  return {
    statusCounts,
    dailyIncome: resultRows<{ day: string; amount: number | string }>(incomeResult).map((row) => ({
      date: row.day,
      amount: Number(row.amount),
    })),
  };
}

export async function listRecentPayments(branchId: string) {
  const rows = resultRows<{
    id: string; order_id: string; customer_name: string; amount: number | string;
    method: string; received_at: string | Date;
  }>(await getNeonSql().query(
    "SELECT p.id::text, p.order_id, c.name AS customer_name, p.amount, p.method, p.received_at " +
    "FROM laundry_payments p JOIN laundry_orders o ON o.id = p.order_id AND o.branch_id = p.branch_id " +
    "JOIN laundry_customers c ON c.id = o.customer_id AND c.branch_id = o.branch_id " +
    "WHERE p.branch_id = $1 ORDER BY p.received_at DESC LIMIT 8",
    [branchId],
  ));
  return rows.map((row) => ({
    id: row.id, orderId: row.order_id, customerName: row.customer_name,
    amount: Number(row.amount), method: row.method, date: new Date(String(row.received_at)).toISOString(),
  }));
}

export async function getReportData(branchId: string) {
  const sql = getNeonSql();
  const [summaryResult, weeklyResult, servicesResult] = await Promise.all([
    sql.query(
      "WITH branch_clock AS (" +
      "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
      "), bounds AS (" +
      "SELECT id, timezone, date_trunc('month', local_now) AS month_start, " +
      "(date_trunc('month', local_now) - interval '1 month') AS previous_month_start, " +
      "(date_trunc('month', local_now) + interval '1 month') AS next_month_start FROM branch_clock" +
      ") SELECT " +
      "(SELECT COUNT(*) FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id AND o.received_at >= (b.month_start AT TIME ZONE b.timezone) AND o.received_at < (b.next_month_start AT TIME ZONE b.timezone)) AS orders_month, " +
      "COALESCE((SELECT SUM(p.amount) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= (b.month_start AT TIME ZONE b.timezone) AND p.received_at < (b.next_month_start AT TIME ZONE b.timezone)), 0) AS income_month, " +
      "(SELECT COALESCE(SUM(o.weight_kg), 0) FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id AND o.received_at >= (b.month_start AT TIME ZONE b.timezone) AND o.received_at < (b.next_month_start AT TIME ZONE b.timezone)) AS weight_month, " +
      "(SELECT COUNT(*) FROM laundry_customers c CROSS JOIN bounds b WHERE c.branch_id = b.id AND c.created_at >= (b.month_start AT TIME ZONE b.timezone) AND c.created_at < (b.next_month_start AT TIME ZONE b.timezone)) AS new_customers, " +
      "(SELECT COUNT(*) FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id AND o.received_at >= (b.previous_month_start AT TIME ZONE b.timezone) AND o.received_at < (b.month_start AT TIME ZONE b.timezone)) AS orders_previous, " +
      "COALESCE((SELECT SUM(p.amount) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.received_at >= (b.previous_month_start AT TIME ZONE b.timezone) AND p.received_at < (b.month_start AT TIME ZONE b.timezone)), 0) AS income_previous",
      [branchId],
    ),
    sql.query(
      "WITH branch_clock AS (" +
      "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
      "), bounds AS (" +
      "SELECT id, timezone, date_trunc('month', local_now) AS month_start, " +
      "(date_trunc('month', local_now) + interval '1 month') AS next_month_start FROM branch_clock" +
      "), weekly_orders AS (" +
      "SELECT floor((extract(day FROM (o.received_at AT TIME ZONE b.timezone)) - 1) / 7)::int + 1 AS week, COUNT(*)::int AS orders " +
      "FROM laundry_orders o CROSS JOIN bounds b WHERE o.branch_id = b.id " +
      "AND o.received_at >= (b.month_start AT TIME ZONE b.timezone) " +
      "AND o.received_at < (b.next_month_start AT TIME ZONE b.timezone) GROUP BY 1" +
      "), weekly_income AS (" +
      "SELECT floor((extract(day FROM (p.received_at AT TIME ZONE b.timezone)) - 1) / 7)::int + 1 AS week, " +
      "COALESCE(SUM(p.amount), 0)::bigint AS income FROM laundry_payments p CROSS JOIN bounds b " +
      "WHERE p.branch_id = b.id AND p.received_at >= (b.month_start AT TIME ZONE b.timezone) " +
      "AND p.received_at < (b.next_month_start AT TIME ZONE b.timezone) GROUP BY 1" +
      ") SELECT COALESCE(weekly_orders.week, weekly_income.week)::int AS week, " +
      "COALESCE(weekly_orders.orders, 0)::int AS orders, COALESCE(weekly_income.income, 0)::bigint AS income " +
      "FROM weekly_orders FULL OUTER JOIN weekly_income ON weekly_orders.week = weekly_income.week ORDER BY week",
      [branchId],
    ),
    sql.query(
      "WITH branch_clock AS (" +
      "SELECT id, timezone, now() AT TIME ZONE timezone AS local_now FROM laundry_branches WHERE id = $1" +
      "), bounds AS (" +
      "SELECT id, timezone, date_trunc('month', local_now) AS month_start, " +
      "(date_trunc('month', local_now) + interval '1 month') AS next_month_start FROM branch_clock" +
      ") SELECT o.service_name_snapshot AS name, COUNT(*)::int AS count FROM laundry_orders o CROSS JOIN bounds b " +
      "WHERE o.branch_id = b.id AND o.received_at >= (b.month_start AT TIME ZONE b.timezone) " +
      "AND o.received_at < (b.next_month_start AT TIME ZONE b.timezone) " +
      "GROUP BY o.service_name_snapshot ORDER BY count DESC LIMIT 5",
      [branchId],
    ),
  ]);
  const summary = resultRows<Record<string, number | string>>(summaryResult)[0] ?? {};
  const weekly = resultRows<{ week: number | string; orders: number | string; income: number | string }>(weeklyResult);
  const services = resultRows<{ name: string; count: number | string }>(servicesResult);
  return {
    orders: Number(summary.orders_month ?? 0),
    income: Number(summary.income_month ?? 0),
    weight: Number(summary.weight_month ?? 0),
    newCustomers: Number(summary.new_customers ?? 0),
    previousOrders: Number(summary.orders_previous ?? 0),
    previousIncome: Number(summary.income_previous ?? 0),
    weeks: weekly.map((row) => ({ label: "Minggu " + row.week, orders: Number(row.orders), income: Number(row.income) })),
    services: services.map((row) => ({ name: row.name, count: Number(row.count) })),
  };
}
export interface CashClosingItem {
  id: string;
  date: string;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  note: string | null;
}

export interface ExpectedCash {
  cashIn: number;
  cashOut: number;
  expected: number;
}

/**
 * Kas tunai yang seharusnya ada pada satu tanggal kalender cabang:
 * pembayaran tunai (method = 'cash') yang diterima pada tanggal itu menurut
 * zona waktu cabang, dikurangi pengeluaran tunai pada tanggal yang sama.
 * Asumsi (menunggu kebijakan pemilik): hanya transaksi tunai yang dihitung
 * karena tutup kasir membandingkan uang fisik di laci.
 */
export async function getExpectedCash(branchId: string, date: string): Promise<ExpectedCash> {
  const rows = resultRows<Record<string, number | string>>(await getNeonSql().query(
    "WITH branch_clock AS (" +
    "SELECT id, timezone FROM laundry_branches WHERE id = $1" +
    "), bounds AS (" +
    "SELECT id, (($2::date)::timestamp AT TIME ZONE timezone) AS day_start, " +
    "((($2::date + 1)::timestamp) AT TIME ZONE timezone) AS next_day_start FROM branch_clock" +
    ") SELECT " +
    "COALESCE((SELECT SUM(p.amount) FROM laundry_payments p CROSS JOIN bounds b WHERE p.branch_id = b.id AND p.method = 'cash' AND p.received_at >= b.day_start AND p.received_at < b.next_day_start), 0) AS cash_in, " +
    "COALESCE((SELECT SUM(e.amount) FROM laundry_expenses e CROSS JOIN bounds b WHERE e.branch_id = b.id AND e.method = 'cash' AND e.incurred_at = $2::date), 0) AS cash_out",
    [branchId, date],
  ));
  const row = rows[0] ?? {};
  const cashIn = Number(row.cash_in ?? 0);
  const cashOut = Number(row.cash_out ?? 0);
  return { cashIn, cashOut, expected: cashIn - cashOut };
}

export interface CashClosingOverview extends ExpectedCash {
  today: string;
  todayClosing: CashClosingItem | null;
  history: CashClosingItem[];
}

export async function getCashClosingOverview(branchId: string): Promise<CashClosingOverview> {
  const clockRows = resultRows<{ today: string }>(await getNeonSql().query(
    "SELECT to_char((now() AT TIME ZONE timezone)::date, 'YYYY-MM-DD') AS today FROM laundry_branches WHERE id = $1",
    [branchId],
  ));
  const today = clockRows[0]?.today ?? new Date().toISOString().slice(0, 10);
  const expectedCash = await getExpectedCash(branchId, today);
  const rows = resultRows<{
    id: string; closing_date: string; expected_amount: number | string;
    counted_amount: number | string; note: string | null;
  }>(await getNeonSql().query(
    "SELECT id::text AS id, to_char(closing_date, 'YYYY-MM-DD') AS closing_date, expected_amount, counted_amount, note " +
    "FROM laundry_cash_closings WHERE branch_id = $1 ORDER BY closing_date DESC LIMIT 14",
    [branchId],
  ));
  const history: CashClosingItem[] = rows.map((row) => {
    const expectedAmount = Number(row.expected_amount);
    const countedAmount = Number(row.counted_amount);
    return {
      id: row.id, date: row.closing_date, expectedAmount, countedAmount,
      difference: countedAmount - expectedAmount, note: row.note,
    };
  });
  return {
    today,
    ...expectedCash,
    todayClosing: history.find((item) => item.date === today) ?? null,
    history,
  };
}
