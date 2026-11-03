"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";

export async function createCustomer(formData: FormData) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk menambahkan pelanggan.");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2 || name.length > 100 || phone.replace(/\D/g, "").length < 8 || phone.length > 32) {
    throw new Error("Nama atau nomor telepon pelanggan tidak valid.");
  }
  await getNeonSql().query(
    "INSERT INTO laundry_customers (id, branch_id, name, phone) VALUES ($1::uuid, $2, $3, $4) " +
    "ON CONFLICT (branch_id, phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now()",
    [randomUUID(), session.branchId, name, phone],
  );
  revalidatePath("/customers");
}
