import { parseCsv } from "@/lib/csv";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

// Analisis berkas CSV impor pelanggan, dipakai bersama oleh server (mode database)
// dan simulasi di browser (mode demo) agar aturan validasinya selalu sama.

export interface CustomerImportRowError {
  row: number;
  message: string;
}

export interface CustomerImportCandidate {
  name: string;
  phone: string;
}

export interface CustomerImportAnalysis {
  totalRows: number;
  valid: CustomerImportCandidate[];
  duplicateInFile: number;
  errors: CustomerImportRowError[];
  fatalError: string | null;
}

export interface CustomerImportReport {
  totalRows: number;
  inserted: number;
  alreadyRegistered: number;
  duplicateInFile: number;
  errors: CustomerImportRowError[];
}

const NAME_HEADERS = ["nama", "name", "nama pelanggan", "customer"];
const PHONE_HEADERS = ["no_hp", "no hp", "nomor hp", "no. hp", "telepon", "nomor telepon", "phone", "hp", "whatsapp", "wa"];

export const MAX_IMPORT_ROWS = 1000;

export function analyzeCustomerCsv(csvText: string): CustomerImportAnalysis {
  const { headers, rows } = parseCsv(csvText);
  const nameIndex = headers.findIndex((header) => NAME_HEADERS.includes(header));
  const phoneIndex = headers.findIndex((header) => PHONE_HEADERS.includes(header));
  if (nameIndex === -1 || phoneIndex === -1) {
    return {
      totalRows: 0,
      valid: [],
      duplicateInFile: 0,
      errors: [],
      fatalError: "Kolom wajib tidak ditemukan. Baris pertama berkas harus berisi kolom nama dan no_hp (contoh: nama,no_hp).",
    };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      totalRows: rows.length,
      valid: [],
      duplicateInFile: 0,
      errors: [],
      fatalError: `Berkas berisi ${rows.length} baris data; batas maksimum sekali impor adalah ${MAX_IMPORT_ROWS} baris.`,
    };
  }

  const valid: CustomerImportCandidate[] = [];
  const errors: CustomerImportRowError[] = [];
  const seenPhones = new Set<string>();
  let duplicateInFile = 0;

  rows.forEach((cells, index) => {
    const rowNumber = index + 2; // baris 1 adalah header
    const name = (cells[nameIndex] ?? "").replace(/\s+/g, " ").trim();
    const rawPhone = cells[phoneIndex] ?? "";
    if (name.length < 2 || name.length > 100) {
      errors.push({ row: rowNumber, message: "Nama pelanggan harus 2–100 karakter." });
      return;
    }
    if (!isValidPhoneNumber(rawPhone)) {
      errors.push({ row: rowNumber, message: `Nomor HP "${rawPhone}" tidak valid.` });
      return;
    }
    const phone = normalizePhoneNumber(rawPhone);
    if (seenPhones.has(phone)) {
      duplicateInFile++;
      return;
    }
    seenPhones.add(phone);
    valid.push({ name, phone });
  });

  return { totalRows: rows.length, valid, duplicateInFile, errors, fatalError: null };
}
