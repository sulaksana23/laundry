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
const { PostgresOrdersRepository } = await import("../src/server/modules/orders/postgres-orders.repository.ts");
const { isUuid } = await import("../src/lib/uuid.ts");
const customerId = "11111111-1111-1111-1111-111111111111";

test("validasi ID pelanggan menolak nilai yang bukan UUID", () => {
  assert.equal(isUuid(customerId), true);
  assert.equal(isUuid("lain' OR true --"), false);
});

test("riwayat pelanggan selalu memakai cabang, filter, dan pagination pada kedua query", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  const calls = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    const first = calls.length === 1;
    return new Response(JSON.stringify(first
      ? { fields: [{ name: "total", dataTypeID: 23 }], rows: [["40"]] }
      : { fields: [], rows: [] }), { status: 200 });
  };
  try {
    const result = await new PostgresOrdersRepository().list({
      branchId: "cabang-1", customerId, search: "Budi", status: "ready", page: 2, pageSize: 25,
    });
    assert.equal(result.total, 40);
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.match(call.query, /o\.branch_id = \$1/);
      assert.match(call.query, /o\.customer_id = \$2::uuid/);
      assert.match(call.query, /c\.branch_id = o\.branch_id/);
      assert.deepEqual(call.params.slice(0, 4), ["cabang-1", customerId, "%Budi%", "ready"]);
    }
    assert.deepEqual(calls[1].params.slice(4).map(Number), [25, 25]);
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});
