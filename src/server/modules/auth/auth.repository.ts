import "server-only";
import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

export type AuthRole = "owner";

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  branchId: string;
  branchName: string;
  role: AuthRole;
}

export interface AuthCredentials extends AuthUser {
  passwordHash: string;
}

interface NewOwnerAccount {
  userId: string;
  branchId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  branchName: string;
}

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

function toCredentials(row: {
  user_id: string;
  email: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
  role: AuthRole;
  password_hash: string;
}): AuthCredentials {
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    branchId: row.branch_id,
    branchName: row.branch_name,
    role: row.role,
    passwordHash: row.password_hash,
  };
}


const DEMO_EMAIL = "demo@laundry.test";

function valueTuples(rowCount: number, columnCount: number, uuidColumns: number[] = []) {
  let position = 1;
  return Array.from({ length: rowCount }, () => {
    const columns = Array.from({ length: columnCount }, (_, column) => {
      const placeholder = "$" + position++;
      return uuidColumns.includes(column) ? placeholder + "::uuid" : placeholder;
    });
    return "(" + columns.join(", ") + ")";
  }).join(", ");
}

function demoSeedStatements(
  sql: ReturnType<typeof getNeonSql>,
  branchId: string,
  actorId: string,
  serviceIds: string[],
) {
  const customers = [
    { id: randomUUID(), name: "Made Arya", phone: "0812-0000-0001" },
    { id: randomUUID(), name: "Putu Dewi", phone: "0812-0000-0002" },
    { id: randomUUID(), name: "Wayan Sari", phone: "0812-0000-0003" },
    { id: randomUUID(), name: "Kadek Budi", phone: "0812-0000-0004" },
  ];
  const customerStatement = sql.query(
    "INSERT INTO laundry_customers (id, branch_id, name, phone) VALUES " + valueTuples(customers.length, 4, [0]),
    customers.flatMap((customer) => [customer.id, branchId, customer.name, customer.phone]),
  );

  const definitions = [
    { customer: 0, service: 0, name: "Cuci + Setrika", weight: 4.5, price: 8000, paid: 36000, status: "ready", dueDays: 0, hoursAgo: 5 },
    { customer: 1, service: 1, name: "Cuci Kering", weight: 3, price: 6000, paid: 10000, status: "washing", dueDays: 1, hoursAgo: 4 },
    { customer: 2, service: 2, name: "Setrika Saja", weight: 2.5, price: 8000, paid: 0, status: "ironing", dueDays: 2, hoursAgo: 30 },
    { customer: 0, service: 0, name: "Cuci + Setrika", weight: 6, price: 8000, paid: 48000, status: "completed", dueDays: -1, hoursAgo: 48 },
    { customer: 3, service: 3, name: "Express 6 Jam", weight: 2, price: 12000, paid: 0, status: "received", dueDays: 0, hoursAgo: 2 },
    { customer: 1, service: 1, name: "Cuci Kering", weight: 5, price: 6000, paid: 0, status: "received", dueDays: 2, hoursAgo: 20 },
  ];
  const orders = definitions.map((definition, index) => ({
    ...definition,
    id: "DEMO-" + branchId.slice(0, 8).toUpperCase() + "-" + String(index + 1).padStart(3, "0"),
    customerId: customers[definition.customer].id,
    serviceId: serviceIds[definition.service],
    amount: Math.round(definition.weight * definition.price),
  }));
  let orderPosition = 1;
  const orderTuples = orders.map(() => {
    const start = orderPosition;
    orderPosition += 11;
    return "($" + start + "::text, $" + (start + 1) + "::text, $" + (start + 2) + "::uuid, $" +
      (start + 3) + "::text, $" + (start + 4) + "::text, $" + (start + 5) + "::numeric, $" +
      (start + 6) + "::bigint, $" + (start + 7) + "::bigint, $" + (start + 8) + "::text, CURRENT_DATE + $" +
      (start + 9) + "::int, now() - ($" + (start + 10) + "::int * interval '1 hour'))";
  }).join(", ");
  const orderStatement = sql.query(
    "INSERT INTO laundry_orders (id, branch_id, customer_id, service_id, service_name_snapshot, weight_kg, amount, paid_amount, status, due_at, received_at) VALUES " + orderTuples,
    orders.flatMap((order) => [order.id, branchId, order.customerId, order.serviceId, order.name, order.weight, order.amount, order.paid, order.status, order.dueDays, order.hoursAgo]),
  );

  const historyRows = orders.map((order) => [randomUUID(), branchId, order.id, order.status, actorId, order.hoursAgo]);
  let historyPosition = 1;
  const historyTuples = historyRows.map(() => {
    const start = historyPosition;
    historyPosition += 6;
    return "($" + start + "::uuid, $" + (start + 1) + ", $" + (start + 2) + ", NULL, $" +
      (start + 3) + ", $" + (start + 4) + ", now() - ($" + (start + 5) + "::int * interval '1 hour'))";
  }).join(", ");
  const historyStatement = sql.query(
    "INSERT INTO laundry_order_status_history (id, branch_id, order_id, previous_status, next_status, actor_id, changed_at) VALUES " + historyTuples,
    historyRows.flat(),
  );

  const payments = orders.filter((order) => order.paid > 0).map((order, index) => [
    randomUUID(), branchId, order.id, order.paid, index === 0 ? "cash" : "transfer", actorId, order.hoursAgo - 1,
  ]);
  let paymentPosition = 1;
  const paymentTuples = payments.map(() => {
    const start = paymentPosition;
    paymentPosition += 7;
    return "($" + start + "::uuid, $" + (start + 1) + ", $" + (start + 2) + ", $" + (start + 3) +
      ", $" + (start + 4) + ", $" + (start + 5) + ", now() - ($" + (start + 6) + "::int * interval '1 hour'))";
  }).join(", ");
  const paymentStatement = sql.query(
    "INSERT INTO laundry_payments (id, branch_id, order_id, amount, method, actor_id, received_at) VALUES " + paymentTuples,
    payments.flat(),
  );

  const inventory = [
    [randomUUID(), branchId, "Detergen cair", "Bahan cuci", "liter", 8, 10, 42000],
    [randomUUID(), branchId, "Pewangi laundry", "Bahan cuci", "liter", 14, 8, 38000],
    [randomUUID(), branchId, "Plastik kemasan M", "Kemasan", "pak", 6, 5, 27000],
    [randomUUID(), branchId, "Plastik kemasan L", "Kemasan", "pak", 3, 5, 35000],
    [randomUUID(), branchId, "Pelembut pakaian", "Bahan cuci", "liter", 11, 8, 36000],
  ];
  const inventoryStatement = sql.query(
    "INSERT INTO laundry_inventory_items (id, branch_id, name, category, unit, quantity, min_quantity, unit_price) VALUES " +
    valueTuples(inventory.length, 8, [0]),
    inventory.flat(),
  );

  const expenses = [
    [randomUUID(), branchId, "Pembelian detergen", "Bahan baku", 210000, "cash", 0],
    [randomUUID(), branchId, "Tagihan listrik", "Utilitas", 785000, "transfer", 1],
    [randomUUID(), branchId, "Perawatan mesin", "Perawatan", 325000, "cash", 2],
  ];
  let expensePosition = 1;
  const expenseTuples = expenses.map(() => {
    const start = expensePosition;
    expensePosition += 7;
    return "($" + start + "::uuid, $" + (start + 1) + ", $" + (start + 2) + ", $" +
      (start + 3) + ", $" + (start + 4) + ", $" + (start + 5) + ", CURRENT_DATE - $" +
      (start + 6) + "::int)";
  }).join(", ");
  const expenseStatement = sql.query(
    "INSERT INTO laundry_expenses (id, branch_id, description, category, amount, method, incurred_at) VALUES " + expenseTuples,
    expenses.flat(),
  );

  return [customerStatement, orderStatement, historyStatement, paymentStatement, inventoryStatement, expenseStatement];
}

export class AuthRepository {
  async findByEmail(email: string): Promise<AuthCredentials | null> {
    const result = await getNeonSql().query(
      "SELECT u.id AS user_id, u.email, u.full_name, u.branch_id, b.name AS branch_name, u.role, u.password_hash " +
        "FROM laundry_users u JOIN laundry_branches b ON b.id = u.branch_id " +
        "WHERE lower(u.email) = lower($1) LIMIT 1",
      [email],
    );
    const row = resultRows<Parameters<typeof toCredentials>[0]>(result)[0];
    return row ? toCredentials(row) : null;
  }

  async createOwnerAccount(input: NewOwnerAccount): Promise<AuthUser> {
    const sql = getNeonSql();
    const serviceIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    try {
      const statements = [
        sql.query(
          "INSERT INTO laundry_branches (id, name, timezone) VALUES ($1, $2, 'Asia/Makassar')",
          [input.branchId, input.branchName],
        ),
        sql.query(
          "INSERT INTO laundry_users (id, branch_id, full_name, email, password_hash, role) " +
            "VALUES ($1, $2, $3, $4, $5, 'owner')",
          [input.userId, input.branchId, input.fullName, input.email, input.passwordHash],
        ),
        sql.query(
          "INSERT INTO laundry_services (id, branch_id, name, unit, price_per_unit) VALUES " +
            "($1, $5, 'Cuci + Setrika', 'kg', 8000), " +
            "($2, $5, 'Cuci Kering', 'kg', 6000), " +
            "($3, $5, 'Setrika Saja', 'kg', 8000), " +
            "($4, $5, 'Express 6 Jam', 'kg', 12000)",
          [...serviceIds, input.branchId],
        ),
      ];
      if (input.email.toLowerCase() === DEMO_EMAIL) {
        statements.push(...demoSeedStatements(sql, input.branchId, input.userId, serviceIds));
      }
      await sql.transaction(statements);
    } catch (error) {
      const existing = await this.findByEmail(input.email).catch(() => null);
      if (existing) throw new Error("EMAIL_EXISTS");
      throw error;
    }

    return {
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      branchId: input.branchId,
      branchName: input.branchName,
      role: "owner",
    };
  }
}
