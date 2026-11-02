"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { createOrderSchema, orderStatusLabels, orderStatuses, type CreateOrderInput, type LaundryOrder, type OrderStatus } from "@/features/orders/domain/order";
import { serviceCatalog } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";

const storageKey = "laundryos:orders:v1";
const filters = ["Semua", "Diterima", "Dicuci", "Dikeringkan", "Disetrika", "Siap diambil", "Selesai"];

export function OrdersView({ initialOrders }: { initialOrders: LaundryOrder[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try { setOrders(JSON.parse(saved) as LaundryOrder[]); } catch { window.localStorage.removeItem(storageKey); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKey, JSON.stringify(orders));
  }, [orders, ready]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesQuery = `${order.id} ${order.customerName} ${order.customerPhone}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = activeFilter === "Semua" || orderStatusLabels[order.status] === activeFilter;
    return matchesQuery && matchesFilter;
  }), [orders, query, activeFilter]);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CreateOrderInput = {
      customerName: String(form.get("customerName") ?? ""),
      customerPhone: String(form.get("customerPhone") ?? ""),
      serviceName: String(form.get("serviceName") ?? ""),
      weightKg: Number(form.get("weightKg")),
      dueAt: String(form.get("dueAt") ?? ""),
    };
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Periksa kembali data pesanan.");
      return;
    }
    const service = serviceCatalog.find((item) => item.name === parsed.data.serviceName);
    if (!service) { setError("Layanan yang dipilih tidak ditemukan."); return; }
    const newOrder: LaundryOrder = {
      id: `LND-${String(Date.now()).slice(-5)}`,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      serviceName: service.name,
      weightKg: parsed.data.weightKg,
      amount: Math.round(parsed.data.weightKg * service.price),
      paidAmount: 0,
      paymentStatus: "unpaid",
      status: "received",
      receivedAt: new Date().toISOString(),
      dueAt: new Date(`${parsed.data.dueAt}T18:00:00`).toISOString(),
    };
    setOrders((current) => [newOrder, ...current]);
    setDialogOpen(false);
    setError("");
    event.currentTarget.reset();
  }

  function advanceOrder(orderId: string, currentStatus: OrderStatus) {
    const currentIndex = orderStatuses.indexOf(currentStatus);
    const nextStatus = orderStatuses[currentIndex + 1];
    if (!nextStatus) return;
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: nextStatus } : order));
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">{filters.map((filter) => <button key={filter} onClick={() => setActiveFilter(filter)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeFilter === filter ? "bg-accent text-accent-foreground" : "bg-surface text-muted hover:bg-surface-hover hover:text-foreground"}`}>{filter}</button>)}</div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1 lg:flex-none"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nomor atau pelanggan" className="pl-9" /></div>
          <Button variant="secondary" disabled title="Filter lanjutan segera tersedia" className="h-9 px-2.5 text-xs"><SlidersHorizontal size={14} /> <span className="hidden sm:inline">Filter</span></Button>
          <Button variant="secondary" disabled title="Ekspor tersedia setelah backend tersambung" className="h-9 px-2.5 text-xs"><Download size={14} /> <span className="hidden sm:inline">Ekspor</span></Button>
          <Button variant="primary" onClick={() => setDialogOpen(true)}><Plus size={14} /> Pesanan baru</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="text-sm font-semibold">Daftar pesanan</p><p className="mt-0.5 text-[11px] text-muted">{visibleOrders.length} pesanan ditampilkan</p></div><span className="text-[11px] text-muted">Terakhir diperbarui hari ini</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Pesanan / pelanggan</th><th className="px-3 py-3 font-medium">Layanan</th><th className="px-3 py-3 font-medium">Berat</th><th className="px-3 py-3 font-medium">Jatuh tempo</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Pembayaran</th><th className="px-4 py-3 text-right font-medium">Total</th><th className="w-32 px-4 py-3 text-right font-medium">Aksi</th></tr></thead>
            <tbody>{visibleOrders.map((order) => <tr key={order.id} className="border-t border-border/70 transition hover:bg-surface-raised/50"><td className="px-4 py-3"><p className="font-semibold">{order.id}</p><p className="mt-1 text-[10px] text-muted">{order.customerName} · {order.customerPhone}</p></td><td className="px-3 py-3 text-muted">{order.serviceName}</td><td className="px-3 py-3">{order.weightKg} kg</td><td className="px-3 py-3 text-muted">{formatShortDate(order.dueAt)}</td><td className="px-3 py-3"><OrderStatusBadge status={order.status} /></td><td className="px-3 py-3"><PaymentStatusBadge status={order.paymentStatus} /></td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.amount)}</td><td className="px-4 py-3 text-right">{order.status !== "completed" ? <button onClick={() => advanceOrder(order.id, order.status)} className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted hover:border-accent/50 hover:text-accent">Lanjut proses</button> : <span className="text-[10px] text-muted">Selesai</span>}</td></tr>)}</tbody>
          </table>
          {visibleOrders.length === 0 && <div className="p-12 text-center"><p className="text-sm font-medium">Pesanan tidak ditemukan</p><p className="mt-1 text-xs text-muted">Ubah kata kunci atau filter status.</p></div>}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-muted"><span>Menampilkan {visibleOrders.length} dari {orders.length} pesanan</span><span className="text-[10px]">Data demo</span></div>
      </Card>

      {dialogOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/65" onClick={() => setDialogOpen(false)} />
        <div role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Transaksi baru</p><h2 id="new-order-title" className="mt-1 text-lg font-semibold">Buat pesanan</h2><p className="mt-1 text-xs text-muted">Isi data pelanggan dan layanan laundry.</p></div><button onClick={() => setDialogOpen(false)} aria-label="Tutup dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block text-xs font-medium">Nama pelanggan<Input name="customerName" required minLength={2} placeholder="Contoh: Made Arya" className="mt-1.5" /></label>
            <label className="block text-xs font-medium">Nomor telepon<Input name="customerPhone" required placeholder="08xx xxxx xxxx" className="mt-1.5" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium">Layanan<Select name="serviceName" required className="mt-1.5"><option value="">Pilih layanan</option>{serviceCatalog.filter((service) => service.unit === "kg").map((service) => <option key={service.id} value={service.name}>{service.name} · {formatCurrency(service.price)}/{service.unit}</option>)}</Select></label><label className="block text-xs font-medium">Berat (kg)<Input name="weightKg" required type="number" min="0.1" step="0.1" placeholder="3.5" className="mt-1.5" /></label></div>
            <label className="block text-xs font-medium">Target selesai<Input name="dueAt" required type="date" className="mt-1.5" /></label>
            {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit" variant="primary">Simpan pesanan</Button></div>
          </form>
        </div>
      </div>}
    </>
  );
}
