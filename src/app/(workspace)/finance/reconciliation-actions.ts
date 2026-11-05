"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { requirePermission } from "@/server/modules/auth/permissions";
import { ignoreReconciliationRow, importReconciliationCsv, matchReconciliationPayment } from "@/server/modules/workspace/reconciliation";

async function requireFinanceManager() {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengelola rekonsiliasi.");
  requirePermission(session.role, "finance:manage");
  return session;
}

export async function importStatementCsv(formData: FormData) {
  const session = await requireFinanceManager();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000 || !file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("Pilih berkas CSV berukuran maksimal 1 MB.");
  }
  const result = await importReconciliationCsv(session.branchId, session.userId, file.name, await file.text());
  revalidatePath("/finance");
  redirect(`/finance?reconciliationImported=${result.imported}&reconciliationSkipped=${result.skipped}`);
}

export async function matchStatementRow(formData: FormData) {
  const session = await requireFinanceManager();
  const rowId = String(formData.get("rowId") ?? "");
  const paymentId = String(formData.get("paymentId") ?? "");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(rowId) || !uuid.test(paymentId)) throw new Error("Pilihan pembayaran tidak valid.");
  await matchReconciliationPayment(session.branchId, session.userId, rowId, paymentId);
  revalidatePath("/finance");
}

export async function ignoreStatementRow(formData: FormData) {
  const session = await requireFinanceManager();
  const rowId = String(formData.get("rowId") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rowId)) throw new Error("Baris rekonsiliasi tidak valid.");
  await ignoreReconciliationRow(session.branchId, session.userId, rowId);
  revalidatePath("/finance");
}
