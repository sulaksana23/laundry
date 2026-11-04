"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { AuthService } from "@/server/modules/auth/auth.service";
import { requirePermission } from "@/server/modules/auth/permissions";

const staffSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  role: z.enum(["cashier", "operator"]),
});

async function requireOwner() {
  const session = await getAuthSession();
  if (!session || !isOrdersDatabaseEnabled()) throw new Error("Silakan masuk untuk mengelola staf.");
  requirePermission(session.role, "staff:manage");
  return session;
}

export async function createStaffMember(formData: FormData) {
  const session = await requireOwner();
  const parsed = staffSchema.safeParse({
    fullName: formData.get("fullName"), email: formData.get("email"),
    password: formData.get("password"), role: formData.get("role"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Data staf tidak valid.");
  try {
    await new AuthService().createStaff({ ...parsed.data, branchId: session.branchId, actorId: session.userId });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") throw new Error("Email tersebut sudah digunakan.");
    throw error;
  }
  revalidatePath("/settings");
}

export async function setStaffMemberActive(formData: FormData) {
  const session = await requireOwner();
  const userId = String(formData.get("userId") ?? "");
  const activeValue = String(formData.get("active") ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) || !["true", "false"].includes(activeValue)) {
    throw new Error("Perubahan status staf tidak valid.");
  }
  const updated = await new AuthService().setStaffActive(session.branchId, session.userId, userId, activeValue === "true");
  if (!updated) throw new Error("Akun staf tidak ditemukan atau tidak dapat diubah.");
  revalidatePath("/settings");
}
