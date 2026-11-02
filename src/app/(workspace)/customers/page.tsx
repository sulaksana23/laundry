import type { Metadata } from "next";
import { Search, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customers } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Pelanggan" };

export default function CustomersPage() {
  return (
    <>
      <PageHeader eyebrow="Relasi pelanggan" title="Pelanggan" description="Kenali pelanggan rutin dan riwayat transaksi mereka." action={<Button disabled title="Tersedia setelah backend tersambung"><UserPlus size={14} /> Tambah pelanggan</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Card className="p-3.5"><p className="text-[11px] text-muted">Pelanggan terdaftar</p><p className="mt-1 text-xl font-semibold">1.248</p><p className="mt-1 text-[10px] text-emerald-200">+32 bulan ini</p></Card><Card className="p-3.5"><p className="text-[11px] text-muted">Pelanggan aktif</p><p className="mt-1 text-xl font-semibold">384</p><p className="mt-1 text-[10px] text-muted">Transaksi 30 hari terakhir</p></Card><Card className="p-3.5"><p className="text-[11px] text-muted">Rata-rata transaksi</p><p className="mt-1 text-xl font-semibold">Rp 42.500</p><p className="mt-1 text-[10px] text-muted">Per pesanan selesai</p></Card></div>
      <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold">Daftar pelanggan</h2><p className="mt-1 text-[11px] text-muted">Data contoh untuk tampilan awal</p></div><div className="relative w-full sm:w-64"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input aria-label="Pencarian pelanggan" disabled placeholder="Pencarian demo belum tersedia" className="pl-9" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Pelanggan</th><th className="px-3 py-3 font-medium">Nomor telepon</th><th className="px-3 py-3 font-medium">Pesanan</th><th className="px-3 py-3 font-medium">Total transaksi</th><th className="px-4 py-3 font-medium">Terakhir pesan</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-border/70 hover:bg-surface-raised/50"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-accent">{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><p className="font-semibold">{customer.name}</p><p className="mt-0.5 text-[10px] text-muted">{customer.id}</p></div></div></td><td className="px-3 py-3 text-muted">{customer.phone}</td><td className="px-3 py-3">{customer.orders} kali</td><td className="px-3 py-3 font-medium">{formatCurrency(customer.totalSpent)}</td><td className="px-4 py-3 text-muted">{formatShortDate(customer.lastOrder)}</td></tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
