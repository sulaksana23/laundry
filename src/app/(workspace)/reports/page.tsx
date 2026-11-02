import type { Metadata } from "next";
import { Download, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Laporan" };

const weeks = [{ label: "Minggu 1", income: 58, orders: 45 }, { label: "Minggu 2", income: 74, orders: 68 }, { label: "Minggu 3", income: 63, orders: 54 }, { label: "Minggu 4", income: 91, orders: 82 }];

export default function ReportsPage() {
  return (
    <>
      <PageHeader eyebrow="Analisis usaha" title="Laporan" description="Lihat tren penjualan dan aktivitas cabang." action={<Button disabled title="Ekspor tersedia setelah backend tersambung"><Download size={14} /> Unduh laporan</Button>} />
      <div className="mb-4 flex flex-wrap gap-2"><span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Oktober 2026 · bulan terakhir penuh</span><span className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Semua layanan · data demo</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Card className="p-4"><p className="text-[11px] text-muted">Total pesanan</p><p className="mt-2 text-2xl font-semibold">428</p><p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-200"><TrendingUp size={12} /> 14,2% vs bulan lalu</p></Card><Card className="p-4"><p className="text-[11px] text-muted">Total omzet</p><p className="mt-2 text-2xl font-semibold">Rp 18,45 jt</p><p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-200"><TrendingUp size={12} /> 12,8% vs bulan lalu</p></Card><Card className="p-4"><p className="text-[11px] text-muted">Berat cucian</p><p className="mt-2 text-2xl font-semibold">1.286 kg</p><p className="mt-1 text-[10px] text-muted">Rata-rata 3 kg per pesanan</p></Card><Card className="p-4"><p className="text-[11px] text-muted">Pelanggan baru</p><p className="mt-2 text-2xl font-semibold">32</p><p className="mt-1 text-[10px] text-muted">7,5% dari transaksi</p></Card></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]"><Card><CardHeader><div><CardTitle>Omzet dan pesanan</CardTitle><p className="mt-1 text-[11px] text-muted">Perbandingan mingguan bulan ini</p></div></CardHeader><div className="space-y-4 p-4">{weeks.map((week) => <div key={week.label} className="grid grid-cols-[72px_1fr_88px] items-center gap-3"><span className="text-[11px] text-muted">{week.label}</span><div><div className="h-2 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${week.income}%` }} /></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-sky-300/70" style={{ width: `${week.orders}%` }} /></div></div><span className="text-right text-[10px] text-muted">{formatCurrency(week.income * 255000)}</span></div>)}</div><div className="flex gap-4 border-t border-border px-4 py-3 text-[10px] text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-accent" /> Omzet</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-sky-300/70" /> Jumlah pesanan</span></div></Card>
        <Card><CardHeader><div><CardTitle>Layanan terlaris</CardTitle><p className="mt-1 text-[11px] text-muted">Berdasarkan jumlah pesanan</p></div></CardHeader><div className="space-y-4 p-4">{[{ name: "Cuci + Setrika", count: 186, share: 78 }, { name: "Cuci Kering", count: 126, share: 58 }, { name: "Setrika Saja", count: 72, share: 36 }, { name: "Express 6 Jam", count: 44, share: 24 }].map((item, index) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between text-xs"><span><span className="mr-2 text-[10px] text-muted">0{index + 1}</span>{item.name}</span><span className="text-muted">{item.count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-surface-raised"><div className="h-full rounded-full bg-[#829f5d]" style={{ width: `${item.share}%` }} /></div></div>)}</div></Card></div>
      <p className="mt-4 text-[11px] text-muted">Data pada laporan ini adalah data contoh. Hubungkan database sebelum memakai angka untuk keputusan usaha.</p>
    </>
  );
}
