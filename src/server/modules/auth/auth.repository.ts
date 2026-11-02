import "server-only";
import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

export type AuthRole = "owner";

export interface AuthUser {
  userId: string;
  email: string;
  fullName: string;
  branchId: string;
  branchName: string;
  role: AuthRole;
}

export interface AuthCredentials extends AuthUser {
  passwordHash: string;
}

interface NewOwnerAccount {
  userId: string;
  branchId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  branchName: string;
}

function resultRows<Row>(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Row[];
  }
  return [];
}

function toCredentials(row: {
  user_id: string;
  email: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
  role: AuthRole;
  password_hash: string;
}): AuthCredentials {
  return {
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name,
    branchId: row.branch_id,
    branchName: row.branch_name,
    role: row.role,
    passwordHash: row.password_hash,
  };
}

export class AuthRepository {
  async findByEmail(email: string): Promise<AuthCredentials | null> {
    const result = await getNeonSql().query(
      "SELECT u.id AS user_id, u.email, u.full_name, u.branch_id, b.name AS branch_name, u.role, u.password_hash " +
        "FROM laundry_users u JOIN laundry_branches b ON b.id = u.branch_id " +
        "WHERE lower(u.email) = lower($1) LIMIT 1",
      [email],
    );
    const row = resultRows<Parameters<typeof toCredentials>[0]>(result)[0];
    return row ? toCredentials(row) : null;
  }

  async createOwnerAccount(input: NewOwnerAccount): Promise<AuthUser> {
    const sql = getNeonSql();
    const serviceIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    try {
      await sql.transaction([
        sql.query(
          "INSERT INTO laundry_branches (id, name, timezone) VALUES ($1, $2, 'Asia/Makassar')",
          [input.branchId, input.branchName],
        ),
        sql.query(
          "INSERT INTO laundry_users (id, branch_id, full_name, email, password_hash, role) " +
            "VALUES ($1, $2, $3, $4, $5, 'owner')",
          [input.userId, input.branchId, input.fullName, input.email, input.passwordHash],
        ),
        sql.query(
          "INSERT INTO laundry_services (id, branch_id, name, unit, price_per_unit) VALUES " +
            "($1, $5, 'Cuci + Setrika', 'kg', 8000), " +
            "($2, $5, 'Cuci Kering', 'kg', 6000), " +
            "($3, $5, 'Setrika Saja', 'kg', 8000), " +
            "($4, $5, 'Express 6 Jam', 'kg', 12000)",
          [...serviceIds, input.branchId],
        ),
      ]);
    } catch (error) {
      const existing = await this.findByEmail(input.email).catch(() => null);
      if (existing) throw new Error("EMAIL_EXISTS");
      throw error;
    }

    return {
      userId: input.userId,
      email: input.email,
      fullName: input.fullName,
      branchId: input.branchId,
      branchName: input.branchName,
      role: "owner",
    };
  }
}
