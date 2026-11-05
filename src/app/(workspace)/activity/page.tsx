import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/format";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { hasPermission } from "@/server/modules/auth/permissions";
import { listAuditEvents } from "@/server/modules/workspace/operations";

export const metadata: Metadata = { title: "Aktivitas" };
export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  "order.created": "Pesanan dibuat",
  "orders.imported": "Pesanan diimpor dari CSV",
  "order.status_changed": "Status pesanan diubah",
  "payment.recorded": "Pembayaran dicatat",
  "customer.created_or_renamed": "Pelanggan ditambahkan atau diperbarui",
  "service.created": "Layanan ditambahkan",
  "service.updated": "Layanan diperbarui",
  "inventory.add_or_restock": "Stok awal atau pembelian dicatat",
  "inventory.adjusted": "Stok disesuaikan",
  "staff.created": "Akun staf dibuat",
  "staff.activated": "Akun staf diaktifkan",
  "staff.deactivated": "Akun staf dinonaktifkan",
  "expense.created": "Pengeluaran dicatat",
  "cash_closing.saved": "Tutup kasir disimpan",
  "branch.profile_updated": "Profil usaha diperbarui",
  "customer.imported": "Data pelanggan diimpor",
  "backup.restored": "Backup dipulihkan",
  "report.exported": "Laporan diekspor",
};

function metadataLabel(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata).filter(([key]) => !["from", "to", "batch_id", "file_hash"].includes(key));
  if (!entries.length) return "";
  return entries.slice(0, 3).map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`).join(" · ");
}

export default async function ActivityPage() {
  const session = await getAuthSession();
  if (!session || !hasPermission(session.role, "audit:read")) redirect("/");
  const events = isOrdersDatabaseEnabled() ? await listAuditEvents(session.branchId) : [];

  return (
    <>
      <PageHeader eyebrow="Keamanan & operasional" title="Aktivitas" description="Jejak tindakan penting pada cabang ini. Hanya pemilik yang dapat melihatnya." />
      <Card className="overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="text-sm font-semibold">100 aktivitas terbaru</h2><p className="mt-1 text-[11px] text-muted">Nama pengguna, waktu, dan ringkasan perubahan disimpan bersama transaksi.</p></div>
        {events.length === 0 ? <div className="flex flex-col items-center gap-2 p-10 text-center"><History size={20} className="text-muted" /><p className="text-xs text-muted">Belum ada aktivitas yang tercatat.</p></div> : <div className="divide-y divide-border">{events.map((event) => <article key={event.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{actionLabels[event.action] ?? event.action}</p><p className="mt-1 text-[10px] text-muted">{event.actorName} · {event.entityType === "order_batch" ? "berkas CSV pesanan" : `${event.entityType} ${event.entityId}`}</p>{metadataLabel(event.metadata) && <p className="mt-1 truncate text-[10px] text-muted" title={metadataLabel(event.metadata)}>{metadataLabel(event.metadata)}</p>}</div><time className="shrink-0 text-[10px] text-muted">{formatShortDate(event.createdAt)} · {new Date(event.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: event.timezone })} ({event.timezone})</time></article>)}</div>}
      </Card>
    </>
  );
}
