import type { Metadata } from "next";
import { ArrowDownLeft, ArrowUpRight, Download, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { expenseItems as demoExpenses, mockOrders } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getFinanceSummary, listExpenses, listRecentPayments, type ExpenseItem } from "@/server/modules/workspace/operations";
import { createExpense } from "./actions";

export const metadata: Metadata = { title: "Keuangan" };
export const dynamic = "force-dynamic";

const methodLabel: Record<string, string> = { cash: "Tunai", transfer: "Transfer", qris: "QRIS", other: "Lainnya" };

export default async function FinancePage() {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const expenses: ExpenseItem[] = databaseEnabled ? await listExpenses(session!.branchId) : demoExpenses.map((item) => ({ ...item }));
  const summary = databaseEnabled ? await getFinanceSummary(session!.branchId) : {
    incomeMonth: mockOrders.reduce((sum, order) => sum + order.paidAmount, 0),
    expenseMonth: demoExpenses.reduce((sum, item) => sum + item.amount, 0),
    outstanding: mockOrders.reduce((sum, order) => sum + order.amount - order.paidAmount, 0),
    unpaidCount: mockOrders.filter((order) => order.paidAmount < order.amount).length,
    incomeToday: 1248000, expensesToday: 210000, paymentsToday: 14, expensesTodayCount: 2,
  };
  const payments = databaseEnabled ? await listRecentPayments(session!.branchId) : mockOrders.filter((order) => order.paidAmount > 0).map((order) => ({
    id: order.id, orderId: order.id, customerName: order.customerName, amount: order.paidAmount, method: "cash", date: order.receivedAt,
  }));
  const net = summary.incomeMonth - summary.expenseMonth;

  return (
    <>
      <PageHeader eyebrow="Arus kas" title="Keuangan" description="Catat pengeluaran dan pantau pembayaran yang masuk serta tagihan tertunda." action={databaseEnabled ? <a href="/api/reports/export" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-xs font-semibold hover:bg-surface-hover"><Download size={14} /> Unduh CSV</a> : undefined} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Pemasukan bulan ini</p><p className="mt-2 text-xl font-semibold">{formatCurrency(summary.incomeMonth)}</p><p className="mt-1 text-[10px] text-muted">Dari pembayaran pesanan yang dicatat</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Pengeluaran bulan ini</p><p className="mt-2 text-xl font-semibold">{formatCurrency(summary.expenseMonth)}</p><p className="mt-1 text-[10px] text-muted">{expenses.length} catatan terbaru</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Arus kas tercatat</p><p className="mt-2 text-xl font-semibold">{formatCurrency(net)}</p><p className="mt-1 text-[10px] text-muted">Pemasukan dikurangi pengeluaran</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Tagihan belum lunas</p><p className="mt-2 text-xl font-semibold">{formatCurrency(summary.outstanding)}</p><p className="mt-1 text-[10px] text-muted">{summary.unpaidCount} pesanan</p></Card>
      </div>
      {databaseEnabled ? (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2"><Plus size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Catat pengeluaran</h2><p className="text-[11px] text-muted">Pengeluaran tersimpan pada cabang yang sedang aktif.</p></div></div>
          <form action={createExpense} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <Input name="description" required minLength={2} maxLength={140} placeholder="Keterangan" aria-label="Keterangan pengeluaran" />
            <Input name="category" required minLength={2} maxLength={80} placeholder="Kategori" aria-label="Kategori pengeluaran" />
            <Input name="amount" required type="number" min="1" step="1" placeholder="Jumlah (Rp)" aria-label="Jumlah pengeluaran" />
            <Select name="method" defaultValue="cash" aria-label="Metode pembayaran"><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="other">Lainnya</option></Select>
            <Input name="date" required type="date" defaultValue={new Date().toISOString().slice(0, 10)} aria-label="Tanggal pengeluaran" />
            <FormSubmitButton variant="primary" pendingText="Menyimpan…"><Plus size={14} /> Simpan</FormSubmitButton>
          </form>
        </Card>
      ) : <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Mode demo: transaksi contoh tidak tersimpan ke Neon.</p>}
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Pengeluaran terbaru</h2><p className="mt-1 text-[11px] text-muted">{databaseEnabled ? "Catatan cabang tersimpan di Neon" : "Data contoh"}</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Keterangan</th><th className="px-3 py-3 font-medium">Kategori</th><th className="px-3 py-3 font-medium">Tanggal</th><th className="px-4 py-3 text-right font-medium">Jumlah</th></tr></thead><tbody>{expenses.map((item) => <tr key={item.id} className="border-t border-border/70"><td className="px-4 py-3"><p className="font-medium">{item.label}</p><p className="mt-0.5 text-[10px] text-muted">{methodLabel[item.method] ?? item.method} · {item.id}</p></td><td className="px-3 py-3 text-muted">{item.category}</td><td className="px-3 py-3 text-muted">{formatShortDate(item.date)}</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.amount)}</td></tr>)}</tbody></table>{expenses.length === 0 && <p className="p-8 text-center text-xs text-muted">Belum ada pengeluaran.</p>}</div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Pembayaran terakhir</h2><p className="mt-1 text-[11px] text-muted">{databaseEnabled ? "Penerimaan tersimpan di Neon" : "Data contoh"}</p></div>
          <div className="divide-y divide-border">{payments.map((payment) => <div key={payment.id} className="flex items-center gap-3 p-3.5"><span className="rounded-lg bg-emerald-300/10 p-2 text-emerald-200"><ArrowDownLeft size={15} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{payment.customerName}</p><p className="mt-0.5 text-[10px] text-muted">{payment.orderId} · {methodLabel[payment.method] ?? payment.method} · {formatShortDate(payment.date)}</p></div><p className="text-xs font-semibold text-emerald-100">+{formatCurrency(payment.amount)}</p></div>)}</div>
          <div className="border-t border-border p-4"><div className="mb-3 flex items-center gap-3"><span className="rounded-lg bg-rose-300/10 p-2 text-rose-200"><ArrowUpRight size={15} /></span><div className="flex-1"><p className="text-xs font-medium">Pengeluaran hari ini</p><p className="mt-0.5 text-[10px] text-muted">{summary.expensesTodayCount} catatan</p></div><p className="text-xs font-semibold text-rose-100">−{formatCurrency(summary.expensesToday)}</p></div><div className="flex justify-between border-t border-border pt-3 text-xs"><span className="text-muted">Kas bersih hari ini</span><strong>{formatCurrency(summary.incomeToday - summary.expensesToday)}</strong></div></div>
        </Card>
      </div>
    </>
  );
}
