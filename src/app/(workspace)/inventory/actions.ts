"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { requirePermission } from "@/server/modules/auth/permissions";

function requireDatabase(session: Awaited<ReturnType<typeof getAuthSession>>) {
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengelola persediaan.");
  requirePermission(session.role, "inventory:manage");
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
  const note = String(formData.get("note") ?? "").trim();
  if (name.length < 2 || name.length > 100 || category.length < 2 || category.length > 80 ||
      unit.length < 1 || unit.length > 24 || !Number.isFinite(stock) || stock < 0 ||
      Math.round(stock * 1000) !== stock * 1000 || !Number.isFinite(minStock) || minStock < 0 ||
      Math.round(minStock * 1000) !== minStock * 1000 || !Number.isSafeInteger(price) || price < 0 ||
      note.length < 2 || note.length > 200) {
    throw new Error("Data barang persediaan tidak valid.");
  }
  await getNeonSql().query(
    "WITH changed AS (INSERT INTO laundry_inventory_items (id, branch_id, name, category, unit, quantity, min_quantity, unit_price) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (branch_id, name) DO UPDATE SET " +
    "category = EXCLUDED.category, unit = EXCLUDED.unit, quantity = laundry_inventory_items.quantity + EXCLUDED.quantity, " +
    "min_quantity = EXCLUDED.min_quantity, unit_price = EXCLUDED.unit_price, updated_at = now() RETURNING id), " +
    "movement AS (INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, note, actor_id) " +
    "SELECT $9::uuid, $2, id, $13, $6, $10, $11 FROM changed WHERE $6 <> 0 RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $12::uuid, $2, $11, 'inventory.add_or_restock', 'inventory_item', id::text, " +
    "jsonb_build_object('quantity_delta', $6, 'note', $10) FROM changed RETURNING id) SELECT id FROM changed",
    [randomUUID(), session.branchId, name, category, unit, stock, minStock, price, randomUUID(), note, session.userId, randomUUID(), "purchase"],
  );
  revalidatePath("/inventory");
}

export async function adjustInventory(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  const movementType = String(formData.get("movementType") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000 || Math.round(delta * 1000) !== delta * 1000 || !["purchase", "usage", "adjustment"].includes(movementType) || (movementType === "purchase" && delta <= 0) || (movementType === "usage" && delta >= 0) || note.length < 2 || note.length > 200) {
    throw new Error("Penyesuaian stok tidak valid.");
  }
  const result = await getNeonSql().query(
    "WITH changed AS (UPDATE laundry_inventory_items SET quantity = quantity + $1, updated_at = now() " +
    "WHERE id = $2::uuid AND branch_id = $3 AND quantity + $1 >= 0 RETURNING id, quantity), " +
    "movement AS (INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, note, actor_id) " +
    "SELECT $4::uuid, $3, id, $8, $1, $5, $6 FROM changed RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $7::uuid, $3, $6, 'inventory.adjusted', 'inventory_item', id::text, " +
    "jsonb_build_object('quantity_delta', $1, 'quantity_after', quantity, 'note', $5) FROM changed RETURNING id) " +
    "SELECT id FROM changed",
    [delta, id, session.branchId, randomUUID(), note, session.userId, randomUUID(), movementType],
  );
  if (!Array.isArray(result) || result.length === 0) throw new Error("Stok tidak dapat dikurangi di bawah nol.");
  revalidatePath("/inventory");
}
