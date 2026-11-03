import "server-only";

import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";
import { INACTIVE_LICENSE, type LicenseStatusView } from "@/lib/pro-features";

// Kunci publik Ed25519 untuk memverifikasi kode aktivasi LaundryOS Pro.
// Kunci privat pasangannya TIDAK pernah masuk repositori; kode hanya dapat
// diterbitkan oleh Bali Tech Solution (lihat scripts/generate-license.mjs).
// Dapat diganti lewat environment LICENSE_PUBLIC_KEY_PEM bila diperlukan.
const DEFAULT_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAs4pmzXOjPTED79usVhuN7FKJEJ5nWDyLeXDJAAHgbYc=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  v: number;
  name: string;
  email: string | null;
  plan: string;
  issuedAt: string;
  expiresAt: string | null;
}

export type LicenseVerification =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Memverifikasi kode aktivasi berformat LOS1.<payload>.<tanda tangan>.
 * Tanda tangan Ed25519 memastikan kode tidak dapat dipalsukan atau diubah;
 * masa berlaku ikut diperiksa pada setiap verifikasi.
 */
export function verifyLicenseKey(rawKey: string): LicenseVerification {
  const key = rawKey.trim();
  const parts = key.split(".");
  if (parts.length !== 3 || parts[0] !== "LOS1" || key.length > 4096) {
    return { valid: false, reason: "Format kode aktivasi tidak dikenal. Periksa kembali kode yang Anda terima." };
  }

  let payload: LicensePayload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as LicensePayload;
  } catch {
    return { valid: false, reason: "Isi kode aktivasi tidak dapat dibaca. Periksa kembali kode yang Anda terima." };
  }
  if (
    !payload || payload.v !== 1 || payload.plan !== "pro" ||
    typeof payload.name !== "string" || payload.name.length < 2 || payload.name.length > 120 ||
    !isDateString(payload.issuedAt) ||
    !(payload.expiresAt === null || isDateString(payload.expiresAt))
  ) {
    return { valid: false, reason: "Isi kode aktivasi tidak valid." };
  }

  let signatureValid = false;
  try {
    const publicKey = createPublicKey(process.env.LICENSE_PUBLIC_KEY_PEM || DEFAULT_PUBLIC_KEY_PEM);
    signatureValid = cryptoVerify(null, Buffer.from(parts[1], "utf8"), publicKey, Buffer.from(parts[2], "base64url"));
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    return { valid: false, reason: "Tanda tangan kode aktivasi tidak cocok. Kode ini tidak diterbitkan oleh Bali Tech Solution." };
  }

  if (payload.expiresAt && payload.expiresAt < todayUtc()) {
    return { valid: false, reason: `Kode aktivasi sudah kedaluwarsa pada ${payload.expiresAt}. Perbarui dukungan Anda di Trakteer untuk menerima kode baru.` };
  }

  return { valid: true, payload };
}

export async function getLicenseStatus(branchId: string): Promise<LicenseStatusView> {
  const rows = (await getNeonSql().query(
    "SELECT license_key FROM laundry_licenses WHERE branch_id = $1 LIMIT 1",
    [branchId],
  )) as Array<{ license_key: string }>;
  const stored = Array.isArray(rows) ? rows[0]?.license_key : undefined;
  if (!stored) return INACTIVE_LICENSE;
  const result = verifyLicenseKey(stored);
  if (!result.valid) return INACTIVE_LICENSE;
  return {
    active: true,
    holderName: result.payload.name,
    holderEmail: result.payload.email,
    expiresAt: result.payload.expiresAt,
  };
}

export async function isProActive(branchId: string): Promise<boolean> {
  return (await getLicenseStatus(branchId)).active;
}

export async function saveLicense(branchId: string, licenseKey: string, payload: LicensePayload): Promise<void> {
  await getNeonSql().query(
    "INSERT INTO laundry_licenses (id, branch_id, license_key, holder_name, holder_email, plan, expires_at) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date) " +
    "ON CONFLICT (branch_id) DO UPDATE SET license_key = EXCLUDED.license_key, holder_name = EXCLUDED.holder_name, " +
    "holder_email = EXCLUDED.holder_email, plan = EXCLUDED.plan, expires_at = EXCLUDED.expires_at, updated_at = now()",
    [randomUUID(), branchId, licenseKey.trim(), payload.name, payload.email, payload.plan, payload.expiresAt],
  );
}
