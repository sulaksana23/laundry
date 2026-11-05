"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { requirePermission } from "@/server/modules/auth/permissions";

const recipeStatuses = ["washing", "drying", "ironing", "ready", "completed"] as const;

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
      Math.round(minStock * 1000) !== minStock * 1000 || !Number.isSafeInteger(price) || price < 0 || (stock > 0 && price <= 0) ||
      !Number.isSafeInteger(Math.round(stock * price)) ||
      note.length < 2 || note.length > 200) {
    throw new Error("Data barang persediaan tidak valid.");
  }
  await getNeonSql().query(
    "WITH changed AS (INSERT INTO laundry_inventory_items (id, branch_id, name, category, unit, quantity, min_quantity, unit_price, cost_basis_confirmed) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, ($6 > 0 AND $8 > 0)) ON CONFLICT (branch_id, name) DO UPDATE SET " +
    "category = EXCLUDED.category, unit = EXCLUDED.unit, quantity = laundry_inventory_items.quantity + EXCLUDED.quantity, " +
    "min_quantity = EXCLUDED.min_quantity, unit_price = CASE WHEN EXCLUDED.quantity > 0 AND EXCLUDED.unit_price > 0 " +
    "THEN CASE WHEN laundry_inventory_items.quantity = 0 THEN EXCLUDED.unit_price " +
    "WHEN laundry_inventory_items.cost_basis_confirmed THEN round((laundry_inventory_items.quantity * laundry_inventory_items.unit_price + EXCLUDED.quantity * EXCLUDED.unit_price) / (laundry_inventory_items.quantity + EXCLUDED.quantity))::bigint " +
    "ELSE laundry_inventory_items.unit_price END ELSE laundry_inventory_items.unit_price END, " +
    "cost_basis_confirmed = CASE WHEN EXCLUDED.quantity > 0 AND EXCLUDED.unit_price > 0 AND laundry_inventory_items.quantity = 0 THEN true ELSE laundry_inventory_items.cost_basis_confirmed END, " +
    "updated_at = now() RETURNING id), " +
    "movement AS (INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, cost_amount, note, actor_id) " +
    "SELECT $9::uuid, $2, id, $13, $6, CASE WHEN $6 > 0 AND $8 > 0 THEN round($6 * $8)::bigint ELSE NULL END, $10, $11 FROM changed WHERE $6 <> 0 RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $12::uuid, $2, $11, 'inventory.add_or_restock', 'inventory_item', id::text, " +
    "jsonb_build_object('quantity_delta', $6, 'unit_cost', $8, 'note', $10) FROM changed RETURNING id) SELECT id FROM changed",
    [randomUUID(), session.branchId, name, category, unit, stock, minStock, price, randomUUID(), note, session.userId, randomUUID(), "purchase"],
  );
  revalidatePath("/inventory");
}

export async function adjustInventory(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const id = String(formData.get("id") ?? "");
  const delta = Number(formData.get("delta"));
  const movementType = String(formData.get("movementType") ?? "");
  const unitCost = Number(formData.get("unitCost") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100000 || Math.round(delta * 1000) !== delta * 1000 || !["purchase", "usage", "adjustment"].includes(movementType) || (movementType === "purchase" && (delta <= 0 || !Number.isSafeInteger(unitCost) || unitCost <= 0 || !Number.isSafeInteger(Math.round(delta * unitCost)))) || (movementType !== "purchase" && unitCost !== 0) || (movementType === "usage" && delta >= 0) || note.length < 2 || note.length > 200) {
    throw new Error("Penyesuaian stok tidak valid.");
  }
  const result = await getNeonSql().query(
    "WITH changed AS (UPDATE laundry_inventory_items SET quantity = quantity + $1, " +
    "unit_price = CASE WHEN $8 = 'purchase' AND $9 > 0 THEN CASE WHEN quantity = 0 THEN $9 " +
    "WHEN cost_basis_confirmed THEN round((quantity * unit_price + $1 * $9) / (quantity + $1))::bigint ELSE unit_price END ELSE unit_price END, " +
    "cost_basis_confirmed = CASE WHEN $8 = 'purchase' AND quantity = 0 AND $9 > 0 THEN true ELSE cost_basis_confirmed END, updated_at = now() " +
    "WHERE id = $2::uuid AND branch_id = $3 AND quantity + $1 >= 0 RETURNING id, quantity, unit_price, cost_basis_confirmed), " +
    "movement AS (INSERT INTO laundry_inventory_movements (id, branch_id, item_id, movement_type, quantity_delta, cost_amount, note, actor_id) " +
    "SELECT $4::uuid, $3, id, $8, $1, CASE WHEN $8 = 'purchase' THEN round($1 * $9)::bigint WHEN $8 = 'usage' AND cost_basis_confirmed THEN round(abs($1) * unit_price)::bigint ELSE NULL END, $5, $6 FROM changed RETURNING id), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $7::uuid, $3, $6, 'inventory.adjusted', 'inventory_item', id::text, " +
    "jsonb_build_object('quantity_delta', $1, 'quantity_after', quantity, 'unit_cost', $9, 'note', $5) FROM changed RETURNING id) " +
    "SELECT id FROM changed",
    [delta, id, session.branchId, randomUUID(), note, session.userId, randomUUID(), movementType, unitCost],
  );
  if (!Array.isArray(result) || result.length === 0) throw new Error("Stok tidak dapat dikurangi di bawah nol.");
  revalidatePath("/inventory");
}

export async function saveServiceInventoryRecipe(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const serviceId = String(formData.get("serviceId") ?? "").trim();
  const itemId = String(formData.get("itemId") ?? "");
  const consumeAtStatus = String(formData.get("consumeAtStatus") ?? "");
  const quantity = Number(formData.get("quantityPerServiceUnit"));
  if (serviceId.length < 1 || serviceId.length > 100 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId) ||
      !recipeStatuses.includes(consumeAtStatus as (typeof recipeStatuses)[number]) ||
      !Number.isFinite(quantity) || quantity <= 0 || quantity > 999999999.999 ||
      Math.round(quantity * 1000) !== quantity * 1000) {
    throw new Error("Resep pemakaian bahan tidak valid.");
  }
  const result = await getNeonSql().query(
    "WITH saved AS (INSERT INTO laundry_service_inventory_recipes " +
    "(id, branch_id, service_id, item_id, consume_at_status, quantity_per_service_unit, actor_id) " +
    "SELECT $1::uuid, $2, service.id, item.id, $5, $6, $7 FROM laundry_services service " +
    "JOIN laundry_inventory_items item ON item.branch_id = service.branch_id AND item.id = $4::uuid " +
    "WHERE service.branch_id = $2 AND service.id = $3 " +
    "ON CONFLICT (branch_id, service_id, item_id, consume_at_status) DO UPDATE SET " +
    "quantity_per_service_unit = EXCLUDED.quantity_per_service_unit, actor_id = EXCLUDED.actor_id, updated_at = now() " +
    "RETURNING id, service_id, item_id, consume_at_status, quantity_per_service_unit), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $8::uuid, $2, $7, 'inventory.recipe_saved', 'service_inventory_recipe', saved.id::text, " +
    "jsonb_build_object('service_id', saved.service_id, 'item_id', saved.item_id, 'status', saved.consume_at_status, 'quantity_per_service_unit', saved.quantity_per_service_unit) " +
    "FROM saved RETURNING id) SELECT id FROM saved",
    [randomUUID(), session.branchId, serviceId, itemId, consumeAtStatus, quantity, session.userId, randomUUID()],
  );
  if (!Array.isArray(result) || result.length === 0) throw new Error("Layanan atau barang tidak ditemukan pada cabang ini.");
  revalidatePath("/inventory");
  revalidatePath("/orders");
}

export async function deleteServiceInventoryRecipe(formData: FormData) {
  const session = requireDatabase(await getAuthSession());
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("ID resep pemakaian bahan tidak valid.");
  }
  const result = await getNeonSql().query(
    "WITH deleted AS (DELETE FROM laundry_service_inventory_recipes WHERE id = $1::uuid AND branch_id = $2 " +
    "RETURNING id, service_id, item_id, consume_at_status), audit AS (" +
    "INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $3::uuid, $2, $4, 'inventory.recipe_deleted', 'service_inventory_recipe', deleted.id::text, " +
    "jsonb_build_object('service_id', deleted.service_id, 'item_id', deleted.item_id, 'status', deleted.consume_at_status) FROM deleted RETURNING id) " +
    "SELECT id FROM deleted",
    [id, session.branchId, randomUUID(), session.userId],
  );
  if (!Array.isArray(result) || result.length === 0) throw new Error("Resep pemakaian tidak ditemukan.");
  revalidatePath("/inventory");
  revalidatePath("/orders");
}
