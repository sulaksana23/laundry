import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

const MAX_FILE_LENGTH = 1_000_000;
const MAX_ROWS = 1_000;

export interface ReconciliationCandidate {
  paymentId: string;
  orderId: string;
  customerName: string;
  receivedAt: string;
}

export interface ReconciliationRow {
  id: string;
  transactionAt: string;
  timezone: string;
  amount: number;
  method: "transfer" | "qris";
  reference: string;
  description: string;
  fileName: string;
  status: "pending" | "matched" | "ignored";
  matchedOrderId: string | null;
  matchedCustomerName: string | null;
  candidates: ReconciliationCandidate[];
}

interface ParsedStatementRow {
  lineNumber: number;
  transactionLocal: string;
  amount: number;
  method: "transfer" | "qris";
  reference: string;
  description: string;
}

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

function chooseDelimiter(header: string) {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (char === '"') {
      if (quoted && header[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && char === ",") commas += 1;
    else if (!quoted && char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"' && value.length === 0) quoted = true;
    else if (char === delimiter) {
      row.push(value.trim());
      value = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (quoted) throw new Error("CSV tidak valid: ada tanda kutip yang belum ditutup.");
  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function parseLocalTimestamp(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match) return null;
  const [, date, hours = "00", minutes = "00", seconds = "00"] = match;
  const dateCheck = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(dateCheck.getTime()) || dateCheck.toISOString().slice(0, 10) !== date ||
      Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return null;
  return `${date} ${hours}:${minutes}:${seconds}`;
}

function columnIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseReconciliationCsv(text: string): { rows: ParsedStatementRow[]; skippedRows: number } {
  if (text.length > MAX_FILE_LENGTH) throw new Error("Berkas CSV terlalu besar (maksimal 1 MB).");
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const parsed = parseCsv(clean, chooseDelimiter(firstLine));
  if (parsed.length < 2) throw new Error("CSV harus berisi judul kolom dan minimal satu baris transaksi.");
  if (parsed.length - 1 > MAX_ROWS) throw new Error("Maksimal 1.000 baris transaksi per impor.");

  const headers = parsed[0].map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, ""));
  const dateIndex = columnIndex(headers, ["tanggal", "date", "datetime", "waktu", "tanggal_transaksi"]);
  const amountIndex = columnIndex(headers, ["nominal", "jumlah", "amount", "nilai"]);
  const methodIndex = columnIndex(headers, ["metode", "method", "channel"]);
  const referenceIndex = columnIndex(headers, ["referensi", "reference", "ref", "id_transaksi", "transaction_id"]);
  const descriptionIndex = columnIndex(headers, ["keterangan", "description", "deskripsi", "memo"]);
  if (dateIndex < 0 || amountIndex < 0 || methodIndex < 0) {
    throw new Error("Kolom wajib: tanggal, nominal (angka Rupiah tanpa titik/koma), dan metode (transfer/qris).");
  }

  const rows: ParsedStatementRow[] = [];
  let skippedRows = 0;
  for (const [index, cells] of parsed.slice(1).entries()) {
    const lineNumber = index + 2;
    const timestamp = parseLocalTimestamp(cells[dateIndex] ?? "");
    const rawAmount = (cells[amountIndex] ?? "").replace(/\s/g, "");
    const methodRaw = (cells[methodIndex] ?? "").trim().toLowerCase();
    if (!timestamp || !/^-?\d+$/.test(rawAmount)) {
      throw new Error(`Baris ${lineNumber}: tanggal harus YYYY-MM-DD (boleh ditambah jam) dan nominal harus bilangan Rupiah bulat.`);
    }
    const amount = Number(rawAmount);
    if (!Number.isSafeInteger(amount)) throw new Error(`Baris ${lineNumber}: nominal melebihi batas angka aman.`);
    const method = methodRaw === "transfer" || methodRaw === "bank transfer" ? "transfer" : methodRaw === "qris" ? "qris" : null;
    if (amount <= 0 || !method) {
      skippedRows += 1;
      continue;
    }
    const reference = referenceIndex >= 0 ? cells[referenceIndex] ?? "" : "";
    const description = descriptionIndex >= 0 ? cells[descriptionIndex] ?? "" : "";
    if (reference.length > 160 || description.length > 250) throw new Error(`Baris ${lineNumber}: referensi maksimal 160 karakter dan keterangan 250 karakter.`);
    rows.push({ lineNumber, transactionLocal: timestamp, amount, method, reference, description });
  }
  if (rows.length === 0) throw new Error("Tidak ada transaksi transfer/QRIS positif yang dapat diimpor.");
  return { rows, skippedRows };
}

export async function importReconciliationCsv(branchId: string, actorId: string, fileName: string, text: string) {
  const parsed = parseReconciliationCsv(text);
  const fileHash = createHash("sha256").update(text).digest("hex");
  const importId = randomUUID();
  const rowPayload = parsed.rows.map((row) => ({
    id: randomUUID(), line_number: row.lineNumber, transaction_local: row.transactionLocal,
    amount: row.amount, method: row.method, reference: row.reference, description: row.description,
  }));
  const result = await getNeonSql().query(
    "WITH branch AS MATERIALIZED (SELECT id, timezone FROM laundry_branches WHERE id = $1), " +
    "created AS (INSERT INTO laundry_reconciliation_imports (id, branch_id, file_hash, file_name, actor_id, row_count) " +
    "SELECT $2::uuid, branch.id, $3, $4, $5, $6 FROM branch ON CONFLICT (branch_id, file_hash) DO NOTHING RETURNING id), " +
    "imported_rows AS (INSERT INTO laundry_reconciliation_rows " +
    "(id, branch_id, import_id, line_number, transaction_at, amount, method, reference, description) " +
    "SELECT (data.id)::uuid, branch.id, created.id, data.line_number, data.transaction_local::timestamp AT TIME ZONE branch.timezone, " +
    "data.amount, data.method, data.reference, data.description FROM created CROSS JOIN branch " +
    "CROSS JOIN jsonb_to_recordset($7::jsonb) AS data(id text, line_number integer, transaction_local text, amount bigint, method text, reference text, description text) RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $8::uuid, $1, $5, 'finance.reconciliation_imported', 'reconciliation_import', created.id::text, " +
    "jsonb_build_object('rows', $6, 'skipped_rows', $9, 'file_name', $4) FROM created RETURNING id) " +
    "SELECT id FROM created",
    [branchId, importId, fileHash, fileName.slice(0, 120), actorId, rowPayload.length, JSON.stringify(rowPayload), randomUUID(), parsed.skippedRows],
  );
  if (resultRows(result).length === 0) throw new Error("Berkas ini sudah pernah diimpor untuk cabang ini.");
  return { imported: rowPayload.length, skipped: parsed.skippedRows };
}

export async function listReconciliationRows(branchId: string): Promise<ReconciliationRow[]> {
  const rows = resultRows<{
    id: string; transaction_at: string | Date; timezone: string; amount: number | string;
    method: "transfer" | "qris"; reference: string; description: string; file_name: string;
    status: "pending" | "matched" | "ignored"; matched_order_id: string | null; matched_customer: string | null;
    candidates: ReconciliationCandidate[] | string | null;
  }>(await getNeonSql().query(
    "SELECT reconciliation_row.id::text AS id, reconciliation_row.transaction_at, branch.timezone, reconciliation_row.amount, reconciliation_row.method, reconciliation_row.reference, reconciliation_row.description, reconciliation_import.file_name, reconciliation_row.status, " +
    "matched_payment.order_id AS matched_order_id, matched_customer.name AS matched_customer, " +
    "COALESCE(candidate_list.items, '[]'::jsonb) AS candidates " +
    "FROM laundry_reconciliation_rows reconciliation_row JOIN laundry_reconciliation_imports reconciliation_import ON reconciliation_import.id = reconciliation_row.import_id " +
    "JOIN laundry_branches branch ON branch.id = reconciliation_row.branch_id " +
    "LEFT JOIN laundry_payments matched_payment ON matched_payment.id = reconciliation_row.matched_payment_id AND matched_payment.branch_id = reconciliation_row.branch_id " +
    "LEFT JOIN laundry_orders matched_order ON matched_order.id = matched_payment.order_id AND matched_order.branch_id = reconciliation_row.branch_id " +
    "LEFT JOIN laundry_customers matched_customer ON matched_customer.id = matched_order.customer_id AND matched_customer.branch_id = reconciliation_row.branch_id " +
    "LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('paymentId', payment.id::text, 'orderId', payment.order_id, 'customerName', customer.name, 'receivedAt', payment.received_at) ORDER BY payment.received_at DESC) AS items " +
    "FROM laundry_payments payment JOIN laundry_orders order_row ON order_row.id = payment.order_id AND order_row.branch_id = payment.branch_id " +
    "JOIN laundry_customers customer ON customer.id = order_row.customer_id AND customer.branch_id = order_row.branch_id " +
    "WHERE reconciliation_row.status = 'pending' AND payment.branch_id = reconciliation_row.branch_id AND payment.amount = reconciliation_row.amount AND payment.method = reconciliation_row.method " +
    "AND (payment.received_at AT TIME ZONE branch.timezone)::date = (reconciliation_row.transaction_at AT TIME ZONE branch.timezone)::date " +
    "AND NOT EXISTS (SELECT 1 FROM laundry_reconciliation_rows prior WHERE prior.matched_payment_id = payment.id AND prior.status = 'matched')) candidate_list ON true " +
    "WHERE reconciliation_row.branch_id = $1 ORDER BY reconciliation_row.created_at DESC, reconciliation_row.line_number DESC LIMIT 100",
    [branchId],
  ));
  return rows.map((row) => {
    let candidates: ReconciliationCandidate[] = [];
    try {
      candidates = typeof row.candidates === "string" ? JSON.parse(row.candidates) as ReconciliationCandidate[] : row.candidates ?? [];
    } catch { candidates = []; }
    return {
      id: row.id, transactionAt: new Date(String(row.transaction_at)).toISOString(), timezone: row.timezone,
      amount: Number(row.amount), method: row.method, reference: row.reference, description: row.description,
      fileName: row.file_name, status: row.status, matchedOrderId: row.matched_order_id,
      matchedCustomerName: row.matched_customer, candidates,
    };
  });
}

export async function matchReconciliationPayment(branchId: string, actorId: string, rowId: string, paymentId: string) {
  const result = await getNeonSql().query(
    "WITH valid AS MATERIALIZED (SELECT reconciliation.id, payment.id AS payment_id FROM laundry_reconciliation_rows reconciliation " +
    "JOIN laundry_branches branch ON branch.id = reconciliation.branch_id " +
    "JOIN laundry_payments payment ON payment.id = $4::uuid AND payment.branch_id = reconciliation.branch_id " +
    "WHERE reconciliation.id = $1::uuid AND reconciliation.branch_id = $2 AND reconciliation.status = 'pending' " +
    "AND payment.amount = reconciliation.amount AND payment.method = reconciliation.method " +
    "AND (payment.received_at AT TIME ZONE branch.timezone)::date = (reconciliation.transaction_at AT TIME ZONE branch.timezone)::date " +
    "AND NOT EXISTS (SELECT 1 FROM laundry_reconciliation_rows prior WHERE prior.matched_payment_id = payment.id AND prior.status = 'matched')), " +
    "changed AS (UPDATE laundry_reconciliation_rows reconciliation SET status = 'matched', matched_payment_id = valid.payment_id " +
    "FROM valid WHERE reconciliation.id = valid.id RETURNING reconciliation.id, reconciliation.matched_payment_id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $5::uuid, $2, $3, 'finance.reconciliation_matched', 'reconciliation_row', id::text, " +
    "jsonb_build_object('payment_id', matched_payment_id) FROM changed RETURNING id) SELECT id FROM changed",
    [rowId, branchId, actorId, paymentId, randomUUID()],
  );
  if (resultRows(result).length === 0) throw new Error("Pembayaran tidak cocok, sudah dipasangkan, atau tanggalnya berbeda.");
}

export async function ignoreReconciliationRow(branchId: string, actorId: string, rowId: string) {
  const result = await getNeonSql().query(
    "WITH changed AS (UPDATE laundry_reconciliation_rows SET status = 'ignored' WHERE id = $1::uuid AND branch_id = $2 AND status = 'pending' RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $3::uuid, $2, $4, 'finance.reconciliation_ignored', 'reconciliation_row', id::text, '{}'::jsonb FROM changed RETURNING id) SELECT id FROM changed",
    [rowId, branchId, randomUUID(), actorId],
  );
  if (resultRows(result).length === 0) throw new Error("Baris rekonsiliasi tidak ditemukan atau sudah diproses.");
}
