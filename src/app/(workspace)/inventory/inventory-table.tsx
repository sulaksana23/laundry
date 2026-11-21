"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { csvCell } from "@/lib/csv";
import type { InventoryItem } from "@/server/modules/workspace/operations";
import { adjustInventory } from "./actions";


export function InventoryTable({ items, canManageInventory, canViewCost, canExport }: {
  items: InventoryItem[];
  canManageInventory: boolean;
  canViewCost: boolean;
  canExport: boolean;
}) {
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID");
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.name} ${item.category} ${item.unit} ${item.id}`.toLocaleLowerCase("id-ID").includes(normalizedQuery);
      return matchesQuery && (!lowStockOnly || item.stock <= item.minStock);
    });
  }, [items, query, lowStockOnly]);

  function exportCsv() {
    const headers = ["barang", "kategori", "stok", "satuan", "batas_minimum", "kondisi"];
    if (canViewCost) headers.push("biaya_rata_rata_per_satuan_rp");
    const rows = visibleItems.map((item) => {
      const row: Array<string | number> = [item.name, item.category, item.stock, item.unit, item.minStock, item.stock <= item.minStock ? "perlu_dibeli" : "aman"];
      if (canViewCost) row.push(item.price);
      return row.map(csvCell).join(",");
    });
    const blob = new Blob(["\uFEFF" + [headers.map(csvCell).join(","), ...rows].join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stok-laundry-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-semibold">Daftar persediaan</h2><p className="mt-1 text-[11px] text-muted">{items.length} jenis barang · {visibleItems.length} ditampilkan</p></div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block">
            <span className="sr-only">Cari barang persediaan</span>
            <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari barang atau kategori" aria-label="Cari barang persediaan" className="pl-9 sm:w-56" />
          </label>
          <Button type="button" aria-pressed={lowStockOnly} onClick={() => setLowStockOnly((value) => !value)} variant={lowStockOnly ? "primary" : "secondary"} className="h-9 px-2.5 text-xs">{lowStockOnly ? "Tampilkan semua" : "Stok minimum"}</Button>
          {canExport && <Button type="button" onClick={exportCsv} disabled={visibleItems.length === 0} className="h-9 px-2.5 text-xs"><Download size={14} /> Ekspor CSV</Button>}
        </div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs">
        <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Barang</th><th className="px-3 py-3 font-medium">Kategori</th><th className="px-3 py-3 font-medium">Stok</th><th className="px-3 py-3 font-medium">Minimum</th>{canViewCost && <th className="px-3 py-3 font-medium">Biaya rata-rata/satuan</th>}<th className="px-3 py-3 font-medium">Kondisi</th><th className="px-4 py-3 font-medium">Penyesuaian</th></tr></thead>
        <tbody>{visibleItems.map((item) => { const low = item.stock <= item.minStock; return <tr key={item.id} className="border-t border-border/70 hover:bg-surface-raised/50">
          <td className="px-4 py-3"><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-muted">{item.id}</p></td><td className="px-3 py-3 text-muted">{item.category}</td><td className="px-3 py-3 font-medium">{item.stock} {item.unit}</td><td className="px-3 py-3 text-muted">{item.minStock} {item.unit}</td>{canViewCost && <td className="px-3 py-3">{formatCurrency(item.price)}</td>}<td className="px-3 py-3"><span className={low ? "rounded-md bg-amber-200/10 px-2 py-1 text-[10px] font-medium text-amber-100" : "rounded-md bg-emerald-200/10 px-2 py-1 text-[10px] font-medium text-emerald-100"}>{low ? "Perlu dibeli" : "Aman"}</span></td>
          <td className="px-4 py-3">{canManageInventory ? <form action={adjustInventory} className="flex min-w-[580px] items-center gap-1.5"><input type="hidden" name="id" value={item.id} /><Input name="delta" required type="number" step="0.001" placeholder="+/- jumlah" aria-label={`Jumlah pergerakan stok ${item.name}`} className="h-8 w-24" /><select name="movementType" defaultValue="adjustment" aria-label={`Jenis pergerakan stok ${item.name}`} className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-foreground"><option value="purchase">Pembelian</option><option value="usage">Pemakaian</option><option value="adjustment">Penyesuaian</option></select><Input name="unitCost" type="number" min="0" step="1" placeholder="Biaya beli/satuan" aria-label={`Biaya beli per satuan ${item.name}`} className="h-8 w-32" /><Input name="note" required minLength={2} maxLength={200} placeholder="Alasan" aria-label={`Alasan penyesuaian stok ${item.name}`} className="h-8" /><FormSubmitButton pendingText="…" className="h-8 px-2 text-xs">Simpan</FormSubmitButton></form> : <span className="text-[10px] text-muted">Hanya lihat</span>}</td>
        </tr>; })}</tbody>
      </table>
      {visibleItems.length === 0 && <p className="p-10 text-center text-xs text-muted">{items.length === 0 ? "Belum ada barang persediaan. Tambahkan barang pertama di atas." : "Tidak ada barang yang cocok dengan filter."}</p>}
      </div>
    </Card>
  );
}
