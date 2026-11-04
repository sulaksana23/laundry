import { BarChart3, Boxes, CircleDollarSign, ClipboardList, History, LayoutDashboard, Settings2, Shirt, UsersRound } from "lucide-react";
import type { WorkspacePermission } from "@/server/modules/auth/permissions";

export const navigation = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/orders", label: "Pesanan", icon: ClipboardList, permission: "orders:read" },
  { href: "/customers", label: "Pelanggan", icon: UsersRound, permission: "customers:read" },
  { href: "/services", label: "Layanan", icon: Shirt, permission: "services:read" },
  { href: "/inventory", label: "Persediaan", icon: Boxes, permission: "inventory:read", dot: true },
  { href: "/finance", label: "Keuangan", icon: CircleDollarSign, permission: "finance:read" },
  { href: "/reports", label: "Laporan", icon: BarChart3, permission: "reports:read" },
  { href: "/activity", label: "Aktivitas", icon: History, permission: "audit:read" },
  { href: "/settings", label: "Pengaturan", icon: Settings2, permission: "settings:manage" },
] satisfies Array<{ href: string; label: string; icon: typeof LayoutDashboard; permission?: WorkspacePermission; count?: string; dot?: boolean }>;
