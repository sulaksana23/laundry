"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Clock3, Pencil, Plus, Search, Shirt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { LaundryService } from "@/features/services/domain/service";
import { formatCurrency } from "@/lib/format";

type Props = { initialServices: LaundryService[]; databaseEnabled: boolean; editable?: boolean };

function durationLabel(minutes: number) {
  if (minutes % 1440 === 0) return (minutes / 1440) + " hari";
  if (minutes % 60 === 0) return (minutes / 60) + " jam";
  return minutes + " menit";
}

export function ServicesManager({ initialServices, databaseEnabled, editable = true }: Props) {
  const [services, setServices] = useState(initialServices);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LaundryService | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  const visible = useMemo(() => services.filter((service) => {
    const matchesQuery = (service.name + " " + service.description).toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || service.isActive === (filter === "active");
    return matchesQuery && matchesFilter;
  }), [services, query, filter]);

  function openCreate() {
    setEditing(null);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(service: LaundryService) {
    setEditing(service);
    setError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (pending) return;
    setDialogOpen(false);
    setEditing(null);
    setError("");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!databaseEnabled || pending) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
      unit: String(form.get("unit") ?? "kg"),
      price: Number(form.get("price")),
      durationMinutes: Number(form.get("durationMinutes")),
      isActive: editing?.isActive ?? true,
    };
    setPending(true);
    setError("");
    try {
      const url = editing ? "/api/services/" + encodeURIComponent(editing.id) : "/api/services";
      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { service?: LaundryService; error?: string };
      if (!response.ok || !result.service) {
        setError(result.error ?? "Layanan gagal disimpan.");
        return;
      }
      setServices((current) => {
        const next = editing
          ? current.map((service) => service.id === result.service!.id ? result.service! : service)
          : [...current, result.service!];
        return next.sort((a, b) => a.name.localeCompare(b.name, "id"));
      });
      setDialogOpen(false);
      setEditing(null);
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  async function toggleService(service: LaundryService) {
    if (!databaseEnabled || pendingId) return;
    setPendingId(service.id);
    setError("");
    try {
      const response = await fetch("/api/services/" + encodeURIComponent(service.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...service, isActive: !service.isActive }),
      });
      const result = (await response.json()) as { service?: LaundryService; error?: string };
      if (!response.ok || !result.service) {
        setError(result.error ?? "Status layanan gagal diperbarui.");
        return;
      }
      setServices((current) => current.map((item) => item.id === result.service!.id ? result.service! : item));
    } catch {
      setError("Tidak dapat menghubungi server. Coba lagi.");
    } finally {
      setPendingId("");
    }
  }

  const activeCount = services.filter((service) => service.isActive).length;
  const inactiveCount = services.length - activeCount;

  return (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Semua layanan</p><p className="mt-1 text-xl font-semibold">{services.length}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Aktif</p><p className="mt-1 text-xl font-semibold">{activeCount}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Nonaktif</p><p className="mt-1 text-xl font-semibold">{inactiveCount}</p></Card>
      </div>

      {!databaseEnabled && <p className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">Mode demo: katalog contoh hanya untuk pratinjau dan tidak disimpan ke Neon.</p>}
      {error && !dialogOpen && <p role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-semibold">Katalog layanan</h2><p className="mt-1 text-[11px] text-muted">Harga tersimpan per cabang; pesanan saat ini memakai layanan per kilogram.</p></div>
          {editable && <Button type="button" variant="primary" onClick={openCreate} disabled={!databaseEnabled}><Plus size={14} /> Tambah layanan</Button>}
        </div>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama layanan" aria-label="Cari layanan" className="pl-9" /></div>
          <div className="flex gap-1.5">
            {([["all", "Semua"], ["active", "Aktif"], ["inactive", "Nonaktif"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={filter === value ? "rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground" : "rounded-lg bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-surface-hover hover:text-foreground"}>{label}</button>)}
          </div>
        </div>

        {visible.length ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((service) => (
              <Card key={service.id} className="p-4">
                <div className="mb-4 flex items-start justify-between">
                  <span className="rounded-xl bg-surface-raised p-2.5 text-accent"><Shirt size={17} /></span>
                  <span className={service.isActive ? "rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] font-medium text-emerald-200" : "rounded-md bg-surface-hover px-2 py-1 text-[10px] font-medium text-muted"}>{service.isActive ? "Aktif" : "Nonaktif"}</span>
                </div>
                <h3 className="text-sm font-semibold">{service.name}</h3>
                <p className="mt-1 min-h-8 text-xs text-muted">{service.description || "Belum ada deskripsi."}</p>{service.unit !== "kg" && <p className="mt-2 text-[10px] text-warning">Satuan ini belum tersedia pada form pesanan.</p>}
                <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                  <div><p className="text-[10px] text-muted">Harga per {service.unit}</p><p className="mt-1 text-base font-semibold">{formatCurrency(service.price)}</p></div>
                  <div className="text-right text-[10px] text-muted"><Clock3 size={12} className="ml-auto mb-1" />{durationLabel(service.durationMinutes)}</div>
                </div>
                {databaseEnabled && editable && <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => openEdit(service)}><Pencil size={13} /> Ubah</Button>
                  <Button type="button" variant={service.isActive ? "secondary" : "primary"} isLoading={pendingId === service.id} loadingText="Memproses…" className="h-8 px-2 text-xs" onClick={() => void toggleService(service)}>{service.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                </div>}
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center"><p className="text-sm font-medium">Layanan tidak ditemukan</p><p className="mt-1 text-xs text-muted">Ubah pencarian atau filter yang dipilih.</p></div>
        )}
      </Card>

      {dialogOpen && <div className="animate-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/65" onClick={closeDialog} />
        <section role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" className="animate-dialog-enter relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Katalog layanan</p><h2 id="service-dialog-title" className="mt-1 text-lg font-semibold">{editing ? "Ubah layanan" : "Tambah layanan"}</h2><p className="mt-1 text-xs text-muted">Harga tersimpan sebagai Rupiah per satuan.</p></div><button type="button" aria-label="Tutup dialog" disabled={pending} onClick={closeDialog} className="rounded-md p-1.5 text-muted transition hover:bg-surface-hover disabled:opacity-50"><X size={16} /></button></div>
          <form key={editing?.id ?? "new-service"} onSubmit={saveService} className="space-y-3">
            <label className="block text-xs font-medium">Nama layanan<Input name="name" required minLength={2} maxLength={100} defaultValue={editing?.name ?? ""} placeholder="Contoh: Cuci + Setrika" className="mt-1.5" /></label>
            <label className="block text-xs font-medium">Deskripsi<Input name="description" maxLength={240} defaultValue={editing?.description ?? ""} placeholder="Ringkasan layanan" className="mt-1.5" /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-xs font-medium">Satuan<Select name="unit" defaultValue={editing?.unit ?? "kg"} className="mt-1.5"><option value="kg">Kilogram</option><option value="pcs">Pcs</option><option value="pasang">Pasang</option></Select></label>
              <label className="block text-xs font-medium">Harga (Rp)<Input name="price" required type="number" min="0" step="1" defaultValue={editing?.price ?? ""} placeholder="8000" className="mt-1.5" /></label>
              <label className="block text-xs font-medium">Estimasi (menit)<Input name="durationMinutes" required type="number" min="1" max="43200" step="1" defaultValue={editing?.durationMinutes ?? 2880} placeholder="2880" className="mt-1.5" /></label>
            </div>
            {error && <p role="alert" className="animate-fade-in rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" onClick={closeDialog} disabled={pending}>Batal</Button><Button type="submit" variant="primary" isLoading={pending} loadingText="Menyimpan…">{editing ? "Simpan perubahan" : "Tambah layanan"}</Button></div>
          </form>
        </section>
      </div>}
    </>
  );
}
