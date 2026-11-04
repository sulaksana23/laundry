import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { neonConfig } from "@neondatabase/serverless";

// Resolve the same @/ aliases used by Next.js when running these tests in Node.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL("../src/" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { validateBackup } = await import("../src/lib/backup-format.ts");
const { buildBranchBackup, restoreBranchBackup } = await import("../src/server/modules/backup/backup.ts");

const customerId = "11111111-1111-1111-1111-111111111111";
const historyId = "22222222-2222-2222-2222-222222222222";
const paymentId = "33333333-3333-3333-3333-333333333333";
const expenseId = "44444444-4444-4444-4444-444444444444";
const inventoryId = "55555555-5555-5555-5555-555555555555";
const closingId = "66666666-6666-6666-6666-666666666666";
const timestamp = "2026-11-04T00:00:00.000Z";
const common = { branch_id: "main", created_at: timestamp, updated_at: timestamp };

function backupFixture() {
  return {
    app: "LaundryOS",
    kind: "laundryos-branch-backup",
    formatVersion: 1,
    exportedAt: timestamp,
    branch: { id: "main", name: "Contoh", timezone: "Asia/Makassar", phone: null, email: null, address: null },
    tables: {
      customers: [{ ...common, id: customerId, name: "Contoh", phone: "08000000000" }],
      services: [{ ...common, id: "svc-1", name: "Cuci", unit: "kg", price_per_unit: "8000", is_active: true, description: "", duration_minutes: 60 }],
      orders: [{ id: "ORD-1", branch_id: "main", customer_id: customerId, service_id: "svc-1", service_name_snapshot: "Cuci", weight_kg: "2.00", amount: "16000", paid_amount: "8000", status: "received", due_at: "2026-11-05", received_at: timestamp, updated_at: timestamp }],
      orderStatusHistory: [{ id: historyId, branch_id: "main", order_id: "ORD-1", previous_status: null, next_status: "received", actor_id: "user", changed_at: timestamp }],
      payments: [{ id: paymentId, branch_id: "main", order_id: "ORD-1", amount: "8000", method: "cash", actor_id: "user", received_at: timestamp }],
      expenses: [{ id: expenseId, branch_id: "main", description: "Sabun", category: "Operasional", amount: "1000", method: "cash", incurred_at: "2026-11-04", created_at: timestamp }],
      inventoryItems: [{ ...common, id: inventoryId, name: "Sabun", category: "Bahan", unit: "liter", quantity: "1.250", min_quantity: "0.000", unit_price: "1000" }],
      cashClosings: [{ ...common, id: closingId, closing_date: "2026-11-04", expected_amount: "-1000", counted_amount: "0", note: null, closed_by: null }],
    },
  };
}

test("menerima backup lengkap termasuk bigint, desimal, dan kolom nullable", () => {
  assert.equal(validateBackup(backupFixture()).ok, true);
});

test("menolak nilai kolom yang rusak sebelum restore", () => {
  for (const mutate of [
    (b) => { b.tables.payments[0].amount = "-1"; },
    (b) => { b.tables.customers[0].id = "bukan-uuid"; },
    (b) => { b.tables.orders[0].due_at = "2026-02-30"; },
    (b) => { delete b.tables.services[0].duration_minutes; },
    (b) => { b.branch.timezone = null; },
    (b) => { b.exportedAt = null; },
    (b) => { b.tables.inventoryItems[0].quantity = "1.2345"; },
  ]) {
    const backup = backupFixture();
    mutate(backup);
    assert.equal(validateBackup(backup).ok, false);
  }
});

test("menolak cabang lain, id duplikat, dan referensi yang tidak ada", () => {
  for (const mutate of [
    (b) => { b.tables.payments[0].branch_id = "lain"; },
    (b) => { b.tables.customers.push({ ...b.tables.customers[0] }); },
    (b) => { b.tables.services.push({ ...b.tables.services[0], id: "svc-2" }); },
    (b) => { b.tables.orders[0].service_id = "tidak-ada"; },
    (b) => { b.tables.payments[0].order_id = "tidak-ada"; },
  ]) {
    const backup = backupFixture();
    mutate(backup);
    assert.equal(validateBackup(backup).ok, false);
  }
});

test("restore mengirim seluruh operasi dalam satu transaksi dan meneruskan kegagalan", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  const calls = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ body, headers: options.headers });
    return new Response(JSON.stringify({ results: body.queries.map(() => ({ fields: [], rows: [] })) }), { status: 200 });
  };
  try {
    const counts = await restoreBranchBackup("main", backupFixture());
    assert.equal(counts.total, 8);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers["Neon-Batch-Isolation-Level"], "Serializable");
    const queries = calls[0].body.queries.map((item) => item.query);
    assert.equal(queries.length, 17);
    assert.ok(queries.slice(0, 8).every((query) => query.startsWith("DELETE ")));
    assert.ok(queries.slice(8, 16).every((query) => query.startsWith("INSERT ")));
    assert.match(queries[16], /^UPDATE laundry_branches/);

    neonConfig.fetchFunction = async (_url, options) => {
      calls.push({ body: JSON.parse(options.body), headers: options.headers });
      return new Response(JSON.stringify({ message: "constraint error", code: "23514" }), { status: 400 });
    };
    await assert.rejects(restoreBranchBackup("main", backupFixture()), /constraint error/);
    assert.equal(calls.length, 2);
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});

test("ekspor memakai satu snapshot konsisten untuk profil dan tabel", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  const calls = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ body, headers: options.headers });
    const fields = ["id", "name", "timezone", "phone", "email", "address"].map((name) => ({ name, dataTypeID: 25 }));
    const results = body.queries.map((_, index) => index === 0
      ? { fields, rows: [["main", "Contoh", "Asia/Makassar", null, null, null]] }
      : { fields: [], rows: [] });
    return new Response(JSON.stringify({ results }), { status: 200 });
  };
  try {
    const backup = await buildBranchBackup("main");
    assert.equal(backup.branch.id, "main");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.queries.length, 9);
    assert.equal(calls[0].headers["Neon-Batch-Isolation-Level"], "RepeatableRead");
    assert.equal(calls[0].headers["Neon-Batch-Read-Only"], "true");
    assert.equal(validateBackup(backup).ok, true);
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});
