import { createOrderSchema, type OrderUnit } from "@/features/orders/domain/order";
import { parseCsv } from "@/lib/csv";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

export const MAX_ORDER_IMPORT_ROWS = 100;

export interface OrderImportService {
  id: string;
  name: string;
  unit: OrderUnit;
  price: number;
}

export interface OrderImportRowError {
  row: number;
  message: string;
}

export interface OrderImportCandidate {
  row: number;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  quantity: number;
  dueAt: string;
  expressFee: number;
  deliveryFee: number;
  discountAmount: number;
  internalNote: string;
  unit: OrderUnit;
  unitPrice: number;
  amount: number;
}

export interface OrderImportAnalysis {
  totalRows: number;
  valid: OrderImportCandidate[];
  errors: OrderImportRowError[];
  fatalError: string | null;
}

const HEADERS = {
  name: ["nama", "nama pelanggan", "customer", "customer_name"],
  phone: ["no_hp", "no hp", "nomor hp", "telepon", "nomor telepon", "phone", "hp", "whatsapp", "wa"],
  service: ["layanan", "service", "nama layanan", "service_name"],
  quantity: ["jumlah", "quantity", "berat", "berat kg", "qty"],
  dueAt: ["target_selesai", "target selesai", "tanggal selesai", "due_at", "jatuh tempo"],
  expressFee: ["biaya_express", "biaya express", "express_fee"],
  deliveryFee: ["biaya_antar", "biaya antar", "delivery_fee"],
  discountAmount: ["diskon", "discount", "discount_amount"],
  internalNote: ["catatan_internal", "catatan internal", "internal_note", "catatan"],
} as const;

function indexOfHeader(headers: string[], aliases: readonly string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

function wholeRupiah(raw: string): number | null {
  const value = raw.trim().replace(/^rp\s*/i, "").replace(/\s/g, "");
  if (!value) return 0;
  const digits = /^\d+$/.test(value) ? value
    : /^\d{1,3}(?:\.\d{3})+$/.test(value) ? value.replaceAll(".", "")
    : null;
  if (digits === null) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Analisis CSV dipakai oleh pratinjau UI dan server agar aturan baris sama. */
export function analyzeOrderCsv(csvText: string, services: OrderImportService[]): OrderImportAnalysis {
  const { headers, rows } = parseCsv(csvText);
  const columns = Object.fromEntries(
    Object.entries(HEADERS).map(([key, aliases]) => [key, indexOfHeader(headers, aliases)]),
  ) as Record<keyof typeof HEADERS, number>;
  const required = ["name", "phone", "service", "quantity", "dueAt"] as const;
  const missing = required.filter((key) => columns[key] === -1);
  if (headers.length === 0 || missing.length > 0) {
    const labels = missing.length > 0 ? missing.map((key) => key === "name" ? "nama" : key === "phone" ? "no_hp" : key === "service" ? "layanan" : key === "quantity" ? "jumlah" : "target_selesai").join(", ") : "nama, no_hp, layanan, jumlah, target_selesai";
    return { totalRows: 0, valid: [], errors: [], fatalError: `Kolom wajib tidak ditemukan: ${labels}. Unduh contoh format untuk melihat susunan kolom.` };
  }
  if (rows.length > MAX_ORDER_IMPORT_ROWS) {
    return { totalRows: rows.length, valid: [], errors: [], fatalError: `Berkas berisi ${rows.length} baris; batas sekali impor adalah ${MAX_ORDER_IMPORT_ROWS} baris.` };
  }

  const servicesByName = new Map<string, OrderImportService[]>();
  for (const service of services) {
    const key = service.name.trim().toLocaleLowerCase("id-ID");
    servicesByName.set(key, [...(servicesByName.get(key) ?? []), service]);
  }

  const valid: OrderImportCandidate[] = [];
  const errors: OrderImportRowError[] = [];
  const rowError = (row: number, message: string) => errors.push({ row, message });

  rows.forEach((cells, index) => {
    const row = index + 2;
    const cell = (key: keyof typeof HEADERS) => columns[key] < 0 ? "" : (cells[columns[key]] ?? "").trim();
    const customerName = cell("name").replace(/\s+/g, " ");
    const rawPhone = cell("phone");
    const serviceName = cell("service");
    const quantityText = cell("quantity");
    const dueAt = cell("dueAt");
    const expressFee = wholeRupiah(cell("expressFee"));
    const deliveryFee = wholeRupiah(cell("deliveryFee"));
    const discountAmount = wholeRupiah(cell("discountAmount"));
    const internalNote = cell("internalNote");

    if (customerName.length < 2 || customerName.length > 100) return rowError(row, "Nama pelanggan harus 2–100 karakter.");
    if (!isValidPhoneNumber(rawPhone)) return rowError(row, "Nomor HP tidak valid.");
    if (!serviceName) return rowError(row, "Nama layanan wajib diisi.");
    if (!quantityText) return rowError(row, "Jumlah atau berat wajib diisi.");
    if (!validDate(dueAt)) return rowError(row, "Target selesai harus berupa tanggal valid dengan format YYYY-MM-DD.");
    if (expressFee === null || deliveryFee === null || discountAmount === null) return rowError(row, "Biaya dan diskon harus berupa Rupiah bulat, misalnya 10000 atau 10.000.");
    if (internalNote.length > 500) return rowError(row, "Catatan internal maksimal 500 karakter.");

    const quantity = Number(quantityText.replace(",", "."));
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return rowError(row, "Jumlah harus lebih dari 0 dan maksimal 100.000.");
    const matches = servicesByName.get(serviceName.toLocaleLowerCase("id-ID")) ?? [];
    if (matches.length !== 1) return rowError(row, matches.length === 0 ? `Layanan “${serviceName}” tidak ditemukan atau tidak aktif di cabang ini.` : `Nama layanan “${serviceName}” tidak unik; periksa katalog layanan.`);
    const service = matches[0];
    if (!Number.isSafeInteger(service.price) || service.price < 0) return rowError(row, `Harga layanan “${serviceName}” tidak valid.`);
    if (service.unit !== "kg" && !Number.isInteger(quantity)) return rowError(row, "Jumlah untuk layanan pcs atau pasang harus bilangan bulat.");
    if (service.unit === "kg" && Math.abs(quantity * 100 - Math.round(quantity * 100)) > 1e-8) return rowError(row, "Berat maksimal dua angka desimal.");

    const parsed = createOrderSchema.safeParse({
      customerName,
      customerPhone: normalizePhoneNumber(rawPhone),
      serviceName: service.name,
      quantity,
      dueAt,
      expressFee,
      deliveryFee,
      discountAmount,
      internalNote,
    });
    if (!parsed.success) return rowError(row, parsed.error.issues[0]?.message ?? "Data pesanan tidak valid.");

    const baseAmount = service.unit === "kg" ? Math.round(quantity * service.price) : quantity * service.price;
    const amount = baseAmount + expressFee + deliveryFee - discountAmount;
    if (!Number.isSafeInteger(amount) || discountAmount > baseAmount + expressFee + deliveryFee) {
      return rowError(row, "Diskon tidak boleh melebihi subtotal pesanan.");
    }
    valid.push({
      row,
      ...parsed.data,
      unit: service.unit,
      unitPrice: service.price,
      amount,
    });
  });

  return { totalRows: rows.length, valid, errors, fatalError: null };
}
