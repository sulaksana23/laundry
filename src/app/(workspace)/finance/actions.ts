"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";
import { getExpectedCash } from "@/server/modules/workspace/operations";
import { isProActive } from "@/server/modules/license/license";
import { requirePermission } from "@/server/modules/auth/permissions";

const expenseSchema = z.object({
  description: z.string().trim().min(2).max(140),
  category: z.string().trim().min(2).max(80),
  amount: z.coerce.number().int().positive().safe(),
  method: z.enum(["cash", "transfer", "qris", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Tanggal pengeluaran tidak valid."),
});

export async function createExpense(formData: FormData) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mencatat pengeluaran.");
  requirePermission(session.role, "finance:manage");
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    date: formData.get("date"),
  });
  if (!parsed.success) throw new Error("Periksa kembali data pengeluaran.");
  await getNeonSql().query(
    "WITH created AS (INSERT INTO laundry_expenses (id, branch_id, description, category, amount, method, incurred_at) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date) RETURNING id, amount, method), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $8::uuid, $2, $9, 'expense.created', 'expense', id::text, jsonb_build_object('amount', amount, 'method', method) FROM created RETURNING id) SELECT id FROM created",
    [randomUUID(), session.branchId, parsed.data.description, parsed.data.category, parsed.data.amount, parsed.data.method, parsed.data.date, randomUUID(), session.userId],
  );
  revalidatePath("/finance");
  revalidatePath("/reports");
}

const cashClosingSchema = z.object({
  countedAmount: z.coerce.number().int().min(0).safe(),
  note: z.string().trim().max(300).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(value + "T00:00:00.000Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Tanggal tutup kasir tidak valid."),
});

export async function saveCashClosing(formData: FormData) {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk melakukan tutup kasir.");
  requirePermission(session.role, "finance:manage");
  if (!(await isProActive(session.branchId))) throw new Error("Tutup kasir adalah fitur LaundryOS Pro. Aktifkan Pro di Pengaturan untuk memakai fitur ini.");
  const parsed = cashClosingSchema.safeParse({
    countedAmount: formData.get("countedAmount"),
    note: formData.get("note") || undefined,
    date: formData.get("date"),
  });
  if (!parsed.success) throw new Error("Periksa kembali isian tutup kasir.");
  // Nilai kas seharusnya selalu dihitung ulang di server dari transaksi tersimpan.
  const { expected } = await getExpectedCash(session.branchId, parsed.data.date);
  await getNeonSql().query(
    "WITH changed AS (INSERT INTO laundry_cash_closings (id, branch_id, closing_date, expected_amount, counted_amount, note, closed_by) " +
    "VALUES ($1::uuid, $2, $3::date, $4, $5, $6, $7) " +
    "ON CONFLICT (branch_id, closing_date) DO UPDATE SET expected_amount = EXCLUDED.expected_amount, " +
    "counted_amount = EXCLUDED.counted_amount, note = EXCLUDED.note, closed_by = EXCLUDED.closed_by, updated_at = now() " +
    "RETURNING id, expected_amount, counted_amount), " +
    "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
    "SELECT $8::uuid, $2, $7, 'cash_closing.saved', 'cash_closing', $3::text, " +
    "jsonb_build_object('expected', expected_amount, 'counted', counted_amount, 'difference', counted_amount - expected_amount) FROM changed RETURNING id) SELECT id FROM changed",
    [randomUUID(), session.branchId, parsed.data.date, expected, parsed.data.countedAmount, parsed.data.note ?? null, session.userId, randomUUID()],
  );
  revalidatePath("/finance");
  revalidatePath("/reports");
}
