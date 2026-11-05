import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";
import { analyzeOrderCsv, type OrderImportRowError, type OrderImportService } from "@/lib/order-import";

export interface OrderImportReport {
  totalRows: number;
  validRows: number;
  inserted: number;
  invalidRows: number;
  duplicateFile: boolean;
  errors: OrderImportRowError[];
}

function rowsOf<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

export async function importOrdersFromCsv(branchId: string, actorId: string, csvText: string): Promise<OrderImportReport> {
  const sql = getNeonSql();
  const serviceRows = rowsOf<{ id: string; name: string; unit: OrderImportService["unit"]; price_per_unit: string | number }>(
    await sql.query(
      "SELECT id, name, unit, price_per_unit FROM laundry_services WHERE branch_id = $1 AND is_active = true ORDER BY name",
      [branchId],
    ),
  );
  const services: OrderImportService[] = serviceRows.map((service) => ({
    id: service.id,
    name: service.name,
    unit: service.unit,
    price: Number(service.price_per_unit),
  }));
  const analysis = analyzeOrderCsv(csvText, services);
  if (analysis.fatalError) throw new Error(analysis.fatalError);

  const report: OrderImportReport = {
    totalRows: analysis.totalRows,
    validRows: analysis.valid.length,
    inserted: 0,
    invalidRows: analysis.errors.length,
    duplicateFile: false,
    errors: [...analysis.errors],
  };
  if (analysis.valid.length === 0) return report;

  const fileHash = createHash("sha256").update(csvText, "utf8").digest("hex");
  const batchId = randomUUID();
  const statements: ReturnType<typeof sql.query>[] = [sql.query(
    "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "VALUES ($1::uuid, $2, $3, 'orders.imported', 'order_batch', $4, jsonb_build_object('batch_id', $5, 'valid_rows', $6)) " +
    "ON CONFLICT DO NOTHING RETURNING id",
    [randomUUID(), branchId, actorId, fileHash, batchId, analysis.valid.length],
  )];

  for (const candidate of analysis.valid) {
    statements.push(sql.query(
      "WITH import_gate AS MATERIALIZED (" +
        "SELECT 1 FROM laundry_audit_events WHERE branch_id = $2 AND action = 'orders.imported' " +
        "AND entity_type = 'order_batch' AND entity_id = $18 AND metadata->>'batch_id' = $17 LIMIT 1" +
      "), active_service AS MATERIALIZED (" +
        "SELECT id, name, unit, price_per_unit FROM laundry_services " +
        "WHERE branch_id = $2 AND name = $7 AND unit = $8 AND is_active = true " +
        "AND $12 <= (CASE WHEN unit = 'kg' THEN round($6::numeric * price_per_unit) ELSE $6::numeric * price_per_unit END + $10 + $11)" +
      "), customer_upsert AS (" +
        "INSERT INTO laundry_customers (id, branch_id, name, phone) " +
        "SELECT $1::uuid, $2, $3, $4 FROM import_gate CROSS JOIN active_service " +
        "ON CONFLICT (branch_id, phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now() RETURNING id" +
      "), inserted_order AS (" +
        "INSERT INTO laundry_orders (id, branch_id, customer_id, service_id, service_name_snapshot, weight_kg, quantity, unit, unit_price_snapshot, amount, paid_amount, status, due_at, express_fee, delivery_fee, discount_amount, internal_note) " +
        "SELECT $5, $2, customer.id, service.id, service.name, CASE WHEN service.unit = 'kg' THEN $6 ELSE 0 END, $6, service.unit, service.price_per_unit, " +
        "(CASE WHEN service.unit = 'kg' THEN round($6::numeric * service.price_per_unit) ELSE $6::numeric * service.price_per_unit END + $10 + $11 - $12)::bigint, " +
        "0, 'received', $9::date, $10, $11, $12, $13 " +
        "FROM customer_upsert customer CROSS JOIN active_service service " +
        "WHERE $12 <= (CASE WHEN service.unit = 'kg' THEN round($6::numeric * service.price_per_unit) ELSE $6::numeric * service.price_per_unit END + $10 + $11) " +
        "RETURNING *" +
      "), inserted_history AS (" +
        "INSERT INTO laundry_order_status_history (id, branch_id, order_id, previous_status, next_status, actor_id, changed_at) " +
        "SELECT $14::uuid, $2, id, NULL, 'received', $15, now() FROM inserted_order RETURNING order_id" +
      "), order_audit AS (" +
        "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
        "SELECT $16::uuid, $2, $15, 'order.created', 'order', id, " +
        "jsonb_build_object('service', service_name_snapshot, 'quantity', quantity, 'unit', unit, 'amount', amount, 'source', 'csv') " +
        "FROM inserted_order RETURNING id" +
      ") SELECT id FROM inserted_order",
      [randomUUID(), branchId, candidate.customerName, candidate.customerPhone, "LND-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") + "-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(), candidate.quantity, candidate.serviceName, candidate.unit, candidate.dueAt, candidate.expressFee, candidate.deliveryFee, candidate.discountAmount, candidate.internalNote, randomUUID(), actorId, randomUUID(), batchId, fileHash],
    ));
  }

  const results = await sql.transaction(statements, { isolationLevel: "Serializable" });
  if (rowsOf(results[0]).length === 0) {
    return { ...report, duplicateFile: true };
  }

  analysis.valid.forEach((candidate, index) => {
    const inserted = rowsOf(results[index + 1]).length > 0;
    if (inserted) report.inserted++;
    else report.errors.push({ row: candidate.row, message: "Pesanan tidak tersimpan karena layanan berubah saat impor. Periksa katalog lalu buat berkas baru hanya untuk baris ini." });
  });
  report.invalidRows = report.errors.length;
  return report;
}
