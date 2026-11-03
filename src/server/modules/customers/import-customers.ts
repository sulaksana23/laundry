import "server-only";

import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";
import { analyzeCustomerCsv, type CustomerImportReport } from "@/lib/customer-import";
import { normalizePhoneNumber } from "@/lib/phone";

/**
 * Mengimpor pelanggan dari teks CSV ke satu cabang.
 * Aturan: nomor yang sudah terdaftar di cabang tidak diubah (dilewati dan
 * dilaporkan), duplikat di dalam berkas hanya diambil yang pertama, dan
 * nomor selalu disimpan dalam format ternormalisasi (diawali 0).
 */
export async function importCustomersFromCsv(branchId: string, csvText: string): Promise<CustomerImportReport> {
  const analysis = analyzeCustomerCsv(csvText);
  if (analysis.fatalError) {
    throw new Error(analysis.fatalError);
  }

  const sql = getNeonSql();
  const existingRows = (await sql.query(
    "SELECT phone FROM laundry_customers WHERE branch_id = $1",
    [branchId],
  )) as Array<{ phone: string }>;
  const existingPhones = new Set(
    (Array.isArray(existingRows) ? existingRows : []).map((row) => normalizePhoneNumber(row.phone)),
  );

  const fresh = analysis.valid.filter((candidate) => !existingPhones.has(candidate.phone));
  const alreadyRegistered = analysis.valid.length - fresh.length;

  if (fresh.length > 0) {
    const values: string[] = [];
    const parameters: unknown[] = [];
    fresh.forEach((candidate, index) => {
      const base = index * 4;
      values.push(`($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4})`);
      parameters.push(randomUUID(), branchId, candidate.name, candidate.phone);
    });
    await sql.query(
      `INSERT INTO laundry_customers (id, branch_id, name, phone) VALUES ${values.join(", ")} ON CONFLICT (branch_id, phone) DO NOTHING`,
      parameters,
    );
  }

  return {
    totalRows: analysis.totalRows,
    inserted: fresh.length,
    alreadyRegistered,
    duplicateInFile: analysis.duplicateInFile,
    errors: analysis.errors,
  };
}
