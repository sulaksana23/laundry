"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getNeonSql } from "@/server/db/neon";

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
  const parsed = expenseSchema.safeParse({
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    date: formData.get("date"),
  });
  if (!parsed.success) throw new Error("Periksa kembali data pengeluaran.");
  await getNeonSql().query(
    "INSERT INTO laundry_expenses (id, branch_id, description, category, amount, method, incurred_at) " +
    "VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::date)",
    [randomUUID(), session.branchId, parsed.data.description, parsed.data.category, parsed.data.amount, parsed.data.method, parsed.data.date],
  );
  revalidatePath("/finance");
  revalidatePath("/reports");
}
