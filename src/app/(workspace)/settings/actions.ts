"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { requirePermission } from "@/server/modules/auth/permissions";

const allowedTimezones = ["Asia/Makassar", "Asia/Jakarta", "Asia/Jayapura"];

export async function updateBranchProfile(formData: FormData) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengubah profil usaha.");
  requirePermission(session.role, "settings:manage");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (name.length < 2 || name.length > 100) throw new Error("Nama usaha tidak valid.");
  if (phone.length > 32 || (phone && phone.replace(/\D/g, "").length < 8)) throw new Error("Nomor telepon usaha tidak valid.");
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error("Email usaha tidak valid.");
  if (address.length > 300) throw new Error("Alamat usaha terlalu panjang.");
  if (!allowedTimezones.includes(timezone)) throw new Error("Zona waktu tidak valid.");

  await getNeonSql().query(
    "WITH changed AS (UPDATE laundry_branches SET name = $2, phone = $3, email = $4, address = $5, timezone = $6 WHERE id = $1 RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $7::uuid, id, $8, 'branch.profile_updated', 'branch_profile', id, " +
    "jsonb_build_object('fields', jsonb_build_array('name', 'phone', 'email', 'address', 'timezone')) FROM changed RETURNING id) SELECT id FROM changed",
    [session.branchId, name, phone || null, email || null, address || null, timezone, randomUUID(), session.userId],
  );
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

import { saveLicense, verifyLicenseKey } from "@/server/modules/license/license";

export async function activateLicense(licenseKey: string) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengaktifkan LaundryOS Pro.");
  requirePermission(session.role, "settings:manage");
  const result = verifyLicenseKey(licenseKey);
  if (!result.valid) throw new Error(result.reason);
  await saveLicense(session.branchId, licenseKey, result.payload);
  revalidatePath("/settings");
  revalidatePath("/finance");
  revalidatePath("/reports");
  return {
    active: true,
    holderName: result.payload.name,
    holderEmail: result.payload.email,
    expiresAt: result.payload.expiresAt,
  };
}
