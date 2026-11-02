import "server-only";
import { randomUUID } from "node:crypto";
import { AuthRepository, type AuthCredentials, type AuthUser } from "@/server/modules/auth/auth.repository";
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
    if (await this.repository.findByEmail(email)) throw new Error("EMAIL_EXISTS");
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
}
