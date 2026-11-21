import "server-only";
import { randomUUID } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

export type AuthRole = "owner" | "cashier" | "operator";

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

export interface StaffMember {
  userId: string;
  fullName: string;
  email: string;
  role: Exclude<AuthRole, "owner">;
  isActive: boolean;
  primaryBranchId: string;
  branchIds: string[];
  branchNames: string[];
}

export interface AccessibleBranch {
  id: string;
  name: string;
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


const DEMO_EMAIL = "demo@laundry.test";

function demoSeedStatements(sql: ReturnType<typeof getNeonSql>, branchId: string, actorId: string) {
  return [
    sql.query("SELECT laundry_seed_demo_data($1, $2)", [branchId, actorId]),
  ];
}

export class AuthRepository {
  async findByEmail(email: string): Promise<AuthCredentials | null> {
    const result = await getNeonSql().query(
      "SELECT u.id AS user_id, u.email, u.full_name, u.branch_id, b.name AS branch_name, u.role, u.password_hash " +
        "FROM laundry_users u JOIN laundry_branches b ON b.id = u.branch_id " +
        "WHERE lower(u.email) = lower($1) AND u.is_active = true LIMIT 1",
      [email],
    );
    const row = resultRows<Parameters<typeof toCredentials>[0]>(result)[0];
    return row ? toCredentials(row) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await getNeonSql().query(
      "SELECT 1 FROM laundry_users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );
    return resultRows(result).length > 0;
  }

  async findActiveUser(userId: string): Promise<AuthUser | null> {
    const result = await getNeonSql().query(
      "SELECT u.id AS user_id, u.email, u.full_name, u.branch_id, b.name AS branch_name, u.role " +
      "FROM laundry_users u JOIN laundry_branches b ON b.id = u.branch_id " +
      "WHERE u.id = $1::uuid AND u.is_active = true LIMIT 1",
      [userId],
    );
    const row = resultRows<Omit<Parameters<typeof toCredentials>[0], "password_hash">>(result)[0];
    return row ? {
      userId: row.user_id, email: row.email, fullName: row.full_name,
      branchId: row.branch_id, branchName: row.branch_name, role: row.role,
    } : null;
  }

  async getSessionVersion(userId: string): Promise<number> {
    const result = await getNeonSql().query(
      "SELECT session_version FROM laundry_users WHERE id = $1::uuid LIMIT 1",
      [userId],
    );
    return Number(resultRows<{ session_version: number }>(result)[0]?.session_version ?? 0);
  }

  /** Membatalkan semua sesi pengguna dengan menaikkan versi sesinya. */
  async revokeSessions(userId: string): Promise<void> {
    await getNeonSql().query(
      "UPDATE laundry_users SET session_version = session_version + 1 WHERE id = $1::uuid",
      [userId],
    );
  }

  async findActiveUserForBranch(userId: string, branchId: string): Promise<(AuthUser & { sessionVersion: number }) | null> {
    const result = await getNeonSql().query(
      "SELECT u.id AS user_id, u.email, u.full_name, b.id AS branch_id, b.name AS branch_name, u.role, u.session_version " +
      "FROM laundry_users u JOIN laundry_user_branch_access access ON access.user_id = u.id " +
      "JOIN laundry_branches b ON b.id = access.branch_id " +
      "WHERE u.id = $1::uuid AND access.branch_id = $2 AND u.is_active = true " +
      "LIMIT 1",
      [userId, branchId],
    );
    const row = resultRows<Omit<Parameters<typeof toCredentials>[0], "password_hash"> & { session_version: number }>(result)[0];
    return row ? {
      userId: row.user_id, email: row.email, fullName: row.full_name,
      branchId: row.branch_id, branchName: row.branch_name, role: row.role,
      sessionVersion: Number(row.session_version ?? 0),
    } : null;
  }

  async listAccessibleBranches(userId: string): Promise<AccessibleBranch[]> {
    const result = await getNeonSql().query(
      "SELECT b.id, b.name FROM laundry_users u " +
      "JOIN laundry_user_branch_access access ON access.user_id = u.id " +
      "JOIN laundry_branches b ON b.id = access.branch_id " +
      "WHERE u.id = $1::uuid AND u.is_active = true ORDER BY b.name ASC",
      [userId],
    );
    return resultRows<{ id: string; name: string }>(result);
  }

  async listStaff(branchId: string): Promise<StaffMember[]> {
    const result = await getNeonSql().query(
      "SELECT u.id::text AS user_id, u.full_name, u.email, u.role, u.is_active, u.branch_id AS primary_branch_id, " +
      "array_agg(access.branch_id ORDER BY branch.name) AS branch_ids, array_agg(branch.name ORDER BY branch.name) AS branch_names " +
      "FROM laundry_users u JOIN laundry_user_branch_access access ON access.user_id = u.id " +
      "JOIN laundry_branches branch ON branch.id = access.branch_id " +
      "WHERE access.branch_id = $1 AND u.role <> 'owner' GROUP BY u.id ORDER BY u.created_at DESC",
      [branchId],
    );
    return resultRows<{ user_id: string; full_name: string; email: string; role: Exclude<AuthRole, "owner">; is_active: boolean; primary_branch_id: string; branch_ids: string[]; branch_names: string[] }>(result).map((row) => ({
      userId: row.user_id, fullName: row.full_name, email: row.email, role: row.role, isActive: row.is_active,
      primaryBranchId: row.primary_branch_id, branchIds: row.branch_ids, branchNames: row.branch_names,
    }));
  }

  async addStaffBranchAccess(branchId: string, actorId: string, email: string): Promise<boolean> {
    const result = await getNeonSql().query(
      "WITH target AS MATERIALIZED (SELECT staff.id FROM laundry_users actor " +
      "JOIN laundry_user_branch_access actor_access ON actor_access.user_id = actor.id AND actor_access.branch_id = $1 " +
      "JOIN laundry_users staff ON lower(staff.email) = lower($3) AND staff.role <> 'owner' AND staff.is_active = true " +
      "JOIN laundry_user_branch_access staff_home_access ON staff_home_access.user_id = staff.id AND staff_home_access.branch_id = staff.branch_id " +
      "JOIN laundry_user_branch_access owner_home_access ON owner_home_access.user_id = actor.id AND owner_home_access.branch_id = staff.branch_id " +
      "WHERE actor.id = $2::uuid AND actor.role = 'owner' AND actor.is_active = true), " +
      "added AS (INSERT INTO laundry_user_branch_access (user_id, branch_id) SELECT id, $1 FROM target " +
      "ON CONFLICT DO NOTHING RETURNING user_id), audit AS (INSERT INTO laundry_audit_events " +
      "(id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
      "SELECT $4::uuid, $1, $2, 'staff.branch_access_added', 'staff', user_id::text, " +
      "jsonb_build_object('branch_id', $1) FROM added RETURNING id) SELECT user_id FROM added",
      [branchId, actorId, email.trim().toLowerCase(), randomUUID()],
    );
    return resultRows(result).length > 0;
  }

  async removeStaffBranchAccess(branchId: string, actorId: string, userId: string): Promise<boolean> {
    const result = await getNeonSql().query(
      "WITH eligible AS MATERIALIZED (SELECT staff.id FROM laundry_users actor " +
      "JOIN laundry_user_branch_access actor_access ON actor_access.user_id = actor.id AND actor_access.branch_id = $1 " +
      "JOIN laundry_users staff ON staff.id = $3::uuid AND staff.role <> 'owner' AND staff.branch_id <> $1 " +
      "WHERE actor.id = $2::uuid AND actor.role = 'owner' AND actor.is_active = true), " +
      "removed AS (DELETE FROM laundry_user_branch_access access USING eligible " +
      "WHERE access.user_id = eligible.id AND access.branch_id = $1 RETURNING access.user_id), " +
      "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
      "SELECT $4::uuid, $1, $2, 'staff.branch_access_removed', 'staff', user_id::text, " +
      "jsonb_build_object('branch_id', $1) FROM removed RETURNING id) SELECT user_id FROM removed",
      [branchId, actorId, userId, randomUUID()],
    );
    return resultRows(result).length > 0;
  }

  async createStaff(input: { userId: string; branchId: string; actorId: string; fullName: string; email: string; passwordHash: string; role: Exclude<AuthRole, "owner"> }): Promise<void> {
    await getNeonSql().query(
      "WITH created AS (INSERT INTO laundry_users (id, branch_id, full_name, email, password_hash, role) " +
      "VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING id, role), " +
      "access AS (INSERT INTO laundry_user_branch_access (user_id, branch_id) SELECT id, $2 FROM created RETURNING user_id), " +
      "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
      "SELECT $7::uuid, $2, $8, 'staff.created', 'staff', created.id::text, jsonb_build_object('role', role) FROM created JOIN access ON access.user_id = created.id RETURNING id) " +
      "SELECT id FROM created",
      [input.userId, input.branchId, input.fullName, input.email, input.passwordHash, input.role, randomUUID(), input.actorId],
    );
  }

  async setStaffActive(branchId: string, actorId: string, userId: string, isActive: boolean): Promise<boolean> {
    const result = await getNeonSql().query(
      "WITH eligible AS MATERIALIZED (SELECT staff.id FROM laundry_users actor " +
      "JOIN laundry_user_branch_access actor_access ON actor_access.user_id = actor.id AND actor_access.branch_id = $2 " +
      "JOIN laundry_user_branch_access staff_access ON staff_access.user_id = $1::uuid AND staff_access.branch_id = $2 " +
      "JOIN laundry_users staff ON staff.id = staff_access.user_id AND staff.role <> 'owner' " +
      "JOIN laundry_user_branch_access owner_home_access ON owner_home_access.user_id = actor.id AND owner_home_access.branch_id = staff.branch_id " +
      "WHERE actor.id = $3::uuid AND actor.role = 'owner' AND actor.is_active = true AND staff.id <> actor.id), " +
      "changed AS (UPDATE laundry_users SET is_active = $4, updated_at = now() WHERE id IN (SELECT id FROM eligible) RETURNING id, is_active), " +
      "audit AS (INSERT INTO laundry_audit_events (id, branch_id, actor_id, action, entity_type, entity_id, metadata) " +
      "SELECT $5::uuid, $2, $3, CASE WHEN is_active THEN 'staff.activated' ELSE 'staff.deactivated' END, 'staff', id::text, " +
      "jsonb_build_object('active', is_active) FROM changed RETURNING id) SELECT id FROM changed",
      [userId, branchId, actorId, isActive, randomUUID()],
    );
    return resultRows(result).length > 0;
  }

  async createOwnerAccount(input: NewOwnerAccount): Promise<AuthUser> {
    const sql = getNeonSql();
    const serviceIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    try {
      const statements = [
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
          "INSERT INTO laundry_user_branch_access (user_id, branch_id) VALUES ($1::uuid, $2)",
          [input.userId, input.branchId],
        ),
        sql.query(
          "INSERT INTO laundry_services (id, branch_id, name, unit, price_per_unit, description, duration_minutes) VALUES " +
            "($1, $5, 'Cuci + Setrika', 'kg', 8000, 'Cuci, keringkan, dan setrika pakaian.', 2880), " +
            "($2, $5, 'Cuci Kering', 'kg', 6000, 'Cuci dan keringkan pakaian.', 1440), " +
            "($3, $5, 'Setrika Saja', 'kg', 8000, 'Setrika pakaian bersih.', 1440), " +
            "($4, $5, 'Express 6 Jam', 'kg', 12000, 'Prioritas selesai maksimal enam jam.', 360)",
          [...serviceIds, input.branchId],
        ),
      ];
      if (input.email.toLowerCase() === DEMO_EMAIL) {
        statements.push(...demoSeedStatements(sql, input.branchId, input.userId));
      }
      await sql.transaction(statements);
    } catch (error) {
      if (await this.emailExists(input.email).catch(() => false)) throw new Error("EMAIL_EXISTS");
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
