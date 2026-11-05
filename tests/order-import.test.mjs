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

const { analyzeOrderCsv, MAX_ORDER_IMPORT_ROWS } = await import("../src/lib/order-import.ts");
const { importOrdersFromCsv } = await import("../src/server/modules/orders/import-orders.ts");

const services = [
  { id: "svc-kg", name: "Cuci Reguler", unit: "kg", price: 8000 },
  { id: "svc-pcs", name: "Setrika", unit: "pcs", price: 5000 },
];

test("analisis CSV mendukung kutipan, nomor Indonesia, harga katalog, dan catatan internal", () => {
  const csv = [
    "nama,no_hp,layanan,jumlah,target_selesai,biaya_express,biaya_antar,diskon,catatan_internal",
    '"Ni Made, Ayu",+62 812-3456-7890,Cuci Reguler,2.5,2026-11-09,1000,2000,500,"Pisahkan, jangan campur"',
  ].join("\n");
  const result = analyzeOrderCsv(csv, services);
  assert.equal(result.fatalError, null);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].row, 2);
  assert.equal(result.valid[0].customerName, "Ni Made, Ayu");
  assert.equal(result.valid[0].customerPhone, "081234567890");
  assert.equal(result.valid[0].amount, 22500);
  assert.equal(result.valid[0].internalNote, "Pisahkan, jangan campur");
});

test("analisis format titik koma menerima desimal koma dan mencatat kesalahan tiap baris", () => {
  const csv = [
    "nama;no_hp;layanan;jumlah;target_selesai;biaya_express;diskon",
    "Pelanggan Satu;081234567890;Cuci Reguler;2,5;2026-11-09;10.000;0",
    "Pelanggan Dua;081234567891;Cuci Reguler;1;2026-02-30;0;0",
    "Pelanggan Tiga;081234567892;Setrika;1,5;2026-11-09;0;0",
    "Pelanggan Empat;081234567893;Tidak Ada;1;2026-11-09;0;0",
  ].join("\n");
  const result = analyzeOrderCsv(csv, services);
  assert.equal(result.valid.length, 1);
  assert.equal(result.valid[0].expressFee, 10000);
  assert.equal(result.valid[0].amount, 30000);
  assert.deepEqual(result.errors.map((item) => item.row), [3, 4, 5]);
});

test("menolak header yang kurang, nama layanan ambigu, dan file di atas batas", () => {
  assert.match(analyzeOrderCsv("nama,no_hp\nAyu,081234567890", services).fatalError, /Kolom wajib/);
  const duplicateServices = [...services, { ...services[0], id: "svc-duplicate", name: "cuci reguler" }];
  const row = "Ayu Made,081234567890,Cuci Reguler,1,2026-11-09";
  const ambiguous = analyzeOrderCsv("nama,no_hp,layanan,jumlah,target_selesai\n" + row, duplicateServices);
  assert.match(ambiguous.errors[0].message, /tidak unik/);
  const large = "nama,no_hp,layanan,jumlah,target_selesai\n" + Array.from({ length: MAX_ORDER_IMPORT_ROWS + 1 }, () => row).join("\n");
  assert.match(analyzeOrderCsv(large, services).fatalError, /batas sekali impor/);
});

test("impor menyimpan batch dan pesanan dalam satu transaksi, lalu menolak file yang sama", async () => {
  process.env.DATABASE_URL = "postgresql://dummy:dummy@localhost/test";
  const requests = [];
  neonConfig.fetchFunction = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (body.queries) {
      const duplicate = requests.filter((entry) => entry.queries).length > 1;
      const results = body.queries.map((_, index) => index === 0
        ? { fields: [{ name: "id", dataTypeID: 25 }], rows: duplicate ? [] : [["batch-id"]] }
        : { fields: [{ name: "id", dataTypeID: 25 }], rows: duplicate ? [] : [["LND-1"]] });
      return new Response(JSON.stringify({ results }), { status: 200 });
    }
    return new Response(JSON.stringify({
      fields: ["id", "name", "unit", "price_per_unit"].map((name) => ({ name, dataTypeID: 25 })),
      rows: [["svc-kg", "Cuci Reguler", "kg", "8000"]],
    }), { status: 200 });
  };
  try {
    const csv = "nama,no_hp,layanan,jumlah,target_selesai\nAyu Made,081234567890,Cuci Reguler,2,2026-11-09";
    const first = await importOrdersFromCsv("branch-1", "owner-1", csv);
    assert.equal(first.inserted, 1);
    assert.equal(first.duplicateFile, false);
    const transaction = requests.find((entry) => entry.queries);
    assert.equal(transaction.queries.length, 2);
    assert.equal(transaction.queries[0].params[1], "branch-1");
    assert.match(transaction.queries[1].query, /order_status_history/);
    assert.match(transaction.queries[1].query, /branch_id = \$2/);
    assert.equal(transaction.queries[1].params[1], "branch-1");

    const repeated = await importOrdersFromCsv("branch-1", "owner-1", csv);
    assert.equal(repeated.inserted, 0);
    assert.equal(repeated.duplicateFile, true);
  } finally {
    neonConfig.fetchFunction = undefined;
    delete process.env.DATABASE_URL;
  }
});
