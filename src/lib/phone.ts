// Normalisasi nomor telepon Indonesia ke format lokal yang diawali "0".
// Contoh: "+62 812-3456-7890" -> "081234567890".
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) return "0" + digits.slice(2);
  return digits;
}

export function isValidPhoneNumber(raw: string): boolean {
  return /^0\d{8,13}$/.test(normalizePhoneNumber(raw));
}

// Format internasional untuk tautan wa.me (tanpa tanda +).
export function toWhatsAppNumber(raw: string): string {
  const normalized = normalizePhoneNumber(raw);
  return normalized.startsWith("0") ? "62" + normalized.slice(1) : normalized;
}
