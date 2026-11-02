"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, ChevronDown, Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { navigation } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-[#141715] px-3 py-4">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2" onClick={onNavigate}>
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Shirt size={18} strokeWidth={2.4} /></span>
        <span className="min-w-0">
          <span className="block text-sm font-bold tracking-wide">LaundryOS</span>
          <span className="block text-[11px] text-muted">Operasional lebih rapi</span>
        </span>
      </Link>

      <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Menu utama</div>
      <nav className="space-y-1" aria-label="Navigasi utama">
        {navigation.map(({ href, label, icon: Icon, count, dot }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition",
                active ? "bg-surface-hover text-foreground" : "text-muted hover:bg-surface-hover/70 hover:text-foreground",
              )}
            >
              <Icon size={16} strokeWidth={1.8} className={active ? "text-accent" : "text-muted group-hover:text-foreground"} />
              <span className="flex-1">{label}</span>
              {count && <span className="rounded-md bg-surface-hover px-1.5 py-0.5 text-[10px] text-muted">{count}</span>}
              {dot && <span className="size-1.5 rounded-full bg-amber-300" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-border bg-surface px-3.5 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Sparkles size={14} className="text-accent" /> Mode demo</div>
        <p className="mb-3 text-[11px] leading-5 text-muted">Pesanan contoh disimpan di browser ini.</p>
        <Link className="text-xs font-semibold text-accent hover:underline" href="/settings">Lihat status aplikasi <span aria-hidden="true">→</span></Link>
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-surface-hover">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#314036] text-xs font-bold text-accent">LD</div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">Laundry Demo</p><p className="truncate text-[10px] text-muted">Cabang Bangli</p></div>
        <ChevronDown size={14} className="text-muted" />
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar /></div>
      {mobileOpen && <button type="button" aria-label="Tutup navigasi" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className={cn("fixed inset-y-0 left-0 z-50 transition-transform lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="relative h-full"><Sidebar onNavigate={() => setMobileOpen(false)} /><button onClick={() => setMobileOpen(false)} aria-label="Tutup menu" className="absolute right-2 top-3 rounded-md p-2 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
      </div>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6 xl:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} aria-label="Buka menu" className="rounded-lg p-2 text-muted hover:bg-surface-hover lg:hidden"><Menu size={18} /></button>
            <div className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-3 md:flex">
              <Search size={15} className="text-muted" /><input aria-label="Pencarian global" disabled placeholder="Pencarian global segera tersedia" className="w-full bg-transparent text-xs outline-none placeholder:text-muted disabled:cursor-not-allowed" />
            </div>
            <span className="text-xs text-muted md:hidden">LaundryOS <span className="mx-1">/</span> <span className="text-foreground">Bangli</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-foreground transition hover:brightness-95"><Plus size={14} /> <span className="hidden sm:inline">Pesanan baru</span></Link>
            <button type="button" aria-label="Notifikasi (segera tersedia)" disabled className="relative rounded-lg border border-border bg-surface p-2 text-muted opacity-55"><Bell size={15} /></button>
            <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 sm:flex"><div className="size-7 rounded-full bg-[#314036]" /><span className="text-xs font-medium">Admin</span></div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 xl:px-8">{children}</main>
        <footer className="px-6 pb-5 text-center text-[10px] text-muted/70">LaundryOS · Demo operasional · © 2026</footer>
      </div>
    </div>
  );
}
