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

const { CustomersService } = await import("../src/server/modules/customers/customers.service.ts");
const { PostgresCustomersRepository } = await import("../src/server/modules/customers/customers.repository.ts");

test("pencarian, batas halaman, dan ringkasan cabang terpisah dari halaman aktif", async () => {
  const calls = [];
  const repository = {
    async metrics(branchId) { calls.push(["metrics", branchId]); return { totalCustomers: 100, activeCustomers: 12, transactions: 50, revenue: 500_000 }; },
    async count(branchId, search) { calls.push(["count", branchId, search]); return 26; },
    async list(branchId, search, page, pageSize) { calls.push(["list", branchId, search, page, pageSize]); return [{ id: "pelanggan", name: "Ayu" }]; },
  };
  const result = await new CustomersService(repository).directory("cabang-1", "  Ayu  ", 999);
  assert.equal(result.page, 2);
  assert.equal(result.total, 26);
  assert.equal(result.metrics.totalCustomers, 100);
  assert.deepEqual(calls.at(-1), ["list", "cabang-1", "Ayu", 2, 25]);
  await assert.rejects(() => new CustomersService(repository).directory("", "", 1), /Cabang/);
  await assert.rejects(() => new CustomersService(repository).directory("cabang-1", "", 0), /halaman/);
});

test("query database membatasi pelanggan, pesanan, dan statistik pada cabang aktif", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  const calls = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    const fields = body.query.includes("total_customers")
      ? [{ name: "total_customers", dataTypeID: 23 }, { name: "active_customers", dataTypeID: 23 }, { name: "transactions", dataTypeID: 23 }, { name: "revenue", dataTypeID: 20 }]
      : body.query.includes("COUNT(*)::int AS total") ? [{ name: "total", dataTypeID: 23 }] : [];
    const rows = body.query.includes("total_customers") ? [["100", "12", "50", "500000"]] : fields.length ? [["26"]] : [];
    return new Response(JSON.stringify({ fields, rows }), { status: 200 });
  };
  try {
    const directory = await new CustomersService(new PostgresCustomersRepository()).directory("cabang-1", "Ayu", 2);
    assert.equal(directory.page, 2);
    assert.equal(directory.metrics.activeCustomers, 12);
    assert.equal(calls.length, 3);
    assert.ok(calls.every((call) => call.params[0] === "cabang-1"));
    const metrics = calls.find((call) => call.query.includes("total_customers"));
    assert.match(metrics.query, /o\.branch_id = b\.id/);
    const page = calls.find((call) => call.query.includes("WITH selected"));
    assert.match(page.query, /c\.branch_id = \$1/);
    assert.match(page.query, /o\.branch_id = c\.branch_id/);
    assert.match(page.query, /LIMIT \$4 OFFSET \$5/);
    assert.deepEqual(page.params.map(String), ["cabang-1", "Ayu", "%Ayu%", "25", "25"]);
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});
