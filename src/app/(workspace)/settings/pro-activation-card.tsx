"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Crown, ExternalLink, KeyRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/format";
import { PRO_FEATURES, TRAKTEER_SUPPORT_URL, type LicenseStatusView } from "@/lib/pro-features";

interface ProActivationCardProps {
  mode: "db" | "demo";
  initialStatus: LicenseStatusView;
  activateAction?: (licenseKey: string) => Promise<LicenseStatusView>;
}

const DEMO_LICENSE_KEY = "laundryos.license.v1";

interface StoredDemoLicense {
  payload: { name: string; email: string | null; expiresAt: string | null };
}

export function ProActivationCard({ mode, initialStatus, activateAction }: ProActivationCardProps) {
  const [status, setStatus] = useState<LicenseStatusView>(initialStatus);
  const [licenseKey, setLicenseKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DEMO_LICENSE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as StoredDemoLicense;
        const today = new Date().toISOString().slice(0, 10);
        if (stored.payload && (!stored.payload.expiresAt || stored.payload.expiresAt >= today)) {
          setStatus({ active: true, holderName: stored.payload.name, holderEmail: stored.payload.email, expiresAt: stored.payload.expiresAt });
        }
      } catch { /* abaikan data demo yang rusak */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode]);

  async function handleActivate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = licenseKey.trim();
    if (!key || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "db" && activateAction) {
        const next = await activateAction(key);
        setStatus(next);
        setLicenseKey("");
      } else {
        const response = await fetch("/api/license/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });
        const data = (await response.json()) as { valid?: boolean; reason?: string; payload?: StoredDemoLicense["payload"] };
        if (!response.ok || !data.valid || !data.payload) {
          setError(data.reason ?? "Kode aktivasi tidak valid.");
          return;
        }
        try {
          window.localStorage.setItem(DEMO_LICENSE_KEY, JSON.stringify({ key, payload: data.payload }));
          window.dispatchEvent(new Event("laundryos:pro-activated"));
        } catch { /* penyimpanan tidak tersedia */ }
        setStatus({ active: true, holderName: data.payload.name, holderEmail: data.payload.email, expiresAt: data.payload.expiresAt });
        setLicenseKey("");
      }
    } catch (activateError) {
      setError(activateError instanceof Error ? activateError.message : "Aktivasi gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (status.active) {
    return (
      <div>
        <div className="flex items-start gap-3 rounded-lg border border-emerald-300/25 bg-emerald-300/5 p-3.5">
          <span className="rounded-lg bg-emerald-300/10 p-2 text-emerald-200"><BadgeCheck size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-100">LaundryOS Pro aktif</p>
            <p className="mt-0.5 text-[11px] leading-5 text-muted">
              Atas nama <span className="font-medium text-foreground">{status.holderName}</span>
              {status.holderEmail ? ` · ${status.holderEmail}` : ""} ·{" "}
              {status.expiresAt ? `berlaku sampai ${formatShortDate(status.expiresAt)}` : "berlaku selamanya"}
            </p>
          </div>
          <span className="rounded-md bg-accent px-2 py-1 text-[10px] font-bold text-accent-foreground">PRO</span>
        </div>
        <ul className="mt-3 space-y-1.5">
          {PRO_FEATURES.map((feature) => (
            <li key={feature.key} className="flex items-center gap-2 text-xs text-muted"><BadgeCheck size={13} className="shrink-0 text-emerald-300" /> {feature.label} — terbuka</li>
          ))}
        </ul>
        {mode === "demo" && <p className="mt-2 text-[11px] text-muted">Mode demo: status Pro tersimpan di browser ini.</p>}
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-2.5">
        {PRO_FEATURES.map((feature) => (
          <li key={feature.key} className="flex items-start gap-2.5 text-xs">
            <Lock size={13} className="mt-0.5 shrink-0 text-amber-300" />
            <span><span className="font-medium">{feature.label}</span><span className="block text-[11px] leading-5 text-muted">{feature.description}</span></span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-5 text-muted">
        Cara mengaktifkan: dukung Bali Tech Solution lewat Trakteer, lalu Anda menerima kode aktivasi. Tempel kode itu di sini dan fitur Pro langsung terbuka.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={TRAKTEER_SUPPORT_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-foreground transition hover:brightness-105">
          <Crown size={14} /> Dukung di Trakteer <ExternalLink size={12} />
        </a>
      </div>
      <form onSubmit={(event) => void handleActivate(event)} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input name="licenseKey" value={licenseKey} onChange={(event) => setLicenseKey(event.target.value)} placeholder="Tempel kode aktivasi (LOS1.…)" aria-label="Kode aktivasi LaundryOS Pro" autoComplete="off" spellCheck={false} />
        <Button type="submit" variant="primary" disabled={busy || !licenseKey.trim()}>{busy ? "Memeriksa…" : <><KeyRound size={14} /> Aktifkan Pro</>}</Button>
      </form>
      {error && <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">{error}</p>}
      {mode === "demo" && <p className="mt-2 text-[11px] text-muted">Mode demo: kode diverifikasi oleh server, status tersimpan di browser ini.</p>}
    </div>
  );
}
