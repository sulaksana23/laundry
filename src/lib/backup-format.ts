// Format berkas backup data cabang LaundryOS (FR-17, fitur Pro).
// Dipakai bersama oleh server (pembuatan & pemulihan backup) dan klien
// (pratinjau isi berkas sebelum dipulihkan).

export const BACKUP_KIND = "laundryos-branch-backup";
export const BACKUP_FORMAT_VERSION = 1;

export const BACKUP_TABLE_KEYS = [
  "customers",
  "services",
  "orders",
  "orderStatusHistory",
  "payments",
  "expenses",
  "inventoryItems",
  "cashClosings",
] as const;

export type BackupTableKey = (typeof BACKUP_TABLE_KEYS)[number];

export const BACKUP_TABLE_LABELS: Record<BackupTableKey, string> = {
  customers: "Pelanggan",
  services: "Layanan",
  orders: "Pesanan",
  orderStatusHistory: "Riwayat status pesanan",
  payments: "Pembayaran",
  expenses: "Pengeluaran",
  inventoryItems: "Persediaan",
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
  if (candidate.formatVersion !== BACKUP_FORMAT_VERSION) {
    return { ok: false, error: `Versi format backup (${String(candidate.formatVersion)}) tidak didukung aplikasi ini.` };
  }
  const branch = candidate.branch;
  if (!branch || typeof branch.id !== "string" || branch.id.length === 0 || typeof branch.name !== "string") {
    return { ok: false, error: "Informasi cabang pada backup tidak lengkap." };
  }
  const tables = candidate.tables;
  if (!tables || typeof tables !== "object") {
    return { ok: false, error: "Isi tabel pada backup tidak ditemukan." };
  }
  for (const key of BACKUP_TABLE_KEYS) {
    const rows = (tables as Record<string, unknown>)[key];
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
      if (typeof record.id !== "string" || record.id.length === 0) {
        return { ok: false, error: `Ada baris tanpa id pada tabel ${BACKUP_TABLE_LABELS[key]}.` };
      }
      if (record.branch_id !== branch.id) {
        return { ok: false, error: `Ada baris dari cabang lain pada tabel ${BACKUP_TABLE_LABELS[key]}; backup ditolak demi keamanan.` };
      }
    }
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
