import type { Metadata } from "next";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customers as demoCustomers } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getCustomersService } from "@/server/modules/customers/customers.runtime";
import { createCustomer } from "./actions";
import { ImportCard } from "./import-card";

export const metadata: Metadata = { title: "Pelanggan" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; page?: string | string[] }> }) {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const params = await searchParams;
  const rawQuery = params.q;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";
  const pageValue = typeof params.page === "string" && /^[1-9]\d{0,5}$/.test(params.page) ? Number(params.page) : 1;
  const directory = databaseEnabled ? await getCustomersService().directory(session!.branchId, query, pageValue) : null;
  const allCustomers = databaseEnabled ? [] : demoCustomers;
  const rows = directory?.items ?? allCustomers.filter((customer) => (customer.name + " " + customer.phone).toLowerCase().includes(query.toLowerCase()));
  // Halaman demo tetap memakai tanggal lokal yang sama dengan cabang contoh.
  // eslint-disable-next-line react-hooks/purity
  const cutoff = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeCustomers = directory?.metrics.activeCustomers ?? allCustomers.filter((customer) => customer.lastOrder && customer.lastOrder >= cutoff).length;
  const transactions = directory?.metrics.transactions ?? allCustomers.reduce((total, customer) => total + customer.orders, 0);
  const revenue = directory?.metrics.revenue ?? allCustomers.reduce((total, customer) => total + customer.totalSpent, 0);
  const average = transactions ? Math.round(revenue / transactions) : 0;
  const total = directory?.total ?? rows.length;
  const page = directory?.page ?? 1;
  const pageSize = directory?.pageSize ?? Math.max(1, rows.length);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (target: number) => "/customers?" + new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) }).toString();

  return (
    <>
      <PageHeader eyebrow="Relasi pelanggan" title="Pelanggan" description="Cari pelanggan, lihat nilai transaksi, dan tambahkan kontak baru." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Pelanggan terdaftar</p><p className="mt-1 text-xl font-semibold">{(directory?.metrics.totalCustomers ?? allCustomers.length).toLocaleString("id-ID")}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Aktif 30 hari terakhir</p><p className="mt-1 text-xl font-semibold">{activeCustomers.toLocaleString("id-ID")}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Rata-rata nilai transaksi</p><p className="mt-1 text-xl font-semibold">{formatCurrency(average)}</p></Card>
      </div>
      {databaseEnabled ? (
        <Card id="tambah" className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2"><UserPlus size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Tambah pelanggan</h2><p className="text-[11px] text-muted">Nomor yang sudah terdaftar akan memperbarui nama pelanggan.</p></div></div>
          <form action={createCustomer} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input name="name" required minLength={2} maxLength={100} placeholder="Nama pelanggan" aria-label="Nama pelanggan" />
            <Input name="phone" required minLength={8} maxLength={32} placeholder="Nomor telepon" aria-label="Nomor telepon" />
            <FormSubmitButton variant="primary" pendingText="Menyimpan…"><UserPlus size={14} /> Simpan pelanggan</FormSubmitButton>
          </form>
        </Card>
      ) : <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Mode demo: daftar contoh hanya untuk pratinjau dan tidak disimpan ke Neon.</p>}
      <ImportCard mode={databaseEnabled ? "db" : "demo"} demoPhones={databaseEnabled ? [] : allCustomers.map((customer) => customer.phone)} />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold">Daftar pelanggan</h2><p className="mt-1 text-[11px] text-muted">{databaseEnabled ? "Data cabang tersimpan di Neon" : "Data contoh"} · {total.toLocaleString("id-ID")} pelanggan{query ? " ditemukan" : ""}</p></div>
          <form method="get" className="relative flex w-full gap-2 sm:w-auto">
            <Search size={14} className="absolute left-3 top-3 text-muted" />
            <Input name="q" defaultValue={query} aria-label="Pencarian pelanggan" placeholder="Cari nama atau nomor" className="pl-9 sm:w-64" />
            <Button type="submit">Cari</Button>
          </form>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs">
          <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Pelanggan</th><th className="px-3 py-3 font-medium">Nomor telepon</th><th className="px-3 py-3 font-medium">Pesanan</th><th className="px-3 py-3 font-medium">Total transaksi</th><th className="px-4 py-3 font-medium">Terakhir pesan</th></tr></thead>
          <tbody>{rows.map((customer) => <tr key={customer.id} className="border-t border-border/70 hover:bg-surface-raised/50"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-accent">{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><p className="font-semibold">{customer.name}</p><p className="mt-0.5 text-[10px] text-muted">{customer.id}</p></div></div></td><td className="px-3 py-3 text-muted">{customer.phone}</td><td className="px-3 py-3">{databaseEnabled ? <Link href={"/orders?customer=" + encodeURIComponent(customer.id)} className="font-medium text-accent hover:underline" aria-label={"Lihat riwayat pesanan " + customer.name}>{customer.orders} kali · Lihat riwayat</Link> : <span>{customer.orders} kali</span>}</td><td className="px-3 py-3 font-medium">{formatCurrency(customer.totalSpent)}</td><td className="px-4 py-3 text-muted">{customer.lastOrder ? formatShortDate(customer.lastOrder) : "Belum ada pesanan"}</td></tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="p-10 text-center text-xs text-muted">{query ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan. Tambahkan pelanggan baru atau impor dari CSV."}</p>}
        </div>
        {directory && total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
          <span>Menampilkan {((page - 1) * pageSize + 1).toLocaleString("id-ID")}–{Math.min(page * pageSize, total).toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")} pelanggan · Halaman {page} dari {pageCount}</span>
          <nav aria-label="Halaman daftar pelanggan" className="flex items-center gap-2">
            {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent">Sebelumnya</Link> : <span className="rounded-lg border border-border px-3 py-1.5 opacity-50">Sebelumnya</span>}
            {page < pageCount ? <Link href={pageHref(page + 1)} className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent">Berikutnya</Link> : <span className="rounded-lg border border-border px-3 py-1.5 opacity-50">Berikutnya</span>}
          </nav>
        </div>}
      </Card>
    </>
  );
}
