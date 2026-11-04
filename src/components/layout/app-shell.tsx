"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Building2, ExternalLink, Heart, LogOut, Menu, Plus, Search, Shirt, X } from "lucide-react";
import { navigation } from "@/components/layout/navigation";
import { APP_VERSION_LABEL } from "@/lib/app-info";
import { cn } from "@/lib/utils";
import type { AuthRole } from "@/server/modules/auth/auth.repository";
import { hasPermission } from "@/server/modules/auth/permissions";
import type { AccessibleBranch } from "@/server/modules/auth/auth.repository";

function Sidebar({ onNavigate, user }: { onNavigate?: () => void; user: { fullName: string; email: string; branchName: string; role: AuthRole; isDemo?: boolean } }) {
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
        {navigation.filter((item) => !item.permission || hasPermission(user.role, item.permission)).map(({ href, label, icon: Icon, dot }) => {
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
              {dot && <span className="size-1.5 rounded-full bg-amber-300" />}
            </Link>
          );
        })}
      </nav>

      <a href="https://trakteer.id/bali_techsolution" target="_blank" rel="noopener noreferrer" className="mb-3 flex items-center gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5 text-xs font-medium text-foreground transition hover:-translate-y-px hover:bg-accent/10">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><Heart size={14} /></span>
        <span className="min-w-0 flex-1"><span className="block">Dukung pengembangan</span><span className="mt-0.5 block text-[10px] text-muted">Trakteer</span></span>
        <ExternalLink size={13} className="text-muted" />
      </a>
      <div className="mt-auto rounded-xl border border-border bg-surface px-3.5 py-3">
        <div className="mb-1 text-xs font-semibold">{user.isDemo ? "Mode demo" : user.role === "owner" ? "Akun pemilik" : user.role === "cashier" ? "Akun kasir" : "Akun operator"}</div>
        <p className="truncate text-[11px] leading-5 text-muted">{user.isDemo ? "Pesanan contoh disimpan di browser ini." : user.email}</p>
        <p className="truncate text-[11px] text-muted">{user.branchName}</p>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border/70 pt-2.5">
          <span className="text-[11px] text-muted">Versi sistem</span>
          <span className="rounded-md bg-surface-hover px-2 py-1 text-[11px] font-semibold text-accent">{APP_VERSION_LABEL}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-[#314036] text-xs font-bold text-accent">{user.fullName.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.fullName}</p><p className="truncate text-[10px] text-muted">{user.isDemo ? "Demo" : user.role === "owner" ? "Pemilik" : user.role === "cashier" ? "Kasir" : "Operator"}</p></div>
      </div>
    </aside>
  );
}

export function AppShell({ children, user, branches = [], activeBranchId }: { children: React.ReactNode; user: { fullName: string; email: string; branchName: string; role: AuthRole; isDemo?: boolean }; branches?: AccessibleBranch[]; activeBranchId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchSwitching, setBranchSwitching] = useState(false);
  const [branchError, setBranchError] = useState("");

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/login");
  }

  async function switchBranch(branchId: string) {
    if (!branchId || branchId === activeBranchId || branchSwitching) return;
    setBranchSwitching(true);
    setBranchError("");
    try {
      const response = await fetch("/api/auth/branch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Cabang gagal diganti.");
      router.refresh();
    } catch (error) {
      setBranchError(error instanceof Error ? error.message : "Cabang gagal diganti.");
    } finally {
      setBranchSwitching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block"><Sidebar user={user} /></div>
      {mobileOpen && <button type="button" aria-label="Tutup navigasi" className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className={cn("fixed inset-y-0 left-0 z-50 transition-transform lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="relative h-full"><Sidebar user={user} onNavigate={() => setMobileOpen(false)} /><button onClick={() => setMobileOpen(false)} aria-label="Tutup menu" className="absolute right-2 top-3 rounded-md p-2 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
      </div>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[60px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6 xl:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} aria-label="Buka menu" className="rounded-lg p-2 text-muted hover:bg-surface-hover lg:hidden"><Menu size={18} /></button>
            <div className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-3 md:flex">
              <Search size={15} className="text-muted" /><input aria-label="Pencarian global" disabled placeholder="Pencarian global segera tersedia" className="w-full bg-transparent text-xs outline-none placeholder:text-muted disabled:cursor-not-allowed" />
            </div>
            <span className="text-xs text-muted md:hidden">LaundryOS <span className="mx-1">/</span> <span className="text-foreground">{user.branchName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {branches.length > 1 && <label className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-muted"><Building2 size={14} /><span className="sr-only">Cabang aktif</span><select aria-label="Pilih cabang aktif" value={activeBranchId} disabled={branchSwitching} onChange={(event) => void switchBranch(event.target.value)} className="max-w-32 bg-transparent text-xs text-foreground outline-none disabled:opacity-60 sm:max-w-44">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
            {hasPermission(user.role, "orders:create") && <Link href="/orders" className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-foreground transition hover:brightness-95"><Plus size={14} /> <span className="hidden sm:inline">Pesanan baru</span></Link>}
            <button type="button" aria-label="Notifikasi (segera tersedia)" disabled className="relative rounded-lg border border-border bg-surface p-2 text-muted opacity-55"><Bell size={15} /></button>
            <div className="ml-1 hidden items-center gap-2 border-l border-border pl-3 sm:flex"><div className="flex size-7 items-center justify-center rounded-full bg-[#314036] text-[10px] font-semibold text-accent">{user.fullName.slice(0, 1).toUpperCase()}</div><span className="max-w-36 truncate text-xs font-medium">{user.fullName}</span></div>
            {!user.isDemo && <button type="button" onClick={signOut} aria-label="Keluar dari LaundryOS" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-xs text-muted hover:text-foreground"><LogOut size={14} /><span className="hidden sm:inline">Keluar</span></button>}
          </div>
        </header>
        {branchError && <p role="alert" className="px-4 pt-2 text-right text-xs text-danger sm:px-6 xl:px-8">{branchError}</p>}
        <main className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 xl:px-8"><div key={pathname} className="page-motion">{children}</div></main>
        <footer className="px-6 pb-5 text-center text-[10px] text-muted/70">LaundryOS {APP_VERSION_LABEL} · Demo operasional · © 2026</footer>
      </div>
    </div>
  );
}
