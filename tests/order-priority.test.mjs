import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { neonConfig } from "@neondatabase/serverless";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL("../src/" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { getOrderPriority, getDemoOrderPriorities } = await import("../src/features/orders/domain/order-priority.ts");
const { getOrderPriorities } = await import("../src/server/modules/orders/order-priority.ts");

test("prioritas memakai tanggal dan mengecualikan pesanan siap atau selesai", () => {
  assert.equal(getOrderPriority("washing", "2026-11-03T12:00:00Z", "2026-11-04"), "overdue");
  assert.equal(getOrderPriority("received", "2026-11-04T12:00:00Z", "2026-11-04"), "today");
  assert.equal(getOrderPriority("drying", "2026-11-05T12:00:00Z", "2026-11-04"), null);
  assert.equal(getOrderPriority("ready", "2026-11-03T12:00:00Z", "2026-11-04"), null);
  assert.equal(getOrderPriority("completed", "2026-11-03T12:00:00Z", "2026-11-04"), null);
});

test("jumlah prioritas menghitung seluruh pesanan dan daftar dibatasi lima", () => {
  const orders = Array.from({ length: 7 }, (_, i) => ({
    id: "ORD-" + i, customerName: "Contoh", serviceName: "Cuci",
    status: "washing", dueAt: i < 6 ? "2026-11-03T12:00:00Z" : "2026-11-04T12:00:00Z",
  }));
  const result = getDemoOrderPriorities(orders, "2026-11-04");
  assert.equal(result.overdue, 6);
  assert.equal(result.today, 1);
  assert.equal(result.items.length, 5);
  assert.ok(result.items.every((item) => item.priority === "overdue"));
});

test("query prioritas dibatasi cabang dan memakai tanggal lokal cabang", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  let request;
  neonConfig.fetchFunction = async (_url, options) => {
    request = JSON.parse(options.body);
    const names = ["id", "customer_name", "service_name", "due_date", "status", "priority", "total", "overdue"];
    const fields = names.map((name) => ({ name, dataTypeID: 25 }));
    return new Response(JSON.stringify({ fields, rows: [["LND-1", "Contoh", "Cuci", "2026-11-03", "washing", "overdue", "7", "3"]] }), { status: 200 });
  };
  try {
    const result = await getOrderPriorities("cabang-1");
    assert.deepEqual(request.params, ["cabang-1"]);
    assert.match(request.query, /o\.branch_id = \$1/);
    assert.match(request.query, /AT TIME ZONE timezone/);
    assert.match(request.query, /'received', 'washing', 'drying', 'ironing'/);
    assert.equal(result.overdue, 3);
    assert.equal(result.today, 4);
    assert.equal(result.items[0].id, "LND-1");
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});
