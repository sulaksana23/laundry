import type { Metadata } from "next";
import { AlertTriangle, Boxes, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inventoryItems } from "@/features/orders/data/mock-orders";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Persediaan" };

export default function InventoryPage() {
  const lowStockCount = inventoryItems.filter((item) => item.stock <= item.minStock).length;
  return (
    <>
      <PageHeader eyebrow="Bahan dan perlengkapan" title="Persediaan" description="Pantau bahan operasional dan catat kebutuhan pengadaan." action={<Button disabled title="Tersedia setelah backend tersambung"><Plus size={14} /> Catat stok</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3"><Card className="p-3.5"><div className="flex items-center justify-between"><p className="text-[11px] text-muted">Jenis barang</p><Boxes size={15} className="text-accent" /></div><p className="mt-2 text-xl font-semibold">{inventoryItems.length}</p></Card><Card className="p-3.5"><div className="flex items-center justify-between"><p className="text-[11px] text-muted">Stok perlu dibeli</p><AlertTriangle size={15} className="text-amber-200" /></div><p className="mt-2 text-xl font-semibold">{lowStockCount}</p></Card><Card className="p-3.5"><p className="text-[11px] text-muted">Nilai persediaan</p><p className="mt-2 text-xl font-semibold">Rp 1.860.000</p></Card></div>
      {lowStockCount > 0 && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/5 p-3.5"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-200" /><div><p className="text-xs font-semibold text-amber-100">Ada {lowStockCount} barang yang mencapai batas minimum</p><p className="mt-1 text-[11px] text-muted">Periksa jumlah stok sebelum menerima pesanan dalam jumlah besar.</p></div></div>}
      <Card className="overflow-hidden"><div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Daftar persediaan</h2><p className="mt-1 text-[11px] text-muted">Stok contoh cabang Bangli</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Barang</th><th className="px-3 py-3 font-medium">Kategori</th><th className="px-3 py-3 font-medium">Stok saat ini</th><th className="px-3 py-3 font-medium">Batas minimum</th><th className="px-3 py-3 font-medium">Harga satuan</th><th className="px-4 py-3 font-medium">Kondisi</th></tr></thead><tbody>{inventoryItems.map((item) => { const low = item.stock <= item.minStock; return <tr key={item.id} className="border-t border-border/70 hover:bg-surface-raised/50"><td className="px-4 py-3"><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-muted">{item.id}</p></td><td className="px-3 py-3 text-muted">{item.category}</td><td className="px-3 py-3 font-medium">{item.stock} {item.unit}</td><td className="px-3 py-3 text-muted">{item.minStock} {item.unit}</td><td className="px-3 py-3">{formatCurrency(item.price)}</td><td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-[10px] font-medium ${low ? "bg-amber-200/10 text-amber-100" : "bg-emerald-200/10 text-emerald-100"}`}>{low ? "Perlu dibeli" : "Aman"}</span></td></tr>; })}</tbody></table></div></Card>
    </>
  );
}
