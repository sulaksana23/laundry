import Link from "next/link";
import { ArrowRight, Banknote, CircleCheck, Clock3, ClipboardList, Plus, Sparkles } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { mockOrders } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";

const chartValues = [38, 52, 44, 67, 58, 78, 91];

export default function DashboardPage() {
  const recentOrders = mockOrders.slice(0, 5);
  return (
    <>
      <PageHeader
        eyebrow="Senin, 2 November 2026 · Cabang Bangli"
        title="Selamat malam, Admin 👋"
        description="Berikut ringkasan operasional laundry hari ini."
        action={<Link href="/orders" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"><Plus size={15} /> Buat pesanan</Link>}
      />

      <section aria-label="Ringkasan performa" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendapatan bulan ini" value="Rp 18,45 jt" change="12,8%" icon={Banknote} />
        <MetricCard label="Pesanan aktif" value="5" change="data demo" icon={ClipboardList} />
        <MetricCard label="Siap diambil" value="1" change="data demo" positive={false} icon={CircleCheck} />
        <MetricCard label="Rata-rata selesai" value="1,4 hari" change="6,1%" icon={Clock3} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Ringkasan pendapatan</CardTitle><p className="mt-1 text-[11px] text-muted">Tren 7 hari terakhir · data demo</p></div><span className="rounded-md bg-surface-raised px-2 py-1.5 text-[10px] text-muted">7 hari</span></CardHeader>
          <div className="px-4 pb-4 pt-3">
            <div className="mb-3 flex items-baseline gap-2"><p className="text-2xl font-semibold">Rp 18.450.000</p><span className="text-[11px] font-medium text-emerald-200">↗ 12,8%</span></div>
            <div className="relative flex h-[175px] items-end gap-1.5 border-b border-border pb-0">
              <div className="absolute inset-0 flex flex-col justify-between pb-6 pt-2 text-[9px] text-muted/70"><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /></div>
              {chartValues.map((height, index) => <div key={index} className="relative z-10 flex h-full flex-1 items-end"><div className={`w-full rounded-t-sm ${index === chartValues.length - 1 ? "bg-accent" : "bg-[#657d49]/70 hover:bg-accent/70"}`} style={{ height: `${height}%` }} title={`Data demo ${index + 1}`} /></div>)}
            </div>
            <div className="mt-2 flex justify-between pl-1 text-[9px] text-muted"><span>27 Okt</span><span>29 Okt</span><span>31 Okt</span><span>2 Nov</span></div>
          </div>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Proses hari ini</CardTitle><p className="mt-1 text-[11px] text-muted">Status antrean pesanan aktif</p></div><span className="rounded-lg bg-surface-raised p-2 text-accent"><Sparkles size={15} /></span></CardHeader>
          <div className="space-y-4 px-4 py-4">
            {[{ label: "Diterima", count: 1, total: 5, color: "bg-slate-400" }, { label: "Dicuci", count: 1, total: 5, color: "bg-sky-300" }, { label: "Dikeringkan", count: 1, total: 5, color: "bg-amber-200" }, { label: "Disetrika", count: 1, total: 5, color: "bg-violet-300" }, { label: "Siap diambil", count: 1, total: 5, color: "bg-accent" }].map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">{item.label}</span><span className="font-medium">{item.count}<span className="text-muted"> / {item.total}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.count / item.total) * 100}%` }} /></div></div>)}
          </div>
          <div className="border-t border-border px-4 py-3"><Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Lihat semua pesanan <ArrowRight size={13} /></Link></div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Pesanan terbaru</CardTitle><p className="mt-1 text-[11px] text-muted">Aktivitas terakhir di cabang Bangli</p></div><Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">Semua <ArrowRight size={13} /></Link></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[660px] text-left text-xs">
              <thead><tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-2.5 font-medium">Pesanan</th><th className="px-3 py-2.5 font-medium">Pelanggan</th><th className="px-3 py-2.5 font-medium">Selesai</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Total</th></tr></thead>
              <tbody>{recentOrders.map((order) => <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-surface-raised/60"><td className="px-4 py-3 font-semibold">{order.id}<p className="mt-0.5 text-[10px] font-normal text-muted">{order.serviceName}</p></td><td className="px-3 py-3">{order.customerName}</td><td className="px-3 py-3 text-muted">{formatShortDate(order.dueAt)}</td><td className="px-3 py-3"><OrderStatusBadge status={order.status} /></td><td className="px-4 py-3 text-right font-medium">{formatCurrency(order.amount)}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Catatan operasional</CardTitle><p className="mt-1 text-[11px] text-muted">Hal yang perlu diperhatikan</p></div></CardHeader>
          <div className="space-y-2.5 p-4">
            <div className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold text-amber-100">Stok menipis</span><span className="size-1.5 rounded-full bg-amber-200" /></div><p className="text-[11px] leading-5 text-muted">Detergen cair tersisa 8 liter. Batas minimum 10 liter.</p><Link href="/inventory" className="mt-2 inline-block text-[11px] font-semibold text-accent">Periksa persediaan →</Link></div>
            <div className="rounded-lg border border-border bg-surface-raised/60 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold">Pembayaran tertunda</span><span className="text-[10px] text-muted">3 pesanan</span></div><p className="text-[11px] leading-5 text-muted">Total tagihan belum lunas Rp 126.000.</p><Link href="/finance" className="mt-2 inline-block text-[11px] font-semibold text-accent">Buka keuangan →</Link></div>
          </div>
        </Card>
      </section>
    </>
  );
}
