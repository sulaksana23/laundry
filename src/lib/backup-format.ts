// Format berkas backup data cabang LaundryOS (FR-17, fitur Pro).
// Dipakai bersama oleh server (pembuatan & pemulihan backup) dan klien
// (pratinjau isi berkas sebelum dipulihkan).

import { z } from "zod";

export const BACKUP_KIND = "laundryos-branch-backup";
export const BACKUP_FORMAT_VERSION = 4;

export const BACKUP_TABLE_KEYS = [
  "customers",
  "services",
  "orders",
  "orderStatusHistory",
  "payments",
  "refunds",
  "expenses",
  "inventoryItems",
  "serviceInventoryRecipes",
  "cashClosings",
] as const;

export type BackupTableKey = (typeof BACKUP_TABLE_KEYS)[number];

export const BACKUP_TABLE_LABELS: Record<BackupTableKey, string> = {
  customers: "Pelanggan",
  services: "Layanan",
  orders: "Pesanan",
  orderStatusHistory: "Riwayat status pesanan",
  payments: "Pembayaran",
  refunds: "Pengembalian dana",
  expenses: "Pengeluaran",
  inventoryItems: "Persediaan",
  serviceInventoryRecipes: "Resep pemakaian bahan",
  cashClosings: "Tutup kasir",
};

export type BackupRow = Record<string, unknown>;

export interface BranchBackup {
  app: string;
  kind: typeof BACKUP_KIND;
  formatVersion: number;
  exportedAt: string;
  branch: {
    id: string;
    name: string;
    timezone: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  tables: Record<BackupTableKey, BackupRow[]>;
}

const MAX_ROWS_PER_TABLE = 20000;

// Format angka mengikuti kolom PostgreSQL; bigint/numeric dari driver dapat
// berupa string. Validasi tidak mengubah nilai asli dari berkas backup.
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
const text = z.string();
const nullableText = text.nullable();
const date = z.string().refine((value) => {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const parsedDay = new Date(`${day}T00:00:00.000Z`);
  return !Number.isNaN(parsedDay.getTime()) && parsedDay.toISOString().slice(0, 10) === day
    && !Number.isNaN(Date.parse(value));
});
const integer = (min: bigint, max: bigint) => z.union([z.string(), z.number()]).refine((value) => {
  if (typeof value === "number" && !Number.isSafeInteger(value)) return false;
  const raw = String(value);
  if (!/^-?\d+$/.test(raw) || raw.length > 20) return false;
  const parsed = BigInt(raw);
  return parsed >= min && parsed <= max;
});
const decimal = (precision: number, scale: number, positive = false) =>
  z.union([z.string(), z.number()]).refine((value) => {
    const raw = String(value);
    const match = /^(\d+)(?:\.(\d+))?$/.exec(raw);
    if (!match || (match[2]?.length ?? 0) > scale) return false;
    const whole = match[1].replace(/^0+/, "");
    return whole.length <= precision - scale && (!positive || Number(raw) > 0);
  });
const bigintMax = BigInt("9223372036854775807");
const amount = integer(BigInt(0), bigintMax);
const positiveAmount = integer(BigInt(1), bigintMax);
const signedAmount = integer(BigInt("-9223372036854775808"), bigintMax);
const status = z.enum(["received", "washing", "drying", "ironing", "ready", "completed", "cancelled"]);
const method = z.enum(["cash", "transfer", "qris", "other"]);
const common = { id: text.min(1), branch_id: text.min(1) };
const uuidCommon = { ...common, id: uuid };
const timestamps = { created_at: date, updated_at: date };

const rowSchemas: Record<BackupTableKey, z.ZodType> = {
  customers: z.object({ ...uuidCommon, name: text, phone: text, ...timestamps }),
  services: z.object({
    ...common, name: text, unit: z.enum(["kg", "pcs", "pasang"]), price_per_unit: amount,
    is_active: z.boolean(), description: text, duration_minutes: integer(BigInt(1), BigInt(43200)), ...timestamps,
  }),
  orders: z.object({
    ...common, customer_id: uuid, service_id: text.min(1), service_name_snapshot: text,
    weight_kg: decimal(8, 2), quantity: decimal(10, 3).optional(),
    unit: z.enum(["kg", "pcs", "pasang"]).optional(), unit_price_snapshot: amount.optional(),
    amount, paid_amount: amount, status, due_at: date,
    express_fee: amount.optional(), delivery_fee: amount.optional(), discount_amount: amount.optional(),
    received_at: date, updated_at: date,
  }),
  orderStatusHistory: z.object({
    ...uuidCommon, order_id: text.min(1), previous_status: status.nullable(), next_status: status,
    actor_id: text, changed_at: date,
  }),
  payments: z.object({
    ...uuidCommon, order_id: text.min(1), amount: positiveAmount, method, actor_id: text, received_at: date,
  }),
  refunds: z.object({
    ...uuidCommon, order_id: text.min(1), amount: positiveAmount, reason: text.min(3).max(300), method, actor_id: text, created_at: date,
  }),
  expenses: z.object({
    ...uuidCommon, description: text, category: text, amount: positiveAmount, method, incurred_at: date, created_at: date,
  }),
  inventoryItems: z.object({
    ...uuidCommon, name: text, category: text, unit: text, quantity: decimal(12, 3),
    min_quantity: decimal(12, 3), unit_price: amount, ...timestamps,
  }),
  serviceInventoryRecipes: z.object({
    ...uuidCommon, service_id: text.min(1), item_id: uuid,
    consume_at_status: z.enum(["washing", "drying", "ironing", "ready", "completed"]),
    quantity_per_service_unit: decimal(12, 3, true), actor_id: text, ...timestamps,
  }),
  cashClosings: z.object({
    ...uuidCommon, closing_date: date, expected_amount: signedAmount, counted_amount: amount,
    note: nullableText, closed_by: nullableText, ...timestamps,
  }),
};

export type BackupValidation =
  | { ok: true; backup: BranchBackup }
  | { ok: false; error: string };

export function validateBackup(input: unknown): BackupValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Berkas backup bukan objek JSON yang valid." };
  }
  const candidate = input as Partial<BranchBackup>;
  if (candidate.kind !== BACKUP_KIND) {
    return { ok: false, error: "Berkas ini bukan backup LaundryOS (jenis berkas tidak dikenal)." };
  }
  if (candidate.formatVersion !== 1 && candidate.formatVersion !== 2 && candidate.formatVersion !== 3 && candidate.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: `Versi format backup (${String(candidate.formatVersion)}) tidak didukung aplikasi ini.` };
  }
  const branch = candidate.branch;
  const branchSchema = z.object({
    id: text.min(1), name: text, timezone: text, phone: nullableText, email: nullableText, address: nullableText,
  });
  if (!branchSchema.safeParse(branch).success || !date.safeParse(candidate.exportedAt).success) {
    return { ok: false, error: "Informasi cabang pada backup tidak lengkap." };
  }
  // safeParse di atas memastikan tipe branch sebelum setiap baris diperiksa.
  const branchId = (branch as BranchBackup["branch"]).id;
  const tables = candidate.tables;
  if (!tables || typeof tables !== "object") {
    return { ok: false, error: "Isi tabel pada backup tidak ditemukan." };
  }
  const sourceTables = tables as Record<string, unknown>;
  if (candidate.formatVersion === 1 || candidate.formatVersion === 2) sourceTables.refunds ??= [];
  if (candidate.formatVersion !== BACKUP_FORMAT_VERSION) sourceTables.serviceInventoryRecipes ??= [];
  for (const key of BACKUP_TABLE_KEYS) {
    const rows = sourceTables[key];
    if (!Array.isArray(rows)) {
      return { ok: false, error: `Tabel ${BACKUP_TABLE_LABELS[key]} tidak ada pada backup.` };
    }
    if (rows.length > MAX_ROWS_PER_TABLE) {
      return { ok: false, error: `Tabel ${BACKUP_TABLE_LABELS[key]} berisi terlalu banyak baris (${rows.length}).` };
    }
    for (const row of rows) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return { ok: false, error: `Ada baris tidak valid pada tabel ${BACKUP_TABLE_LABELS[key]}.` };
      }
      const record = row as BackupRow;
      if (record.branch_id !== branchId) {
        return { ok: false, error: `Ada baris dari cabang lain pada tabel ${BACKUP_TABLE_LABELS[key]}; backup ditolak demi keamanan.` };
      }
      const validation = rowSchemas[key].safeParse(record);
      if (!validation.success) {
        const column = validation.error.issues[0]?.path.join(".") || "baris";
        return { ok: false, error: `Kolom ${column} tidak valid pada tabel ${BACKUP_TABLE_LABELS[key]}.` };
      }
    }
  }
  const typedTables = tables as Record<BackupTableKey, BackupRow[]>;
  for (const row of typedTables.orders) {
    row.unit = row.unit ?? "kg";
    row.quantity = row.quantity ?? row.weight_kg;
    if (row.unit_price_snapshot === undefined) {
      const quantity = Number(row.quantity);
      row.unit_price_snapshot = quantity > 0 ? Math.round(Number(row.amount) / quantity) : 0;
    }
    row.express_fee = row.express_fee ?? 0;
    row.delivery_fee = row.delivery_fee ?? 0;
    row.discount_amount = row.discount_amount ?? 0;
  }
  candidate.formatVersion = BACKUP_FORMAT_VERSION;
  for (const key of BACKUP_TABLE_KEYS) {
    const ids = new Set<string>();
    for (const row of typedTables[key]) {
      const id = row.id as string;
      if (ids.has(id)) return { ok: false, error: `Ada id duplikat pada tabel ${BACKUP_TABLE_LABELS[key]}.` };
      ids.add(id);
    }
  }
  for (const [key, column] of [
    ["customers", "phone"],
    ["services", "name"],
    ["cashClosings", "closing_date"],
  ] as const) {
    const values = new Set<string>();
    for (const row of typedTables[key]) {
      const raw = row[column] as string;
      const value = column === "closing_date" ? raw.slice(0, 10) : raw;
      if (values.has(value)) {
        return { ok: false, error: `Ada ${column} duplikat pada tabel ${BACKUP_TABLE_LABELS[key]}.` };
      }
      values.add(value);
    }
  }
  const customerIds = new Set(typedTables.customers.map((row) => row.id));
  const serviceIds = new Set(typedTables.services.map((row) => row.id));
  const inventoryIds = new Set(typedTables.inventoryItems.map((row) => row.id));
  const orderIds = new Set(typedTables.orders.map((row) => row.id));
  if (typedTables.orders.some((row) => !customerIds.has(row.customer_id) || !serviceIds.has(row.service_id))) {
    return { ok: false, error: "Pesanan merujuk pelanggan atau layanan yang tidak ada dalam backup." };
  }
  if ([...typedTables.orderStatusHistory, ...typedTables.payments, ...typedTables.refunds].some((row) => !orderIds.has(row.order_id))) {
    return { ok: false, error: "Riwayat status, pembayaran, atau refund merujuk pesanan yang tidak ada dalam backup." };
  }
  const recipeKeys = new Set<string>();
  for (const recipe of typedTables.serviceInventoryRecipes) {
    if (!serviceIds.has(recipe.service_id) || !inventoryIds.has(recipe.item_id)) {
      return { ok: false, error: "Resep pemakaian merujuk layanan atau persediaan yang tidak ada dalam backup." };
    }
    const key = [recipe.service_id, recipe.item_id, recipe.consume_at_status].join(":");
    if (recipeKeys.has(key)) return { ok: false, error: "Ada resep pemakaian duplikat pada satu tahap layanan." };
    recipeKeys.add(key);
  }
  return { ok: true, backup: candidate as BranchBackup };
}

export function countBackupRows(backup: BranchBackup): Record<BackupTableKey, number> & { total: number } {
  const counts = {} as Record<BackupTableKey, number> & { total: number };
  let total = 0;
  for (const key of BACKUP_TABLE_KEYS) {
    counts[key] = backup.tables[key].length;
    total += backup.tables[key].length;
  }
  counts.total = total;
  return counts;
}
