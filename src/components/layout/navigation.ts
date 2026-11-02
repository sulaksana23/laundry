import { BarChart3, Boxes, CircleDollarSign, ClipboardList, LayoutDashboard, Settings2, Shirt, UsersRound } from "lucide-react";

export const navigation = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/orders", label: "Pesanan", icon: ClipboardList, count: "8" },
  { href: "/customers", label: "Pelanggan", icon: UsersRound },
  { href: "/services", label: "Layanan", icon: Shirt },
  { href: "/inventory", label: "Persediaan", icon: Boxes, dot: true },
  { href: "/finance", label: "Keuangan", icon: CircleDollarSign },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/settings", label: "Pengaturan", icon: Settings2 },
];
