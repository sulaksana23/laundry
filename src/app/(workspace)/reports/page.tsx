import type { Metadata } from "next";
import { Download, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { mockOrders } from "@/features/orders/data/mock-orders";
import { formatCurrency } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getReportData } from "@/server/modules/workspace/operations";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

function change(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? "Baru" : "0%";
  const value = Math.round(((current - previous) / previous) * 100);
  return (value > 0 ? "+" : "") + value + "%";
}

export default async function ReportsPage() {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const report = databaseEnabled ? await getReportData(session!.branchId) : {
    orders: mockOrders.length, income: mockOrders.reduce((sum, order) => sum + order.paidAmount, 0),
    weight: mockOrders.reduce((sum, order) => sum + order.weightKg, 0), newCustomers: 6,
    previousOrders: 0, previousIncome: 0,
    weeks: [{ label: "Minggu 1", orders: 3, income: 50000 }, { label: "Minggu 2", orders: 2, income: 42000 }],
    services: Object.entries(mockOrders.reduce<Record<string, number>>((counts, order) => {
      counts[order.serviceName] = (counts[order.serviceName] ?? 0) + 1; return counts;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  };
  const month = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(new Date());
  const maxIncome = Math.max(1, ...report.weeks.map((week) => week.income));
  const maxOrders = Math.max(1, ...report.weeks.map((week) => week.orders));

  return (
    <>
      <PageHeader eyebrow="Analisis usaha" title="Laporan" description="Ringkasan pesanan, pemasukan, dan layanan untuk bulan berjalan." action={databaseEnabled ? <a href="/api/reports/export" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold hover:bg-surface-hover"><Download size={14} /> Unduh CSV</a> : <Button disabled title="Ekspor tersedia saat data cabang tersambung"><Download size={14} /> Unduh CSV</Button>} />
      <div className="mb-4 flex flex-wrap gap-2"><span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{month}</span><span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">{databaseEnabled ? "Data aktual cabang" : "Mode demo"}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-[11px] text-muted">Total pesanan</p><p className="mt-2 text-2xl font-semibold">{report.orders.toLocaleString("id-ID")}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><TrendingUp size={12} /> {change(report.orders, report.previousOrders)} vs bulan lalu</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Pemasukan tercatat</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(report.income)}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><TrendingUp size={12} /> {change(report.income, report.previousIncome)} vs bulan lalu</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Berat cucian</p><p className="mt-2 text-2xl font-semibold">{report.weight.toLocaleString("id-ID")} kg</p><p className="mt-1 text-[10px] text-muted">Total berat pesanan bulan ini</p></Card>
        <Card className="p-4"><p className="text-[11px] text-muted">Pelanggan baru</p><p className="mt-2 text-2xl font-semibold">{report.newCustomers.toLocaleString("id-ID")}</p><p className="mt-1 text-[10px] text-muted">Terdaftar bulan ini</p></Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card><CardHeader><div><CardTitle>Pemasukan dan pesanan</CardTitle><p className="mt-1 text-[11px] text-muted">Per minggu pada bulan berjalan</p></div></CardHeader>
          {report.weeks.length ? <div className="space-y-4 p-4">{report.weeks.map((week) => <div key={week.label} className="grid grid-cols-[72px_1fr_100px] items-center gap-3"><span className="text-[11px] text-muted">{week.label}</span><div><div className="h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-accent" style={{ width: ((week.income / maxIncome) * 100) + "%" }} /></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-sky-300/70" style={{ width: ((week.orders / maxOrders) * 100) + "%" }} /></div></div><span className="text-right text-[10px] text-muted">{formatCurrency(week.income)} · {week.orders} pesanan</span></div>)}</div> : <p className="p-10 text-center text-xs text-muted">Belum ada aktivitas bulan ini.</p>}
          <div className="flex gap-4 border-t border-border px-4 py-3 text-[10px] text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" /> Pemasukan</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300/70" /> Pesanan</span></div>
        </Card>
        <Card><CardHeader><div><CardTitle>Layanan terlaris</CardTitle><p className="mt-1 text-[11px] text-muted">Berdasarkan pesanan bulan berjalan</p></div></CardHeader>
          {report.services.length ? <div className="space-y-4 p-4">{report.services.map((item, index) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-xs"><span><span className="mr-2 text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</span>{item.name}</span><span className="text-muted">{item.count} pesanan</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-[#829f5d]" style={{ width: ((item.count / Math.max(...report.services.map((service) => service.count))) * 100) + "%" }} /></div></div>)}</div> : <p className="p-10 text-center text-xs text-muted">Belum ada pesanan bulan ini.</p>}
        </Card>
      </div>
      {!databaseEnabled && <p className="mt-4 text-[11px] text-muted">Data demo hanya untuk pratinjau dan tidak mewakili hasil usaha.</p>}
    </>
  );
}
