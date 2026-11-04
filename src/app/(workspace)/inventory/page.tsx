import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { inventoryItems as demoInventory } from "@/features/orders/data/mock-orders";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { listInventory, listInventoryMovements, listServiceInventoryRecipes, type InventoryItem } from "@/server/modules/workspace/operations";
import { getServicesService } from "@/server/modules/services/services.runtime";
import { adjustInventory, createInventoryItem, deleteServiceInventoryRecipe, saveServiceInventoryRecipe } from "./actions";
import { hasPermission } from "@/server/modules/auth/permissions";

export const metadata: Metadata = { title: "Persediaan" };
export const dynamic = "force-dynamic";

const movementLabels: Record<string, string> = { opening: "Saldo awal", purchase: "Pembelian", adjustment: "Penyesuaian", usage: "Pemakaian" };
const recipeStatusLabels: Record<string, string> = { washing: "Dicuci", drying: "Dikeringkan", ironing: "Disetrika", ready: "Siap diambil", completed: "Selesai" };

export default async function InventoryPage() {
  const session = await getAuthSession();
  if (session && !hasPermission(session.role, "inventory:read")) redirect("/");
  const canManageInventory = session ? hasPermission(session.role, "inventory:manage") : false;
  const canViewInventoryCost = session ? hasPermission(session.role, "finance:read") : true;
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const items: InventoryItem[] = databaseEnabled
    ? await listInventory(session!.branchId)
    : demoInventory.map((item) => ({ ...item }));
  const movements = databaseEnabled ? await listInventoryMovements(session!.branchId) : [];
  const services = databaseEnabled && canManageInventory ? await getServicesService().list(session!.branchId) : [];
  const recipes = databaseEnabled && canManageInventory ? await listServiceInventoryRecipes(session!.branchId) : [];
  const lowStockCount = items.filter((item) => item.stock <= item.minStock).length;
  const valuation = items.reduce((total, item) => total + item.stock * item.price, 0);

  return (
    <>
      <PageHeader eyebrow="Kontrol operasional" title="Persediaan" description="Catat barang, pantau batas minimum, dan sesuaikan stok cabang." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Jenis barang</p><p className="mt-1 text-xl font-semibold">{items.length}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Perlu dibeli</p><p className="mt-1 text-xl font-semibold">{lowStockCount}</p></Card>
        {canViewInventoryCost && <Card className="p-3.5"><p className="text-[11px] text-muted">Nilai stok tercatat</p><p className="mt-1 text-xl font-semibold">{formatCurrency(valuation)}</p></Card>}
      </div>
      {databaseEnabled && canManageInventory ? (
        <Card className="mb-4 p-4">
          <div className="mb-3 flex items-center gap-2"><Plus size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Tambah barang</h2><p className="text-[11px] text-muted">Isi stok awal dan batas minimum untuk notifikasi stok menipis.</p></div></div>
          <form action={createInventoryItem} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
            <Input name="name" required minLength={2} maxLength={100} placeholder="Nama barang" aria-label="Nama barang" />
            <Input name="category" required minLength={2} maxLength={80} placeholder="Kategori" aria-label="Kategori" />
            <Input name="unit" required maxLength={24} placeholder="Satuan (kg, liter, pak)" aria-label="Satuan" />
            <Input name="stock" required type="number" min="0" step="0.001" placeholder="Stok awal" aria-label="Stok awal" />
            <Input name="minStock" required type="number" min="0" step="0.001" placeholder="Batas minimum" aria-label="Batas minimum" />
            <Input name="price" required type="number" min="0" step="1" placeholder="Harga satuan" aria-label="Harga satuan" />
            <Input name="note" required minLength={2} maxLength={200} placeholder="Alasan stok awal" aria-label="Alasan stok awal" />
            <FormSubmitButton variant="primary" pendingText="Menambah…"><Plus size={14} /> Tambah</FormSubmitButton>
          </form>
        </Card>
      ) : !databaseEnabled ? <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Mode demo: daftar contoh hanya untuk pratinjau dan tidak disimpan ke Neon.</p> : !canManageInventory ? <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Anda dapat melihat saldo stok. Pemilik mengelola penambahan dan penyesuaiannya.</p> : null}
      {databaseEnabled && canManageInventory && <Card className="mb-4 overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Resep pemakaian bahan</h2><p className="mt-1 text-[11px] leading-5 text-muted">Atur jumlah bahan per kg, pcs, atau pasang layanan. Stok dipotong satu kali saat pesanan memasuki tahap yang dipilih; tahap tertahan jika stok tidak cukup.</p></div>
        {items.length === 0 || !services.some((service) => service.isActive) ? <p className="p-4 text-xs text-muted">Tambahkan barang persediaan dan satu layanan aktif untuk membuat resep.</p> : <form action={saveServiceInventoryRecipe} className="grid gap-2 border-b border-border p-4 sm:grid-cols-2 xl:grid-cols-5">
          <select name="serviceId" required aria-label="Layanan resep" className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground">{services.filter((service) => service.isActive).map((service) => <option key={service.id} value={service.id}>{service.name} · per {service.unit}</option>)}</select>
          <select name="itemId" required aria-label="Bahan yang digunakan" className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground">{items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select>
          <Input name="quantityPerServiceUnit" required type="number" min="0.001" max="999999999.999" step="0.001" placeholder="Jumlah bahan per satuan layanan" aria-label="Jumlah bahan per satuan layanan" />
          <select name="consumeAtStatus" defaultValue="washing" aria-label="Tahap pemotongan stok" className="h-9 rounded-lg border border-border bg-surface-raised px-2 text-xs text-foreground">{Object.entries(recipeStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select>
          <FormSubmitButton variant="primary" pendingText="Menyimpan…"><Plus size={14} /> Simpan resep</FormSubmitButton>
        </form>}
        {recipes.length === 0 ? <p className="p-4 text-xs text-muted">Belum ada resep. Pemakaian stok otomatis tetap nonaktif sampai pemilik menambahkan resep.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Layanan</th><th className="px-3 py-3 font-medium">Bahan</th><th className="px-3 py-3 font-medium">Pemakaian</th><th className="px-3 py-3 font-medium">Tahap</th><th className="px-4 py-3 font-medium">Aksi</th></tr></thead><tbody>{recipes.map((recipe) => <tr key={recipe.id} className="border-t border-border/70"><td className="px-4 py-3 font-medium">{recipe.serviceName}<span className="ml-1 text-[10px] text-muted">/ {recipe.serviceUnit}</span></td><td className="px-3 py-3">{recipe.itemName}</td><td className="px-3 py-3">{recipe.quantityPerServiceUnit} {recipe.itemUnit} / {recipe.serviceUnit}</td><td className="px-3 py-3 text-muted">{recipeStatusLabels[recipe.consumeAtStatus]}</td><td className="px-4 py-3"><form action={deleteServiceInventoryRecipe}><input type="hidden" name="id" value={recipe.id} /><FormSubmitButton pendingText="…" className="h-8 px-2 text-xs">Hapus resep</FormSubmitButton></form></td></tr>)}</tbody></table></div>}
        <p className="border-t border-border px-4 py-3 text-[10px] leading-5 text-muted">Jika pesanan dibatalkan setelah stok terpakai, koreksi jumlahnya secara manual melalui ledger stok agar jejak transaksi tetap jelas.</p>
      </Card>}
      {lowStockCount > 0 && <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200/15 bg-amber-200/5 p-3.5"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-200" /><div><p className="text-xs font-semibold text-amber-100">Ada {lowStockCount} barang yang mencapai batas minimum</p><p className="mt-1 text-[11px] text-muted">Periksa jumlah stok sebelum menerima pesanan dalam jumlah besar.</p></div></div>}
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Daftar persediaan</h2><p className="mt-1 text-[11px] text-muted">{databaseEnabled ? "Stok tersimpan per cabang di Neon" : "Data contoh"}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[830px] text-left text-xs">
          <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Barang</th><th className="px-3 py-3 font-medium">Kategori</th><th className="px-3 py-3 font-medium">Stok</th><th className="px-3 py-3 font-medium">Minimum</th>{canViewInventoryCost && <th className="px-3 py-3 font-medium">Harga satuan</th>}<th className="px-3 py-3 font-medium">Kondisi</th><th className="px-4 py-3 font-medium">Penyesuaian</th></tr></thead>
          <tbody>{items.map((item) => { const low = item.stock <= item.minStock; return <tr key={item.id} className="border-t border-border/70 hover:bg-surface-raised/50">
            <td className="px-4 py-3"><p className="font-semibold">{item.name}</p><p className="mt-0.5 text-[10px] text-muted">{item.id}</p></td><td className="px-3 py-3 text-muted">{item.category}</td><td className="px-3 py-3 font-medium">{item.stock} {item.unit}</td><td className="px-3 py-3 text-muted">{item.minStock} {item.unit}</td>{canViewInventoryCost && <td className="px-3 py-3">{formatCurrency(item.price)}</td>}<td className="px-3 py-3"><span className={low ? "rounded-md bg-amber-200/10 px-2 py-1 text-[10px] font-medium text-amber-100" : "rounded-md bg-emerald-200/10 px-2 py-1 text-[10px] font-medium text-emerald-100"}>{low ? "Perlu dibeli" : "Aman"}</span></td>
            <td className="px-4 py-3">{canManageInventory ? <form action={adjustInventory} className="flex min-w-[430px] items-center gap-1.5"><input type="hidden" name="id" value={item.id} /><Input name="delta" required type="number" step="0.001" placeholder="+/- jumlah" aria-label={"Jumlah pergerakan stok " + item.name} className="h-8 w-24" /><select name="movementType" defaultValue="adjustment" aria-label={"Jenis pergerakan stok " + item.name} className="h-8 rounded-md border border-border bg-surface px-2 text-[10px] text-foreground"><option value="purchase">Pembelian</option><option value="usage">Pemakaian</option><option value="adjustment">Penyesuaian</option></select><Input name="note" required minLength={2} maxLength={200} placeholder="Alasan" aria-label={"Alasan penyesuaian stok " + item.name} className="h-8" /><FormSubmitButton pendingText="…" className="h-8 px-2 text-xs">Simpan</FormSubmitButton></form> : <span className="text-[10px] text-muted">Hanya lihat</span>}</td>
          </tr>; })}</tbody>
        </table>
        {items.length === 0 && <p className="p-10 text-center text-xs text-muted">Belum ada barang persediaan. Tambahkan barang pertama di atas.</p>}
        </div>
      </Card>
      {databaseEnabled && <Card className="mt-4 overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">Riwayat pergerakan stok</h2><p className="mt-1 text-[11px] text-muted">50 perubahan terbaru · cabang aktif</p></div>
        {movements.length === 0 ? <p className="p-8 text-center text-xs text-muted">Belum ada pergerakan stok tercatat.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Waktu</th><th className="px-3 py-3 font-medium">Barang</th><th className="px-3 py-3 font-medium">Jenis</th><th className="px-3 py-3 font-medium">Perubahan</th><th className="px-3 py-3 font-medium">Alasan</th><th className="px-4 py-3 font-medium">Pengguna</th></tr></thead><tbody>{movements.map((movement) => <tr key={movement.id} className="border-t border-border/70"><td className="px-4 py-3 text-muted">{formatShortDate(movement.createdAt)} · {new Date(movement.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: movement.timezone })} {movement.timezone}</td><td className="px-3 py-3 font-medium">{movement.itemName}</td><td className="px-3 py-3 text-muted">{movementLabels[movement.type] ?? movement.type}</td><td className={movement.delta > 0 ? "px-3 py-3 font-semibold text-emerald-200" : "px-3 py-3 font-semibold text-rose-200"}>{movement.delta > 0 ? "+" : ""}{movement.delta} {movement.unit}</td><td className="max-w-64 truncate px-3 py-3 text-muted" title={movement.note}>{movement.note}</td><td className="px-4 py-3 text-muted">{movement.actorName}</td></tr>)}</tbody></table></div>}
      </Card>}
    </>
  );
}
