"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileWarning, Loader2, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import {
  BACKUP_TABLE_KEYS,
  BACKUP_TABLE_LABELS,
  countBackupRows,
  validateBackup,
  type BranchBackup,
} from "@/lib/backup-format";

const DEMO_LICENSE_KEY = "laundryos.license.v1";

interface StoredDemoLicense {
  payload?: { name: string; email: string | null; expiresAt: string | null };
}

const anchorButtonClass =
  "inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition duration-150 hover:-translate-y-px";

export function BackupCard({ mode, initialProActive }: { mode: "db" | "demo"; initialProActive: boolean }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proActive, setProActive] = useState(initialProActive);
  const [candidate, setCandidate] = useState<BranchBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "demo") return;
    const checkStoredLicense = () => {
      try {
        const raw = window.localStorage.getItem(DEMO_LICENSE_KEY);
        if (!raw) return;
        const stored = JSON.parse(raw) as StoredDemoLicense;
        const today = new Date().toISOString().slice(0, 10);
        if (stored.payload && (!stored.payload.expiresAt || stored.payload.expiresAt >= today)) {
          setProActive(true);
        }
      } catch { /* abaikan data demo yang rusak */ }
    };
    const timer = window.setTimeout(checkStoredLicense, 0);
    window.addEventListener("laundryos:pro-activated", checkStoredLicense);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("laundryos:pro-activated", checkStoredLicense);
    };
  }, [mode]);

  async function handleFile(file: File) {
    setError(null);
    setSuccess(null);
    setCandidate(null);
    setConfirmed(false);
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const validation = validateBackup(parsed);
      if (!validation.ok) {
        setError(validation.error);
        return;
      }
      setCandidate(validation.backup);
    } catch {
      setError("Berkas tidak dapat dibaca sebagai JSON.");
    }
  }

  async function handleRestore() {
    if (!candidate || restoring) return;
    setRestoring(true);
    setError(null);
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: candidate }),
      });
      const result = (await response.json()) as { error?: string; counts?: { total: number }; auditRecorded?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Restore gagal dijalankan.");
      setSuccess(`Restore selesai. ${result.counts?.total ?? 0} baris data cabang berhasil dipulihkan dari backup.${result.auditRecorded === false ? " Catatan aktivitas gagal disimpan." : ""}`);
      setCandidate(null);
      setConfirmed(false);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Restore gagal dijalankan.");
    } finally {
      setRestoring(false);
    }
  }

  if (!proActive) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3.5">
        <span className="rounded-lg bg-accent/10 p-2 text-accent"><Lock size={16} /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Backup & restore adalah fitur LaundryOS Pro</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Unduh salinan seluruh data cabang (pelanggan, layanan, pesanan, riwayat status, pembayaran, pengeluaran, persediaan, dan tutup kasir) sebagai satu berkas JSON, lalu pulihkan kembali bila diperlukan.
          </p>
          <a className={`${anchorButtonClass} mt-3 bg-accent text-accent-foreground hover:brightness-95`} href="#pro">Aktifkan Pro</a>
        </div>
      </div>
    );
  }

  const counts = candidate ? countBackupRows(candidate) : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-foreground">Unduh backup</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Satu berkas JSON berisi seluruh data operasional cabang ini. Simpan di tempat aman — berkas memuat data pelanggan. Lisensi Pro tidak ikut tersimpan di dalam backup.
        </p>
        {mode === "db" ? (
          <a className={`${anchorButtonClass} mt-3 border border-border bg-surface-raised text-foreground hover:bg-surface-hover`} download href="/api/backup/export">
            <Download size={14} /> Unduh backup (.json)
          </a>
        ) : (
          <>
            <Button className="mt-3" disabled type="button">
              <Download size={14} /> Unduh backup (.json)
            </Button>
            <p className="mt-2 text-[11px] text-muted">Backup bekerja pada data asli dalam mode database. Mode demo hanya pratinjau.</p>
          </>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-foreground">Pulihkan dari backup</p>
        <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-muted">
          <FileWarning className="mt-0.5 shrink-0 text-amber-300" size={14} />
          <span>Restore <strong className="font-semibold text-foreground">menggantikan seluruh data cabang saat ini</strong> dengan isi berkas, dan hanya menerima backup dari cabang yang sama. Unduh backup terbaru dulu bila ragu.</span>
        </p>
        <input
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
          ref={fileInputRef}
          type="file"
        />
        <Button className="mt-3" disabled={mode !== "db" || restoring} onClick={() => fileInputRef.current?.click()} type="button">
          <Upload size={14} /> Pilih berkas backup
        </Button>
        {mode === "demo" ? <p className="mt-2 text-[11px] text-muted">Restore dinonaktifkan pada mode demo.</p> : null}

        {candidate && counts ? (
          <div className="mt-4 rounded-lg border border-border bg-surface-hover/40 p-3.5">
            <p className="text-xs leading-5 text-foreground">
              Berkas <span className="font-semibold">{fileName}</span> — cabang <span className="font-semibold">{candidate.branch.name}</span>, dibuat {formatShortDate(candidate.exportedAt.slice(0, 10))}.
            </p>
            <ul className="mt-3 grid gap-1.5 text-xs text-muted sm:grid-cols-2">
              {BACKUP_TABLE_KEYS.map((key) => (
                <li className="flex items-center justify-between gap-3" key={key}>
                  <span>{BACKUP_TABLE_LABELS[key]}</span>
                  <span className="font-semibold text-foreground">{counts[key]} baris</span>
                </li>
              ))}
            </ul>
            <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-foreground">
              <input checked={confirmed} className="mt-0.5" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
              Saya paham data cabang saat ini akan digantikan oleh isi backup ini.
            </label>
            <Button className="mt-3" disabled={!confirmed || restoring} onClick={() => void handleRestore()} type="button" variant="primary">
              {restoring ? <Loader2 className="animate-spin" size={14} /> : null}
              {restoring ? "Memulihkan…" : "Pulihkan sekarang"}
            </Button>
          </div>
        ) : null}

        {error ? <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger" role="alert">{error}</p> : null}
        {success ? <p className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-300/5 px-3 py-2.5 text-xs leading-5 text-emerald-100" role="status">{success}</p> : null}
      </div>
    </div>
  );
}
