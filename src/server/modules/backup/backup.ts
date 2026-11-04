import "server-only";

import { getNeonSql } from "@/server/db/neon";
import {
  BACKUP_FORMAT_VERSION,
  BACKUP_KIND,
  countBackupRows,
  type BackupRow,
  type BackupTableKey,
  type BranchBackup,
} from "@/lib/backup-format";

// Definisi tabel yang masuk backup beserta kolom yang diizinkan (daftar putih).
// Lisensi Pro (laundry_licenses) sengaja TIDAK disertakan: aktivasi tidak boleh
// berpindah lewat berkas backup.
interface TableDef {
  key: BackupTableKey;
  table: string;
  columns: string[];
  uuidColumns: string[];
  dateColumns: string[];
}

const TABLE_DEFS: TableDef[] = [
  { key: "customers", table: "laundry_customers", columns: ["id", "branch_id", "name", "phone", "created_at", "updated_at"], uuidColumns: ["id"], dateColumns: [] },
  { key: "services", table: "laundry_services", columns: ["id", "branch_id", "name", "unit", "price_per_unit", "is_active", "description", "duration_minutes", "created_at", "updated_at"], uuidColumns: [], dateColumns: [] },
  { key: "orders", table: "laundry_orders", columns: ["id", "branch_id", "customer_id", "service_id", "service_name_snapshot", "weight_kg", "amount", "paid_amount", "status", "due_at", "received_at", "updated_at"], uuidColumns: ["customer_id"], dateColumns: ["due_at"] },
  { key: "orderStatusHistory", table: "laundry_order_status_history", columns: ["id", "branch_id", "order_id", "previous_status", "next_status", "actor_id", "changed_at"], uuidColumns: ["id"], dateColumns: [] },
  { key: "payments", table: "laundry_payments", columns: ["id", "branch_id", "order_id", "amount", "method", "actor_id", "received_at"], uuidColumns: ["id"], dateColumns: [] },
  { key: "expenses", table: "laundry_expenses", columns: ["id", "branch_id", "description", "category", "amount", "method", "incurred_at", "created_at"], uuidColumns: ["id"], dateColumns: ["incurred_at"] },
  { key: "inventoryItems", table: "laundry_inventory_items", columns: ["id", "branch_id", "name", "category", "unit", "quantity", "min_quantity", "unit_price", "created_at", "updated_at"], uuidColumns: ["id"], dateColumns: [] },
  { key: "cashClosings", table: "laundry_cash_closings", columns: ["id", "branch_id", "closing_date", "expected_amount", "counted_amount", "note", "closed_by", "created_at", "updated_at"], uuidColumns: ["id"], dateColumns: ["closing_date"] },
];

// Urutan hapus aman terhadap foreign key (anak sebelum induk),
// urutan sisip adalah kebalikannya untuk tabel yang saling merujuk.
const DELETE_ORDER: BackupTableKey[] = ["orderStatusHistory", "payments", "orders", "cashClosings", "expenses", "inventoryItems", "services", "customers"];
const INSERT_ORDER: BackupTableKey[] = ["customers", "services", "orders", "orderStatusHistory", "payments", "expenses", "inventoryItems", "cashClosings"];

function rowsOf(result: unknown): BackupRow[] {
  if (Array.isArray(result)) return result as BackupRow[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as BackupRow[];
  }
  return [];
}

export async function buildBranchBackup(branchId: string): Promise<BranchBackup> {
  const sql = getNeonSql();
  // Baca semua tabel dari snapshot yang sama agar perubahan saat ekspor tidak
  // menghasilkan referensi pesanan/pembayaran yang saling tidak cocok.
  const results = await sql.transaction([
    sql.query("SELECT id, name, timezone, phone, email, address FROM laundry_branches WHERE id = $1 LIMIT 1", [branchId]),
    ...TABLE_DEFS.map((def) => sql.query(
      `SELECT ${def.columns.join(", ")} FROM ${def.table} WHERE branch_id = $1 ORDER BY 1`,
      [branchId],
    )),
  ], { isolationLevel: "RepeatableRead", readOnly: true });
  const branchRows = rowsOf(results[0]);
  const branchRow = branchRows[0];
  if (!branchRow) throw new Error("Cabang tidak ditemukan.");

  const tables = {} as Record<BackupTableKey, BackupRow[]>;
  TABLE_DEFS.forEach((def, index) => { tables[def.key] = rowsOf(results[index + 1]); });

  return {
    app: "LaundryOS",
    kind: BACKUP_KIND,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    branch: {
      id: String(branchRow.id),
      name: String(branchRow.name ?? ""),
      timezone: String(branchRow.timezone ?? "Asia/Makassar"),
      phone: (branchRow.phone as string | null) ?? null,
      email: (branchRow.email as string | null) ?? null,
      address: (branchRow.address as string | null) ?? null,
    },
    tables,
  };
}

const INSERT_CHUNK = 100;

function insertQueries(sql: ReturnType<typeof getNeonSql>, def: TableDef, rows: BackupRow[]) {
  const queries: ReturnType<typeof sql.query>[] = [];
  for (let start = 0; start < rows.length; start += INSERT_CHUNK) {
    const chunk = rows.slice(start, start + INSERT_CHUNK);
    const parameters: unknown[] = [];
    const tuples = chunk.map((row) => {
      const placeholders = def.columns.map((column) => {
        parameters.push(row[column] ?? null);
        const position = `$${parameters.length}`;
        if (def.uuidColumns.includes(column)) return `${position}::uuid`;
        if (def.dateColumns.includes(column)) return `${position}::date`;
        return position;
      });
      return `(${placeholders.join(", ")})`;
    });
    queries.push(sql.query(
      `INSERT INTO ${def.table} (${def.columns.join(", ")}) VALUES ${tuples.join(", ")}`,
      parameters,
    ));
  }
  return queries;
}

/**
 * Memulihkan backup ke cabang yang sama: seluruh data operasional cabang
 * digantikan isi backup (profil cabang ikut diperbarui, id cabang tetap).
 * Penghapusan, penyisipan, dan profil cabang dijalankan dalam satu transaksi.
 */
export async function restoreBranchBackup(branchId: string, backup: BranchBackup): Promise<Record<BackupTableKey, number> & { total: number }> {
  const sql = getNeonSql();
  const queries: ReturnType<typeof sql.query>[] = [];
  for (const key of DELETE_ORDER) {
    const def = TABLE_DEFS.find((item) => item.key === key)!;
    queries.push(sql.query(`DELETE FROM ${def.table} WHERE branch_id = $1`, [branchId]));
  }
  for (const key of INSERT_ORDER) {
    const def = TABLE_DEFS.find((item) => item.key === key)!;
    queries.push(...insertQueries(sql, def, backup.tables[key]));
  }
  queries.push(sql.query(
    "UPDATE laundry_branches SET name = $2, timezone = $3, phone = $4, email = $5, address = $6 WHERE id = $1",
    [branchId, backup.branch.name, backup.branch.timezone, backup.branch.phone, backup.branch.email, backup.branch.address],
  ));
  await sql.transaction(queries, { isolationLevel: "Serializable" });
  return countBackupRows(backup);
}
