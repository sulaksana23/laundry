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

const { createOrderSchema } = await import("../src/features/orders/domain/order.ts");
const { PostgresOrdersRepository } = await import("../src/server/modules/orders/postgres-orders.repository.ts");
const { findTrackedOrder } = await import("../src/server/modules/tracking/track-order.ts");

const baseOrder = {
  customerName: "Made Arya",
  customerPhone: "081234567890",
  serviceName: "Cuci Reguler",
  quantity: 2,
  dueAt: "2026-11-08",
  expressFee: 0,
  deliveryFee: 0,
  discountAmount: 0,
};

test("validasi catatan internal memangkas spasi, default kosong, dan membatasi 500 karakter", () => {
  assert.equal(createOrderSchema.parse(baseOrder).internalNote, "");
  assert.equal(createOrderSchema.parse({ ...baseOrder, internalNote: "  Pisahkan cucian putih  " }).internalNote, "Pisahkan cucian putih");
  assert.equal(createOrderSchema.safeParse({ ...baseOrder, internalNote: "x".repeat(501) }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...baseOrder, internalNote: 12 }).success, false);
});

test("repository menyimpan catatan di kolom pesanan dan mengembalikannya untuk staf", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  let request;
  const fieldNames = [
    "id", "customer_name", "customer_phone", "service_name", "quantity", "unit", "amount", "paid_amount",
    "status", "express_fee", "delivery_fee", "discount_amount", "internal_note", "received_at", "due_at", "payment_status",
  ];
  neonConfig.fetchFunction = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({
      fields: fieldNames.map((name) => ({ name, dataTypeID: 25 })),
      rows: [["LND-1", "Made Arya", "081234567890", "Cuci Reguler", "2", "kg", "16000", "0", "received", "0", "0", "0", "Periksa noda", "2026-11-05T10:00:00.000Z", "2026-11-08T12:00:00.000Z", "unpaid"]],
    }), { status: 200 });
  };
  try {
    const result = await new PostgresOrdersRepository().create({
      ...baseOrder,
      internalNote: "Periksa noda",
      branchId: "branch-1",
      actorId: "user-1",
      amount: 16000,
      unit: "kg",
      unitPrice: 8000,
      receivedAt: "2026-11-05T10:00:00.000Z",
    });
    assert.match(request.query, /discount_amount, internal_note\)/);
    assert.match(request.query, /\$18/);
    assert.equal(request.params.at(-1), "Periksa noda");
    assert.equal(result.internalNote, "Periksa noda");
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});

test("pelacakan publik tidak memilih atau mengembalikan catatan internal", async () => {
  const previousEnvironment = Object.fromEntries(["DATABASE_URL", "NODE_ENV", "LAUNDRY_DATABASE_MODE", "VERCEL_ENV"].map((key) => [key, process.env[key]]));
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  process.env.NODE_ENV = "development";
  process.env.LAUNDRY_DATABASE_MODE = "true";
  delete process.env.VERCEL_ENV;
  const orderFields = [
    "id", "branch_id", "customer_name", "customer_phone", "service_name", "quantity", "unit", "amount",
    "paid_amount", "status", "received_at", "due_date", "payment_status", "branch_name", "branch_phone", "branch_timezone",
  ];
  const seenQueries = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const query = JSON.parse(options.body).query;
    seenQueries.push(query);
    if (query.includes("laundry_order_status_history")) {
      return new Response(JSON.stringify({ fields: [], rows: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({
      fields: orderFields.map((name) => ({ name, dataTypeID: 25 })),
      rows: [["LND-1", "branch-1", "Made Arya", "081234567890", "Cuci Reguler", "2", "kg", "16000", "0", "received", "2026-11-05T10:00:00.000Z", "2026-11-08", "unpaid", "Cabang", null, "Asia/Makassar"]],
    }), { status: 200 });
  };
  try {
    const tracked = await findTrackedOrder("LND-1", "081234567890");
    assert.equal(tracked?.code, "LND-1");
    assert.equal(Object.hasOwn(tracked, "internalNote"), false);
    assert.equal(seenQueries.length, 2);
    assert.equal(seenQueries[0].includes("internal_note"), false);
  } finally {
    neonConfig.fetchFunction = undefined;
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
