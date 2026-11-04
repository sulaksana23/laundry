import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Lock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { mockOrders } from "@/features/orders/data/mock-orders";
import { formatCurrency } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { isProActive } from "@/server/modules/license/license";
import { getCurrentReportDateRange, getOwnerBranchReport, getReportData } from "@/server/modules/workspace/operations";
import { hasPermission } from "@/server/modules/auth/permissions";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

function change(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? "Baru" : "0%";
  const value = Math.round(((current - previous) / previous) * 100);
  return (value > 0 ? "+" : "") + value + "%";
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> }) {
  const params = await searchParams;
  const session = await getAuthSession();
  if (session && !hasPermission(session.role, "reports:read")) redirect("/");
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const canExport = Boolean(session && hasPermission(session.role, "reports:export"));
  const proActive = databaseEnabled ? await isProActive(session!.branchId) : false;
  const defaultRange = databaseEnabled ? await getCurrentReportDateRange(session!.branchId) : { from: "2026-11-01", to: "2026-11-04" };
  let from = validDate(params.from) ? params.from : defaultRange.from;
  let to = validDate(params.to) ? params.to : defaultRange.to;
  const requestedDays = Math.round((new Date(to + "T00:00:00.000Z").getTime() - new Date(from + "T00:00:00.000Z").getTime()) / 86400000) + 1;
  const invalidRange = requestedDays < 1 || requestedDays > 366;
  if (invalidRange) { from = defaultRange.from; to = defaultRange.to; }
  const report = databaseEnabled ? await getReportData(session!.branchId, from, to) : {
    from, to,
    orders: mockOrders.length, income: mockOrders.reduce((sum, order) => sum + order.paidAmount, 0),
    weight: mockOrders.reduce((sum, order) => sum + (order.unit === "kg" ? order.quantity : 0), 0), pcsCount: mockOrders.reduce((sum, order) => sum + (order.unit === "pcs" ? order.quantity : 0), 0), pairCount: mockOrders.reduce((sum, order) => sum + (order.unit === "pasang" ? order.quantity : 0), 0), newCustomers: 6,
    previousOrders: 0, previousIncome: 0,
    weeks: [{ label: "Minggu 1", orders: 3, income: 50000 }, { label: "Minggu 2", orders: 2, income: 42000 }],
    services: Object.entries(mockOrders.reduce<Record<string, number>>((counts, order) => {
      counts[order.serviceName] = (counts[order.serviceName] ?? 0) + 1; return counts;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    paymentMethods: [],
  };
  const maxIncome = Math.max(1, ...report.weeks.map((week) => week.income));
  const maxOrders = Math.max(1, ...report.weeks.map((week) => week.orders));
  const ownerBranchReports = databaseEnabled && session?.role === "owner"
    ? await getOwnerBranchReport(session.userId, report.from, report.to)
    : [];
  const consolidatedOrders = ownerBranchReports.reduce((total, branch) => total + branch.orders, 0);
  const consolidatedIncome = ownerBranchReports.reduce((total, branch) => total + branch.income, 0);

  return (
    <>
      <PageHeader eyebrow="Analisis usaha" title="Laporan" description="Bandingkan pesanan dan pemasukan untuk rentang tanggal yang dipilih." action={!canExport ? undefined : databaseEnabled ? (proActive ? <a href={`/api/reports/export?from=${report.from}&to=${report.to}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold hover:bg-surface-hover"><Download size={14} /> Unduh CSV</a> : <Link href="/settings#pro" className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-300/30 bg-amber-300/5 px-3 text-xs font-semibold text-amber-200 hover:bg-amber-300/10"><Lock size={14} /> Unduh CSV · Pro</Link>) : <Button disabled title="Ekspor tersedia saat data cabang tersambung"><Download size={14} /> Unduh CSV</Button>} />
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-3">
          <label className="text-[10px] font-medium text-muted">Dari<input className="mt-1 block h-9 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground" type="date" name="from" defaultValue={report.from} required /></label>
          <label className="text-[10px] font-medium text-muted">Sampai<input className="mt-1 block h-9 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground" type="date" name="to" defaultValue={report.to} required /></label>
          <Button type="submit" variant="secondary" className="h-9">Terapkan</Button>
        </form>
        <span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{databaseEnabled ? "Data aktual cabang" : "Mode demo"}</span>
      </div>
      {invalidRange && <p role="alert" className="-mt-2 mb-4 text-xs text-amber-200">Rentang laporan harus antara 1 dan 366 hari. Rentang ditampilkan ulang ke nilai bawaan.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4"><p className="text-[11px] text-muted">Total pesanan</p><p className="mt-2 text-2xl font-semibold">{report.orders.toLocaleString("id-ID")}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><TrendingUp size={12} /> {change(report.orders, report.previousOrders)} vs periode sebelumnya</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Pemasukan tercatat</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(report.income)}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><TrendingUp size={12} /> {change(report.income, report.previousIncome)} vs periode sebelumnya</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Berat cucian</p><p className="mt-2 text-2xl font-semibold">{report.weight.toLocaleString("id-ID")} kg</p><p className="mt-1 text-[10px] text-muted">Pesanan dengan satuan kilogram</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Jumlah item</p><p className="mt-2 text-base font-semibold">{report.pcsCount.toLocaleString("id-ID")} pcs · {report.pairCount.toLocaleString("id-ID")} pasang</p><p className="mt-1 text-[10px] text-muted">Jumlah menurut satuan</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Pelanggan baru</p><p className="mt-2 text-2xl font-semibold">{report.newCustomers.toLocaleString("id-ID")}</p><p className="mt-1 text-[10px] text-muted">Terdaftar pada rentang ini</p></Card>
      </div>
      {ownerBranchReports.length > 0 && <Card className="mt-4 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4"><div><h2 className="text-sm font-semibold">Ringkasan semua cabang</h2><p className="mt-1 text-[11px] text-muted">Cabang yang terhubung ke akun pemilik · tanggal lokal masing-masing cabang</p></div><div className="flex gap-5 text-right"><div><p className="text-[10px] text-muted">Total pesanan</p><p className="mt-1 text-sm font-semibold">{consolidatedOrders.toLocaleString("id-ID")}</p></div><div><p className="text-[10px] text-muted">Pemasukan bersih</p><p className="mt-1 text-sm font-semibold">{formatCurrency(consolidatedIncome)}</p></div></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Cabang</th><th className="px-3 py-3 text-right font-medium">Pesanan</th><th className="px-4 py-3 text-right font-medium">Pemasukan bersih</th></tr></thead><tbody>{ownerBranchReports.map((branch) => <tr key={branch.id} className="border-t border-border/70"><td className="px-4 py-3 font-medium">{branch.name}</td><td className="px-3 py-3 text-right">{branch.orders.toLocaleString("id-ID")}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(branch.income)}</td></tr>)}</tbody><tfoot><tr className="border-t border-border bg-surface-raised/30 font-semibold"><td className="px-4 py-3">Gabungan</td><td className="px-3 py-3 text-right">{consolidatedOrders.toLocaleString("id-ID")}</td><td className="px-4 py-3 text-right">{formatCurrency(consolidatedIncome)}</td></tr></tfoot></table></div>
        <p className="border-t border-border px-4 py-3 text-[10px] leading-5 text-muted">Pemasukan dihitung dari pembayaran pada tanggal transaksi dikurangi refund yang tercatat pada tanggal refund. Total pesanan tidak memasukkan pesanan yang dibatalkan.</p>
      </Card>}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card><CardHeader><div><CardTitle>Pemasukan dan pesanan</CardTitle><p className="mt-1 text-[11px] text-muted">Kelompok tujuh hari pada rentang terpilih</p></div></CardHeader>
          {report.weeks.length ? <div className="space-y-4 p-4">{report.weeks.map((week) => <div key={week.label} className="grid grid-cols-[64px_1fr] items-center gap-3 sm:grid-cols-[72px_1fr_130px]"><span className="text-[11px] text-muted">{week.label}</span><div><div className="h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-accent" style={{ width: ((week.income / maxIncome) * 100) + "%" }} /></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-sky-300/70" style={{ width: ((week.orders / maxOrders) * 100) + "%" }} /></div></div><span className="col-start-2 text-left text-[10px] text-muted sm:col-start-auto sm:text-right">{formatCurrency(week.income)} · {week.orders} pesanan</span></div>)}</div> : <p className="p-10 text-center text-xs text-muted">Belum ada aktivitas pada rentang ini.</p>}
          <div className="flex gap-4 border-t border-border px-4 py-3 text-[10px] text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" /> Pemasukan</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300/70" /> Pesanan</span></div>
        </Card>
        <Card><CardHeader><div><CardTitle>Layanan terlaris</CardTitle><p className="mt-1 text-[11px] text-muted">Berdasarkan pesanan pada rentang terpilih</p></div></CardHeader>
          {report.services.length ? <div className="space-y-4 p-4">{report.services.map((item, index) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-xs"><span><span className="mr-2 text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</span>{item.name}</span><span className="text-muted">{item.count} pesanan</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-[#829f5d]" style={{ width: ((item.count / Math.max(...report.services.map((service) => service.count))) * 100) + "%" }} /></div></div>)}</div> : <p className="p-10 text-center text-xs text-muted">Belum ada pesanan pada rentang ini.</p>}
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden"><div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Ringkasan untuk pencocokan pembayaran</h2><p className="mt-1 text-[11px] text-muted">Nominal dikelompokkan menurut metode yang dicatat kasir; cocokkan transfer dan QRIS dengan mutasi penyedia pembayaran.</p></div>
        {report.paymentMethods.length === 0 ? <p className="p-8 text-center text-xs text-muted">Belum ada pembayaran pada rentang ini.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Metode</th><th className="px-3 py-3 font-medium">Transaksi</th><th className="px-4 py-3 text-right font-medium">Tercatat</th></tr></thead><tbody>{report.paymentMethods.map((item) => <tr key={item.method} className="border-t border-border/70"><td className="px-4 py-3 font-medium">{{ cash: "Tunai", transfer: "Transfer", qris: "QRIS", other: "Lainnya" }[item.method] ?? item.method}</td><td className="px-3 py-3 text-muted">{item.count}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.amount)}</td></tr>)}</tbody></table></div>}
      </Card>
      {!databaseEnabled && <p className="mt-4 text-[11px] text-muted">Data demo hanya untuk pratinjau dan tidak mewakili hasil usaha.</p>}
    </>
  );
}
