"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, MessageCircle, PackageSearch, Search, Shirt } from "lucide-react";

import { OrderStatusBadge } from "@/components/ui/status-badge";
import { orderStatusLabels, type OrderStatus } from "@/features/orders/domain/order";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { toWhatsAppNumber } from "@/lib/phone";
import { cn } from "@/lib/utils";

interface TrackedOrderView {
  code: string;
  customerName: string;
  serviceName: string;
  weightKg: number;
  status: OrderStatus;
  paymentStatus: "paid" | "partial" | "unpaid";
  amount: number;
  paidAmount: number;
  remaining: number;
  receivedAt: string;
  dueDate: string;
  branchName: string;
  branchPhone: string | null;
  branchTimezone: string;
  history: { status: OrderStatus; changedAt: string }[];
  demo: boolean;
}

const STATUS_FLOW: OrderStatus[] = ["received", "washing", "drying", "ironing", "ready", "completed"];

const fieldClass =
  "mt-1.5 block h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone,
  }).format(new Date(iso));
}

export function TrackForm() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrderView | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const data = (await response.json()) as { order?: TrackedOrderView; error?: string };
      if (!response.ok || !data.order) {
        setError(data.error ?? "Pesanan tidak ditemukan.");
      } else {
        setOrder(data.order);
      }
    } catch {
      setError("Koneksi bermasalah. Periksa internet Anda lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const currentStep = order ? STATUS_FLOW.indexOf(order.status) : -1;
  const firstName = order ? order.customerName.split(" ")[0] : "";

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-10">
      <Link href="/lacak" className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Shirt size={19} strokeWidth={2.4} /></span>
        <span className="text-left">
          <span className="block text-base font-bold tracking-wide text-foreground">LaundryOS</span>
          <span className="block text-[11px] text-muted">Lacak status cucian Anda</span>
        </span>
      </Link>

      <section className="mt-8 w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-label="Formulir lacak pesanan">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground"><PackageSearch size={19} className="text-accent" /> Lacak Pesanan</h1>
        <p className="mt-1 text-xs leading-5 text-muted">Masukkan kode pesanan dari struk dan nomor HP yang didaftarkan saat pemesanan.</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3.5">
          <label className="block text-xs font-medium text-foreground">
            Kode pesanan
            <input className={fieldClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Contoh: LND-24018" autoComplete="off" maxLength={40} required />
          </label>
          <label className="block text-xs font-medium text-foreground">
            Nomor HP terdaftar
            <input className={fieldClass} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contoh: 0812 3456 7890" type="tel" autoComplete="tel" maxLength={20} required />
          </label>
          {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">{error}</p>}
          <button type="submit" disabled={busy} aria-busy={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
            <Search size={16} />{busy ? "Mencari..." : "Lacak pesanan"}
          </button>
        </form>
      </section>

      {order && (
        <section className="mt-4 w-full max-w-md rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-label="Hasil pelacakan">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted">Pesanan {order.code}</p>
              <h2 className="mt-1 text-base font-semibold leading-6 text-foreground">Halo, {firstName}</h2>
              <p className="text-xs text-muted">{order.branchName}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <ol className="mt-5 grid grid-cols-6 gap-1" aria-label="Tahap pengerjaan">
            {STATUS_FLOW.map((status, index) => {
              const done = index < currentStep;
              const current = index === currentStep;
              return (
                <li key={status} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                  <span className={cn("flex size-6 items-center justify-center rounded-full border text-[10px] font-semibold", done || current ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface-raised text-muted")}>
                    {done ? <Check size={12} /> : index + 1}
                  </span>
                  <span className={cn("w-full break-words text-[9px] leading-3", current ? "font-semibold text-foreground" : "text-muted")}>{orderStatusLabels[status]}</span>
                </li>
              );
            })}
          </ol>

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Layanan</dt><dd className="text-right font-medium">{order.serviceName} · {order.weightKg} kg</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Diterima</dt><dd className="text-right font-medium">{formatDateTime(order.receivedAt, order.branchTimezone)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Estimasi selesai</dt><dd className="text-right font-medium">{formatShortDate(order.dueDate + "T12:00:00.000Z")}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Total</dt><dd className="text-right font-medium">{formatCurrency(order.amount)}</dd></div>
            <div className="flex items-center justify-between gap-3"><dt className="text-muted">Sudah dibayar</dt><dd className="text-right font-medium">{formatCurrency(order.paidAmount)}</dd></div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">Sisa tagihan</dt>
              <dd className={cn("text-right font-semibold", order.remaining > 0 ? "text-amber-200" : "text-emerald-200")}>{order.remaining > 0 ? formatCurrency(order.remaining) : "Lunas"}</dd>
            </div>
          </dl>
          {order.remaining > 0 && <p className="mt-3 rounded-lg bg-amber-300/5 px-3 py-2 text-[11px] leading-5 text-amber-100">Siapkan pembayaran {formatCurrency(order.remaining)} saat pengambilan, atau hubungi cabang untuk opsi pembayaran lebih awal.</p>}

          {order.history.length > 0 && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-foreground">Riwayat status</h3>
              <ol className="mt-3 space-y-3">
                {[...order.history].reverse().map((entry, index) => (
                  <li key={`${entry.status}-${entry.changedAt}-${index}`} className="flex gap-3">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", index === 0 ? "bg-accent" : "bg-border")} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{orderStatusLabels[entry.status]}</p>
                      <p className="text-[11px] text-muted">{formatDateTime(entry.changedAt, order.branchTimezone)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {order.branchPhone && (
            <a href={`https://wa.me/${toWhatsAppNumber(order.branchPhone)}?text=${encodeURIComponent(`Halo ${order.branchName}, saya mau bertanya tentang pesanan ${order.code}.`)}`} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 text-sm font-semibold text-accent transition hover:bg-accent/15">
              <MessageCircle size={16} /> Hubungi {order.branchName}
            </a>
          )}
          {order.demo && <p className="mt-3 text-center text-[10px] text-muted">Hasil dari data contoh (mode demo).</p>}
        </section>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Pemilik atau staf laundry?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">Masuk ke LaundryOS</Link>
      </p>
    </main>
  );
}
