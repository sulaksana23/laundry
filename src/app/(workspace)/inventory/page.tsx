import type { Metadata } from "next";
import { AlertTriangle, Boxes, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inventoryItems as demoInventory } from "@/features/orders/data/mock-orders";
import { formatCurrency } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { listInventory, type InventoryItem } from "@/server/modules/workspace/operations";
import { adjustInventory, createInventoryItem } from "./actions";

export const metadata: Metadata = { title: "Persediaan" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const items: InventoryItem[] = databaseEnabled
    ? await listInventory(session!.branchId)
    : demoInventory.map((item) => ({ ...item }));
  const lowStockCount = items.filter((item) => item.stock <= item.minStock).length;
  const valuation = items.reduce((total, item) => total + item.stock * item.price, 0);

  return (
    <>
      <PageHeader eyebrow="Kontrol operasional" title="Persediaan" description="Catat barang, pantau batas minimum, dan sesuaikan stok cabang." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Jenis barang</p><p className="mt-1 text-xl font-semibold">{items.length}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Perlu dibeli</p><p className="mt-1 text-xl font-semibold">{lowStockCount}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Nilai stok tercatat</p><p className="mt-1 text-xl font-semibold">{formatCurrency(valuation)}</p></Card>
      </div>
      {databaseEnabled ? (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2"><Plus size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Tambah barang</h2><p className="text-[11px] text-muted">Isi stok awal dan batas minimum untuk notifikasi stok menipis.</p></div></div>
          <form action={createInventoryItem} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
            <Input name="name" required minLength={2} maxLength={100} placeholder="Nama barang" aria-label="Nama barang" />
            <Input name="category" required minLength={2} maxLength={80} placeholder="Kategori" aria-label="Kategori" />
            <Input name="unit" required maxLength={24} placeholder="Satuan (kg, liter, pak)" aria-label="Satuan" />
            <Input name="stock" required type="number" min="0" step="0.001" placeholder="Stok awal" aria-label="Stok awal" />
            <Input name="minStock" required type="number" min="0" step="0.001" placeholder="Batas minimum" aria-label="Batas minimum" />
            <div className="flex gap-2"><Input name="price" required type="number" min="0" step="1" placeholder="Harga satuan" aria-label="Harga satuan" /><FormSubmitButton variant="primary" pendingText="Menambah…"><Plus size={14} /> Tambah</FormSubmitButton></div>
          </form>
        </Card>
      ) : <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Mode demo: daftar contoh hanya untuk pratinjau dan tidak disimpan ke Neon.</p>}
      {lowStockCount > 0 && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/5 p-3.5"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-200" /><div><p className="text-xs font-semibold text-amber-100">Ada {lowStockCount} barang yang mencapai batas minimum</p><p className="mt-1 text-[11px] text-muted">Periksa jumlah stok sebelum menerima pesanan dalam jumlah besar.</p></div></div>}
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Daftar persediaan</h2><p className="mt-1 text-[11px] text-muted">{databaseEnabled ? "Stok tersimpan per cabang di Neon" : "Data contoh"}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[830px] text-left text-xs">
          <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Barang</th><th className="px-3 py-3 font-medium">Kategori</th><th className="px-3 py-3 font-medium">Stok</th><th className="px-3 py-3 font-medium">Minimum</th><th className="px-3 py-3 font-medium">Harga satuan</th><th className="px-3 py-3 font-medium">Kondisi</th><th className="px-4 py-3 font-medium">Penyesuaian</th></tr></thead>
          <tbody>{items.map((item) => { const low = item.stock <= item.minStock; return <tr key={item.id} className="border-t border-border/70 hover:bg-surface-raised/50">
            <td className="px-4 py-3"><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-muted">{item.id}</p></td><td className="px-3 py-3 text-muted">{item.category}</td><td className="px-3 py-3 font-medium">{item.stock} {item.unit}</td><td className="px-3 py-3 text-muted">{item.minStock} {item.unit}</td><td className="px-3 py-3">{formatCurrency(item.price)}</td><td className="px-3 py-3"><span className={low ? "rounded-md bg-amber-200/10 px-2 py-1 text-[10px] font-medium text-amber-100" : "rounded-md bg-emerald-200/10 px-2 py-1 text-[10px] font-medium text-emerald-100"}>{low ? "Perlu dibeli" : "Aman"}</span></td>
            <td className="px-4 py-3">{databaseEnabled ? <form action={adjustInventory} className="flex min-w-44 items-center gap-1.5"><input type="hidden" name="id" value={item.id} /><Input name="delta" required type="number" step="0.001" placeholder="+/- jumlah" aria-label={"Penyesuaian stok " + item.name} className="h-8" /><FormSubmitButton pendingText="…" className="h-8 px-2 text-xs">Simpan</FormSubmitButton></form> : <span className="text-[10px] text-muted"><Boxes size={13} className="inline" /> Demo</span>}</td>
          </tr>; })}</tbody>
        </table>
        {items.length === 0 && <p className="p-10 text-center text-xs text-muted">Belum ada barang persediaan. Tambahkan barang pertama di atas.</p>}
        </div>
      </Card>
    </>
  );
}
