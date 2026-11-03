"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { analyzeCustomerCsv, type CustomerImportReport } from "@/lib/customer-import";
import { normalizePhoneNumber } from "@/lib/phone";

interface ImportCardProps {
  mode: "db" | "demo";
  demoPhones: string[];
}

const TEMPLATE_CSV = "nama,no_hp\nNi Made Ayu Lestari,081234567890\nI Wayan Sudirta,085738123456\n";

export function ImportCard({ mode, demoPhones }: ImportCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CustomerImportReport | null>(null);

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "contoh-impor-pelanggan.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setError(null);
    setReport(null);
    if (file.size > 512_000) {
      setFileName(null);
      setCsvText(null);
      setError("Ukuran berkas melebihi 512 KB. Bagi berkas menjadi beberapa bagian lalu impor bergantian.");
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    setCsvText(text);
  }

  function runDemoImport(text: string) {
    const analysis = analyzeCustomerCsv(text);
    if (analysis.fatalError) {
      setError(analysis.fatalError);
      return;
    }
    const existing = new Set(demoPhones.map((phone) => normalizePhoneNumber(phone)));
    const fresh = analysis.valid.filter((candidate) => !existing.has(candidate.phone));
    setReport({
      totalRows: analysis.totalRows,
      inserted: fresh.length,
      alreadyRegistered: analysis.valid.length - fresh.length,
      duplicateInFile: analysis.duplicateInFile,
      errors: analysis.errors,
    });
  }

  async function handleImport() {
    if (!csvText || busy) return;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      if (mode === "demo") {
        runDemoImport(csvText);
        return;
      }
      const response = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const data = (await response.json()) as { report?: CustomerImportReport; error?: string };
      if (!response.ok || !data.report) {
        setError(data.error ?? "Impor gagal diproses.");
        return;
      }
      setReport(data.report);
      if (data.report.inserted > 0) router.refresh();
    } catch {
      setError("Koneksi bermasalah. Periksa internet Anda lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileUp size={16} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Impor pelanggan dari CSV</h2>
          <p className="text-[11px] text-muted">Pindahkan daftar pelanggan lama sekaligus. Kolom wajib: <strong>nama</strong> dan <strong>no_hp</strong>. Nomor yang sudah terdaftar dilewati (tidak diubah), duplikat di dalam berkas hanya diambil yang pertama. Maksimum 1.000 baris sekali impor.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" aria-label="Pilih berkas CSV pelanggan" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = ""; }} />
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}><Upload size={14} /> Pilih berkas CSV</Button>
        <Button type="button" variant="secondary" onClick={downloadTemplate}><Download size={14} /> Unduh contoh format</Button>
        <Button type="button" variant="primary" onClick={() => void handleImport()} disabled={!csvText || busy}>{busy ? "Mengimpor…" : "Impor sekarang"}</Button>
        {fileName && <span className="min-w-0 truncate text-xs text-muted">{fileName}</span>}
      </div>
      {mode === "demo" && <p className="mt-2 text-[11px] text-muted">Mode demo: impor disimulasikan dengan aturan yang sama, data tidak tersimpan.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">{error}</p>}
      {report && (
        <div className="mt-3 rounded-lg border border-border bg-surface-raised/50 p-3" role="status">
          <p className="text-xs font-semibold">Hasil impor{mode === "demo" ? " (simulasi)" : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-md bg-surface-hover px-2 py-1">Total baris: <strong>{report.totalRows}</strong></span>
            <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-emerald-200">Ditambahkan: <strong>{report.inserted}</strong></span>
            <span className="rounded-md bg-surface-hover px-2 py-1">Sudah terdaftar: <strong>{report.alreadyRegistered}</strong></span>
            <span className="rounded-md bg-surface-hover px-2 py-1">Duplikat di berkas: <strong>{report.duplicateInFile}</strong></span>
            <span className="rounded-md bg-rose-300/10 px-2 py-1 text-rose-200">Tidak valid: <strong>{report.errors.length}</strong></span>
          </div>
          {report.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11px] leading-5 text-muted">
              {report.errors.slice(0, 10).map((item) => (
                <li key={item.row}>Baris {item.row}: {item.message}</li>
              ))}
              {report.errors.length > 10 && <li>…dan {report.errors.length - 10} baris tidak valid lainnya.</li>}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
