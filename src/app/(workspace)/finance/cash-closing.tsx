"use client";

import { useEffect, useState } from "react";
import { Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatShortDate } from "@/lib/format";

export interface CashClosingView {
  date: string;
  expectedAmount: number;
  countedAmount: number;
  note: string | null;
}

interface CashClosingCardProps {
  mode: "db" | "demo";
  today: string;
  cashIn: number;
  cashOut: number;
  expected: number;
  todayClosing: CashClosingView | null;
  history: CashClosingView[];
  saveAction?: (formData: FormData) => Promise<void>;
}

const DEMO_STORAGE_KEY = "laundryos.cashClosings.v1";

type DemoStore = Record<string, { countedAmount: number; expectedAmount: number; note: string | null }>;

function differenceBadge(difference: number) {
  if (difference === 0) return <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">Pas</span>;
  if (difference > 0) return <span className="rounded-md bg-sky-300/10 px-2 py-1 text-[10px] font-semibold text-sky-200">Lebih {formatCurrency(difference)}</span>;
  return <span className="rounded-md bg-rose-300/10 px-2 py-1 text-[10px] font-semibold text-rose-200">Kurang {formatCurrency(Math.abs(difference))}</span>;
}

export function CashClosingCard({ mode, today, cashIn, cashOut, expected, todayClosing, history, saveAction }: CashClosingCardProps) {
  const [demoStore, setDemoStore] = useState<DemoStore>({});
  const [counted, setCounted] = useState(() => (todayClosing ? String(todayClosing.countedAmount) : ""));
  const [note, setNote] = useState(() => todayClosing?.note ?? "");
  const [demoSaved, setDemoSaved] = useState(false);

  useEffect(() => {
    if (mode !== "demo") return;
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
        if (!raw) return;
        const store = JSON.parse(raw) as DemoStore;
        setDemoStore(store);
        const entry = store[today];
        if (entry) {
          setCounted(String(entry.countedAmount));
          setNote(entry.note ?? "");
        }
      } catch { /* mode demo tetap dapat berjalan tanpa penyimpanan */ }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [mode, today]);

  const effectiveTodayClosing: CashClosingView | null = mode === "demo"
    ? (demoStore[today] ? { date: today, expectedAmount: demoStore[today].expectedAmount, countedAmount: demoStore[today].countedAmount, note: demoStore[today].note } : null)
    : todayClosing;

  const effectiveHistory: CashClosingView[] = mode === "demo"
    ? Object.entries(demoStore)
        .map(([date, item]) => ({ date, expectedAmount: item.expectedAmount, countedAmount: item.countedAmount, note: item.note }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7)
    : history;

  const countedValue = counted.trim() === "" ? null : Number(counted);
  const difference = countedValue !== null && Number.isFinite(countedValue) ? countedValue - expected : null;

  function handleDemoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (countedValue === null || !Number.isFinite(countedValue) || countedValue < 0) return;
    const next: DemoStore = { ...demoStore, [today]: { countedAmount: countedValue, expectedAmount: expected, note: note.trim() || null } };
    setDemoStore(next);
    try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next)); } catch { /* abaikan */ }
    setDemoSaved(true);
    window.setTimeout(() => setDemoSaved(false), 3000);
  }

  const formContent = (
    <>
      <div className="grid gap-2 text-xs">
        <div className="flex items-center justify-between gap-3"><span className="text-muted">Pembayaran tunai masuk</span><span className="font-semibold text-emerald-100">+{formatCurrency(cashIn)}</span></div>
        <div className="flex items-center justify-between gap-3"><span className="text-muted">Pengeluaran tunai</span><span className="font-semibold text-rose-100">−{formatCurrency(cashOut)}</span></div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2"><span className="font-medium">Kas seharusnya</span><span className="font-semibold">{formatCurrency(expected)}</span></div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
        <div>
          <Input name="countedAmount" type="number" min="0" step="1" required inputMode="numeric" placeholder="Uang fisik terhitung (Rp)" aria-label="Uang fisik terhitung" value={counted} onChange={(event) => setCounted(event.target.value)} />
          {difference !== null && (
            <p className={`mt-1.5 text-[11px] font-medium ${difference === 0 ? "text-emerald-300" : difference > 0 ? "text-sky-300" : "text-rose-300"}`} role="status">
              {difference === 0 ? "Selisih: pas, tidak ada selisih." : `Selisih: ${difference > 0 ? "lebih" : "kurang"} ${formatCurrency(Math.abs(difference))}.`}
            </p>
          )}
        </div>
        <Input name="note" type="text" maxLength={300} placeholder="Catatan (opsional)" aria-label="Catatan tutup kasir" value={note} onChange={(event) => setNote(event.target.value)} />
        {mode === "db" && saveAction ? (
          <FormSubmitButton variant="primary" pendingText="Menyimpan…"><Wallet size={14} /> {effectiveTodayClosing ? "Perbarui" : "Tutup kasir"}</FormSubmitButton>
        ) : (
          <Button type="submit" variant="primary">{demoSaved ? <><Check size={14} /> Tersimpan</> : <><Wallet size={14} /> {effectiveTodayClosing ? "Perbarui" : "Tutup kasir"}</>}</Button>
        )}
      </div>
      {effectiveTodayClosing && <p className="mt-2 text-[11px] text-muted" role="status">Sudah ditutup hari ini dengan uang fisik {formatCurrency(effectiveTodayClosing.countedAmount)}. Simpan lagi untuk memperbarui.</p>}
    </>
  );

  return (
    <Card className="mb-4 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wallet size={16} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Tutup kasir — {formatShortDate(today)}</h2>
          <p className="text-[11px] text-muted">{mode === "db" ? "Bandingkan kas tunai menurut sistem dengan uang fisik di laci. Hanya transaksi tunai yang dihitung; selisih dicatat apa adanya." : "Mode demo: angka contoh, hasil tutup kasir tersimpan di browser ini."}</p>
        </div>
      </div>
      {mode === "db" && saveAction ? (
        <form action={saveAction}>
          <input type="hidden" name="date" value={today} />
          {formContent}
        </form>
      ) : (
        <form onSubmit={handleDemoSubmit}>{formContent}</form>
      )}
      {effectiveHistory.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold">Riwayat tutup kasir</h3>
          <ul className="divide-y divide-border/70">
            {effectiveHistory.map((item) => (
              <li key={item.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
                <span className="font-medium">{formatShortDate(item.date)}</span>
                <span className="text-muted">Seharusnya {formatCurrency(item.expectedAmount)}</span>
                <span className="text-muted">Fisik {formatCurrency(item.countedAmount)}</span>
                {differenceBadge(item.countedAmount - item.expectedAmount)}
                {item.note && <span className="min-w-0 flex-1 truncate text-muted">{item.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
