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

export async function addBranch(formData: FormData) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled() || session.role !== "owner") throw new Error("Hanya pemilik yang dapat menambah cabang.");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("Nama cabang harus 2–100 karakter.");
  if (!allowedTimezones.includes(timezone)) throw new Error("Zona waktu tidak valid.");
  const id = randomUUID();
  await getNeonSql().query(
    "WITH branch AS (INSERT INTO laundry_branches (id, name, timezone) VALUES ($1, $2, $3) RETURNING id), " +
    "services AS (INSERT INTO laundry_services (id, branch_id, name, unit, price_per_unit, description, duration_minutes) " +
    "SELECT seed.id, branch.id, seed.name, 'kg', seed.price, seed.description, seed.duration FROM branch CROSS JOIN (VALUES " +
    "($7::text, 'Cuci + Setrika', 8000::bigint, 'Cuci, keringkan, dan setrika pakaian.', 2880), " +
    "($8::text, 'Cuci Kering', 6000::bigint, 'Cuci dan keringkan pakaian.', 1440), " +
    "($9::text, 'Setrika Saja', 8000::bigint, 'Setrika pakaian bersih.', 1440), " +
    "($10::text, 'Express 6 Jam', 12000::bigint, 'Prioritas selesai maksimal enam jam.', 360)" +
    ") AS seed(id, name, price, description, duration) RETURNING id), " +
    "access AS (INSERT INTO laundry_user_branch_access (user_id, branch_id) SELECT $4::uuid, id FROM branch RETURNING branch_id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $5::uuid, branch_id, $6, 'branch.created', 'branch', branch_id, jsonb_build_object('name', $2) FROM access RETURNING id) SELECT branch_id FROM access",
    [id, name, timezone, session.userId, randomUUID(), session.userId, randomUUID(), randomUUID(), randomUUID(), randomUUID()],
  );
  revalidatePath("/");
  revalidatePath("/settings");
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
