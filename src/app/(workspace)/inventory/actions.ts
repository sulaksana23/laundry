"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";

function requireDatabase(session: Awaited<ReturnType<typeof getAuthSession>>) {
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengelola persediaan.");
  return session;
}

export async function createInventoryItem(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const stock = Number(formData.get("stock"));
  const minStock = Number(formData.get("minStock"));
  const price = Number(formData.get("price"));
  if (name.length < 2 || name.length > 100 || category.length < 2 || category.length > 80 ||
      unit.length < 1 || unit.length > 24 || !Number.isFinite(stock) || stock < 0 ||
      !Number.isFinite(minStock) || minStock < 0 || !Number.isSafeInteger(price) || price < 0) {
    throw new Error("Data barang persediaan tidak valid.");
  }
  await getNeonSql().query(
    "INSERT INTO laundry_inventory_items (id, branch_id, name, category, unit, quantity, min_quantity, unit_price) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)",
    [randomUUID(), session.branchId, name, category, unit, stock, minStock, price],
  );
  revalidatePath("/inventory");
}

export async function adjustInventory(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000) {
    throw new Error("Penyesuaian stok tidak valid.");
  }
  const result = await getNeonSql().query(
    "UPDATE laundry_inventory_items SET quantity = quantity + $1, updated_at = now() " +
    "WHERE id = $2::uuid AND branch_id = $3 AND quantity + $1 >= 0 RETURNING id",
    [delta, id, session.branchId],
  );
  if (!Array.isArray(result) || result.length === 0) throw new Error("Stok tidak dapat dikurangi di bawah nol.");
  revalidatePath("/inventory");
}
