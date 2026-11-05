import "server-only";
import { randomUUID } from "node:crypto";
import { AuthRepository, type AuthCredentials, type AuthUser } from "@/server/modules/auth/auth.repository";
import type { AuthRole, StaffMember } from "@/server/modules/auth/auth.repository";
import { hashPassword, verifyPassword } from "@/server/modules/auth/auth.password";

function withoutPassword(user: AuthCredentials): AuthUser {
  return {
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    branchId: user.branchId,
    branchName: user.branchName,
    role: user.role,
  };
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  async register(input: {
    fullName: string;
    branchName: string;
    email: string;
    password: string;
  }): Promise<AuthUser> {
    const email = input.email.trim().toLowerCase();
    if (await this.repository.emailExists(email)) throw new Error("EMAIL_EXISTS");
    const passwordHash = await hashPassword(input.password);

    return this.repository.createOwnerAccount({
      userId: randomUUID(),
      branchId: randomUUID(),
      fullName: input.fullName.trim(),
      branchName: input.branchName.trim(),
      email,
      passwordHash,
    });
  }

  async login(emailInput: string, password: string): Promise<AuthUser> {
    const credentials = await this.repository.findByEmail(emailInput.trim().toLowerCase());
    if (!credentials || !(await verifyPassword(password, credentials.passwordHash))) {
      throw new Error("INVALID_CREDENTIALS");
    }
    return withoutPassword(credentials);
  }

  async createStaff(input: { branchId: string; actorId: string; fullName: string; email: string; password: string; role: Exclude<AuthRole, "owner"> }) {
    const fullName = input.fullName.trim();
    const email = input.email.trim().toLowerCase();
    if (!input.branchId || fullName.length < 2 || fullName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error("Data staf tidak valid.");
    }
    if (input.password.length < 12 || input.password.length > 128) throw new Error("Kata sandi staf minimal 12 karakter.");
    if (await this.repository.emailExists(email)) throw new Error("EMAIL_EXISTS");
    const userId = randomUUID();
    await this.repository.createStaff({
      userId, branchId: input.branchId, actorId: input.actorId, fullName, email,
      passwordHash: await hashPassword(input.password), role: input.role,
    });
    return { userId, fullName, email, role: input.role };
  }

  listStaff(branchId: string): Promise<StaffMember[]> {
    if (!branchId) throw new Error("Cabang wajib tersedia.");
    return this.repository.listStaff(branchId);
  }

  addStaffBranchAccess(branchId: string, actorId: string, email: string): Promise<boolean> {
    if (!branchId || !actorId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error("Email staf tidak valid.");
    }
    return this.repository.addStaffBranchAccess(branchId, actorId, email);
  }

  removeStaffBranchAccess(branchId: string, actorId: string, userId: string): Promise<boolean> {
    if (!branchId || !actorId || !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Akun staf tidak valid.");
    return this.repository.removeStaffBranchAccess(branchId, actorId, userId);
  }

  setStaffActive(branchId: string, actorId: string, userId: string, isActive: boolean): Promise<boolean> {
    if (!branchId || !actorId || !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Akun staf tidak valid.");
    return this.repository.setStaffActive(branchId, actorId, userId, isActive);
  }
}
