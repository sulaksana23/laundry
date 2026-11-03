import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, CircleCheck, ClipboardList, Plus, Sparkles, Wallet } from "lucide-react";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { inventoryItems as demoInventory, mockOrders } from "@/features/orders/data/mock-orders";
import { orderStatusLabels, type OrderStatus } from "@/features/orders/domain/order";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getOrdersService } from "@/server/modules/orders/orders.runtime";
import {
  getDashboardData,
  getFinanceSummary,
  getOrderSummary,
  getReportData,
  listInventory,
} from "@/server/modules/workspace/operations";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const TIME_ZONE = "Asia/Makassar";
const queueStatuses: { status: OrderStatus; color: string }[] = [
  { status: "received", color: "bg-slate-400" },
  { status: "washing", color: "bg-sky-300" },
  { status: "drying", color: "bg-amber-200" },
  { status: "ironing", color: "bg-violet-300" },
  { status: "ready", color: "bg-accent" },
];

function lastSevenDays() {
  const days: { key: string; label: string }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    days.push({
      key: new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date),
      label: new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: TIME_ZONE }).format(date),
    });
  }
  return days;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(new Date()));
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 19) return "Selamat sore";
  return "Selamat malam";
}

export default async function DashboardPage() {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const firstName = session ? session.fullName.split(" ")[0] : "Admin";
  const branchName = session ? session.branchName : "Cabang Bangli";
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE,
  }).format(new Date());

  return (
    <>
      <PageHeader
        eyebrow={`${todayLabel} · ${branchName}`}
        title={`${greeting()}, ${firstName} 👋`}
        description={databaseEnabled
          ? "Berikut ringkasan operasional laundry hari ini dari data tersimpan."
          : "Berikut ringkasan operasional laundry hari ini. Mode demo memakai data contoh."}
        action={<Link href="/orders" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-semibold text-accent-foreground transition hover:brightness-95"><Plus size={15} /> Buat pesanan</Link>}
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent branchId={session?.branchId ?? null} databaseEnabled={databaseEnabled} branchName={branchName} />
      </Suspense>
    </>
  );
}

async function DashboardContent({ branchId, databaseEnabled, branchName }: { branchId: string | null; databaseEnabled: boolean; branchName: string }) {
  const [orderSummary, financeSummary, dashboardData, recentResult, inventory, reportData] = databaseEnabled && branchId
    ? await Promise.all([
        getOrderSummary(branchId),
        getFinanceSummary(branchId),
        getDashboardData(branchId),
        getOrdersService().list({ branchId, page: 1, pageSize: 5 }),
        listInventory(branchId),
        getReportData(branchId),
      ])
    : [null, null, null, null, null, null];

  const days = lastSevenDays();
  const demoDailyAmounts = [1900000, 2600000, 2200000, 3350000, 2900000, 3900000, 4550000];
  const incomeByDate = new Map((dashboardData?.dailyIncome ?? []).map((row) => [row.date, row.amount]));
  const dailyIncome = days.map((day, index) => ({
    ...day,
    amount: databaseEnabled ? (incomeByDate.get(day.key) ?? 0) : demoDailyAmounts[index],
  }));
  const maxDailyIncome = Math.max(...dailyIncome.map((day) => day.amount), 1);
  const incomeWeek = dailyIncome.reduce((total, day) => total + day.amount, 0);

  const recentOrders = recentResult?.items ?? mockOrders.slice(0, 5);
  const statusCounts: Record<string, number> = dashboardData?.statusCounts ?? Object.fromEntries(
    queueStatuses.map(({ status }) => [status, mockOrders.filter((order) => order.status === status).length]),
  );
  const activeOrders = orderSummary?.active ?? mockOrders.filter((order) => order.status !== "completed").length;
  const readyOrders = orderSummary?.ready ?? statusCounts.ready ?? 0;
  const ordersToday = orderSummary?.today ?? 0;
  const incomeMonth = financeSummary?.incomeMonth ?? 18450000;
  const incomeChangePct = reportData && reportData.previousIncome > 0
    ? ((reportData.income - reportData.previousIncome) / reportData.previousIncome) * 100
    : null;
  const incomeChange = incomeChangePct === null
    ? "12,8%"
    : `${Math.abs(incomeChangePct).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  const incomePositive = incomeChangePct === null ? true : incomeChangePct >= 0;
  const unpaidCount = financeSummary?.unpaidCount ?? mockOrders.filter((order) => order.paymentStatus !== "paid").length;
  const outstanding = financeSummary?.outstanding ?? mockOrders.reduce((total, order) => total + (order.amount - order.paidAmount), 0);
  const lowStock = (inventory ?? demoInventory).filter((item) => item.stock <= item.minStock);

  return (
    <>
      <section aria-label="Ringkasan performa" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pendapatan bulan ini" value={formatCurrency(incomeMonth)} change={incomeChange} positive={incomePositive} icon={Banknote} />
        <MetricCard label="Pesanan aktif" value={String(activeOrders)} change={databaseEnabled ? `${ordersToday} hari ini` : "data demo"} trend={false} note="Sedang dalam antrean proses" icon={ClipboardList} />
        <MetricCard label="Siap diambil" value={String(readyOrders)} change={readyOrders ? "perlu diambil" : "tidak ada"} trend={false} note="Menunggu diserahkan ke pelanggan" icon={CircleCheck} />
        <MetricCard label="Belum lunas" value={String(unpaidCount)} change={formatCurrency(outstanding)} trend={false} note="Total tagihan belum lunas" icon={Wallet} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0">
          <CardHeader><div><CardTitle>Ringkasan pendapatan</CardTitle><p className="mt-1 text-[11px] text-muted">Tren 7 hari terakhir · {databaseEnabled ? "data tersimpan" : "data demo"}</p></div><span className="rounded-md bg-surface-raised px-2 py-1.5 text-[10px] text-muted">7 hari</span></CardHeader>
          <div className="px-4 pb-4 pt-3">
            <div className="mb-3 flex items-baseline gap-2"><p className="text-2xl font-semibold">{formatCurrency(incomeWeek)}</p><span className="text-[11px] font-medium text-muted">total 7 hari</span></div>
            <div className="relative flex h-[175px] items-end gap-1.5 border-b border-border pb-0">
              <div className="absolute inset-0 flex flex-col justify-between pb-6 pt-2 text-[9px] text-muted/70"><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /><div className="border-t border-dashed border-border/70" /></div>
              {dailyIncome.map((day, index) => <div key={day.key} className="relative z-10 flex h-full flex-1 items-end"><div className={`chart-bar w-full rounded-t-sm ${index === dailyIncome.length - 1 ? "bg-accent" : "bg-[#657d49]/70 hover:bg-accent/70"}`} style={{ height: `${Math.max((day.amount / maxDailyIncome) * 100, day.amount ? 4 : 1.5)}%`, animationDelay: `${index * 70}ms` }} title={`${day.label}: ${formatCurrency(day.amount)}`} /></div>)}
            </div>
            <div className="mt-2 flex justify-between pl-1 text-[9px] text-muted">{dailyIncome.map((day) => <span key={day.key}>{day.label}</span>)}</div>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader><div><CardTitle>Proses hari ini</CardTitle><p className="mt-1 text-[11px] text-muted">Status antrean pesanan aktif</p></div><span className="rounded-lg bg-surface-raised p-2 text-accent"><Sparkles size={15} /></span></CardHeader>
          <div className="space-y-4 px-4 py-4">
            {queueStatuses.map(({ status, color }) => {
              const count = statusCounts[status] ?? 0;
              return <div key={status}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted">{orderStatusLabels[status]}</span><span className="font-medium">{count}<span className="text-muted"> / {activeOrders}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className={`progress-bar h-full rounded-full ${color}`} style={{ width: `${activeOrders ? (count / activeOrders) * 100 : 0}%` }} /></div></div>;
            })}
          </div>
          <div className="border-t border-border px-4 py-3"><Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Lihat semua pesanan <ArrowRight size={13} /></Link></div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0">
          <CardHeader><div><CardTitle>Pesanan terbaru</CardTitle><p className="mt-1 text-[11px] text-muted">Aktivitas terakhir di {branchName}</p></div><Link href="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">Semua <ArrowRight size={13} /></Link></CardHeader>
          {recentOrders.length === 0 ? (
            <p className="p-10 text-center text-xs text-muted">Belum ada pesanan tersimpan. Buat pesanan pertama untuk mulai.</p>
          ) : (
            <>
              <div className="divide-y divide-border/60 md:hidden">
                {recentOrders.map((order) => (
                  <div key={order.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{order.id}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">{order.customerName} · {order.serviceName}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-muted">Selesai {formatShortDate(order.dueAt)}</span>
                      <span className="font-semibold">{formatCurrency(order.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[660px] text-left text-xs">
                  <thead><tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-2.5 font-medium">Pesanan</th><th className="px-3 py-2.5 font-medium">Pelanggan</th><th className="px-3 py-2.5 font-medium">Selesai</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Total</th></tr></thead>
                  <tbody>{recentOrders.map((order) => <tr key={order.id} className="border-b border-border/60 last:border-0 hover:bg-surface-raised/60"><td className="px-4 py-3 font-semibold">{order.id}<p className="mt-0.5 text-[10px] font-normal text-muted">{order.serviceName}</p></td><td className="px-3 py-3">{order.customerName}</td><td className="px-3 py-3 text-muted">{formatShortDate(order.dueAt)}</td><td className="px-3 py-3"><OrderStatusBadge status={order.status} /></td><td className="px-4 py-3 text-right font-medium">{formatCurrency(order.amount)}</td></tr>)}</tbody>
                </table>
              </div>
            </>
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader><div><CardTitle>Catatan operasional</CardTitle><p className="mt-1 text-[11px] text-muted">Hal yang perlu diperhatikan</p></div></CardHeader>
          <div className="space-y-2.5 p-4">
            {lowStock.length > 0 ? lowStock.slice(0, 2).map((item) => <div key={item.id} className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold text-amber-100">Stok menipis</span><span className="size-1.5 rounded-full bg-amber-200" /></div><p className="text-[11px] leading-5 text-muted">{item.name} tersisa {item.stock} {item.unit}. Batas minimum {item.minStock} {item.unit}.</p><Link href="/inventory" className="mt-2 inline-block text-[11px] font-semibold text-accent">Periksa persediaan →</Link></div>) : <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold text-emerald-100">Stok aman</span><span className="size-1.5 rounded-full bg-emerald-200" /></div><p className="text-[11px] leading-5 text-muted">Tidak ada bahan yang berada di bawah batas minimum.</p></div>}
            {unpaidCount > 0 ? <div className="rounded-lg border border-border bg-surface-raised/60 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold">Pembayaran tertunda</span><span className="text-[10px] text-muted">{unpaidCount} pesanan</span></div><p className="text-[11px] leading-5 text-muted">Total tagihan belum lunas {formatCurrency(outstanding)}.</p><Link href="/finance" className="mt-2 inline-block text-[11px] font-semibold text-accent">Buka keuangan →</Link></div> : <div className="rounded-lg border border-border bg-surface-raised/60 p-3"><div className="mb-1 flex items-center justify-between"><span className="text-xs font-semibold">Pembayaran tertunda</span></div><p className="text-[11px] leading-5 text-muted">Semua pesanan sudah lunas.</p></div>}
          </div>
        </Card>
      </section>
    </>
  );
}
