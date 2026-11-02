import type { Metadata } from "next";
import { Clock3, Plus, Shirt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serviceCatalog } from "@/features/orders/data/mock-orders";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Layanan" };

export default function ServicesPage() {
  return (
    <>
      <PageHeader eyebrow="Katalog usaha" title="Layanan" description="Atur jenis layanan, harga, satuan, dan estimasi pengerjaan." action={<Button disabled title="Tersedia setelah backend tersambung"><Plus size={14} /> Tambah layanan</Button>} />
      <div className="mb-4 flex flex-wrap gap-2 text-[11px]"><span className="rounded-lg border border-border bg-surface px-3 py-2 text-muted">Semua <strong className="ml-1 text-foreground">6</strong></span><span className="rounded-lg border border-border bg-surface px-3 py-2 text-muted">Aktif <strong className="ml-1 text-foreground">6</strong></span><span className="rounded-lg border border-border bg-surface px-3 py-2 text-muted">Nonaktif <strong className="ml-1 text-foreground">0</strong></span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{serviceCatalog.map((service, index) => <Card key={service.id} className="p-4 transition hover:border-accent/30"><div className="mb-4 flex items-start justify-between"><span className="rounded-xl bg-surface-raised p-2.5 text-accent"><Shirt size={17} /></span><span className="rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] font-medium text-emerald-200">Aktif</span></div><h2 className="text-sm font-semibold">{service.name}</h2><p className="mt-1 text-xs text-muted">{service.description}</p><div className="mt-4 flex items-end justify-between border-t border-border pt-3"><div><p className="text-[10px] text-muted">Harga per {service.unit}</p><p className="mt-1 text-base font-semibold">{formatCurrency(service.price)}</p></div><div className="text-right text-[10px] text-muted"><Clock3 size={12} className="ml-auto mb-1" />{service.duration}</div></div><p className="mt-3 text-[10px] text-muted">Kode layanan · SV-{String(index + 1).padStart(3, "0")}</p></Card>)}</div>
      <p className="mt-4 text-[11px] text-muted">Harga dan katalog di halaman ini merupakan data contoh. Pengelolaan akan diaktifkan setelah koneksi database tersedia.</p>
    </>
  );
}
