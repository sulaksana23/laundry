import type { AuthRole } from "./auth.repository";

export type WorkspacePermission =
  | "orders:read" | "orders:create" | "orders:advance" | "payments:record"
  | "orders:export"
  | "customers:read" | "customers:write" | "customers:export"
  | "services:read" | "services:manage"
  | "inventory:read" | "inventory:manage"
  | "finance:read" | "finance:manage" | "reports:read" | "reports:export"
  | "settings:manage" | "staff:manage" | "audit:read" | "backup:manage";

const permissionsByRole: Record<AuthRole, readonly WorkspacePermission[]> = {
  owner: [
    "orders:read", "orders:create", "orders:advance", "payments:record", "orders:export",
    "customers:read", "customers:write", "customers:export",
    "services:read", "services:manage", "inventory:read", "inventory:manage",
    "finance:read", "finance:manage", "reports:read", "reports:export",
    "settings:manage", "staff:manage", "audit:read", "backup:manage",
  ],
  cashier: [
    "orders:read", "orders:create", "orders:advance", "payments:record",
    "customers:read", "customers:write", "services:read", "finance:read", "finance:manage", "reports:read",
  ],
  operator: ["orders:read", "orders:advance", "customers:read", "services:read", "inventory:read"],
};

export function hasPermission(role: AuthRole, permission: WorkspacePermission): boolean {
  return permissionsByRole[role].includes(permission);
}

export function requirePermission(role: AuthRole, permission: WorkspacePermission): void {
  if (!hasPermission(role, permission)) throw new Error("FORBIDDEN");
}
