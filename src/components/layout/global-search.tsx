"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { orderStatusLabels, type OrderStatus } from "@/features/orders/domain/order";

type WorkspaceSearchResults = {
  orders: Array<{ id: string; customerName: string; serviceName: string; status: OrderStatus }>;
  customers: Array<{ id: string; name: string; phone: string }>;
};

export function GlobalSearch() {
  const router = useRouter();
  const resultRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkspaceSearchResults>({ orders: [], customers: [] });
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const result = await response.json() as WorkspaceSearchResults & { error?: string };
        if (!response.ok || !Array.isArray(result.orders) || !Array.isArray(result.customers)) {
          throw new Error(result.error ?? "Pencarian gagal dimuat.");
        }
        setResults({ orders: result.orders, customers: result.customers });
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Pencarian gagal dimuat.");
        setResults({ orders: [], customers: [] });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = resultRef.current?.querySelector<HTMLAnchorElement>("a[href]");
    if (firstResult) router.push(firstResult.getAttribute("href") ?? firstResult.href);
    else if (query.trim()) router.push(`/orders?search=${encodeURIComponent(query.trim())}`);
    setOpen(false);
    setMobileOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setMobileOpen(false); }
    if (event.key === "ArrowDown" && open) {
      event.preventDefault();
      resultRef.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    }
  }

  const hasResults = results.orders.length > 0 || results.customers.length > 0;

  function updateQuery(value: string) {
    setQuery(value);
    setOpen(true);
    if (value.trim().length < 2) {
      setResults({ orders: [], customers: [] });
      setLoading(false);
      setError("");
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Buka pencarian pesanan dan pelanggan" aria-expanded={mobileOpen} className="flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted transition hover:text-accent md:hidden"><Search size={15} /></button>
      <form role="search" onSubmit={handleSubmit} className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15 md:flex">
        <Search size={15} aria-hidden="true" className="shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          aria-label="Cari pesanan atau pelanggan"
          aria-controls="workspace-search-results"
          placeholder="Cari pesanan atau pelanggan"
          autoComplete="off"
          maxLength={80}
          className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted"
        />
        <kbd className="hidden shrink-0 rounded border border-border px-1 text-[9px] text-muted lg:inline">↵</kbd>
      </form>

      {mobileOpen && <form role="search" onSubmit={handleSubmit} className="fixed left-3 right-3 top-[68px] z-50 flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-3 shadow-xl md:hidden">
        <Search size={15} aria-hidden="true" className="shrink-0 text-muted" />
        <input type="search" value={query} onChange={(event) => updateQuery(event.target.value)} onFocus={() => { if (query.trim()) setOpen(true); }} onKeyDown={handleKeyDown} aria-label="Cari pesanan atau pelanggan" aria-controls="workspace-search-results" placeholder="Cari pesanan atau pelanggan" autoComplete="off" maxLength={80} className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted" />
        <button type="button" onClick={() => { setMobileOpen(false); setOpen(false); }} aria-label="Tutup pencarian" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={15} /></button>
      </form>}

      {open && query.trim().length >= 2 && <div ref={resultRef} id="workspace-search-results" role="region" aria-label="Hasil pencarian" className={`${mobileOpen ? "fixed left-3 right-3 top-[116px] md:hidden" : "absolute left-0 top-11 hidden w-[min(360px,calc(100vw-2rem))] md:block"} z-50 max-h-[min(60vh,420px)] overflow-y-auto rounded-xl border border-border bg-surface shadow-xl`}>
        {loading ? <p role="status" className="px-3 py-3 text-xs text-muted">Mencari…</p>
          : error ? <p role="alert" className="px-3 py-3 text-xs text-danger">{error}</p>
            : !hasResults ? <p className="px-3 py-3 text-xs text-muted">Tidak ada pesanan atau pelanggan yang cocok.</p>
              : <div className="max-h-[min(60vh,420px)] overflow-y-auto py-1">
                {results.orders.length > 0 && <section aria-label="Pesanan">
                  <h2 className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Pesanan</h2>
                  {results.orders.map((order) => <Link key={order.id} href={`/orders?search=${encodeURIComponent(order.id)}`} onClick={() => { setOpen(false); setMobileOpen(false); }} className="block px-3 py-2 transition hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none">
                    <span className="block text-xs font-semibold">{order.id} · {order.customerName}</span>
          <span className="mt-0.5 block text-[10px] text-muted">{order.serviceName} · {orderStatusLabels[order.status]}</span>
                  </Link>)}
                </section>}
                {results.customers.length > 0 && <section aria-label="Pelanggan">
                  <h2 className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Pelanggan</h2>
                  {results.customers.map((customer) => <Link key={customer.id} href={`/customers?q=${encodeURIComponent(customer.name)}`} onClick={() => { setOpen(false); setMobileOpen(false); }} className="block px-3 py-2 transition hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-none">
                    <span className="block text-xs font-semibold">{customer.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">{customer.phone}</span>
                  </Link>)}
                </section>}
              </div>}
        <p aria-live="polite" className="border-t border-border px-3 py-2 text-[10px] text-muted">Maksimal 5 hasil per jenis · Enter untuk membuka hasil pertama</p>
      </div>}
    </div>
  );
}
