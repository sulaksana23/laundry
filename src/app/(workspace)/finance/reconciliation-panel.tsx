import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { formatCurrency } from "@/lib/format";
import type { ReconciliationRow } from "@/server/modules/workspace/reconciliation";
import { ignoreStatementRow, importStatementCsv, matchStatementRow } from "./reconciliation-actions";

const statusLabels = { pending: "Menunggu pencocokan", matched: "Sudah cocok", ignored: "Diabaikan" };
const methodLabels = { transfer: "Transfer", qris: "QRIS" };

export function ReconciliationPanel({ rows, canManage }: { rows: ReconciliationRow[]; canManage: boolean }) {
  return <Card className="mt-4 overflow-hidden">
    <div className="border-b border-border p-4"><div className="flex items-center gap-2"><ArrowLeftRight size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Rekonsiliasi transfer & QRIS</h2><p className="mt-1 text-[11px] leading-5 text-muted">Impor CSV mutasi, lalu cocokkan manual dengan pembayaran yang tercatat. Pencocokan tidak mengubah saldo atau buku pembayaran.</p></div></div></div>
    {canManage && <div className="border-b border-border bg-surface-raised/30 p-4">
      <form action={importStatementCsv} className="flex flex-wrap items-end gap-2.5">
        <label className="min-w-64 flex-1 text-[10px] font-medium text-muted">Berkas mutasi CSV · maksimal 1 MB dan 1.000 baris<input name="file" type="file" accept=".csv,text/csv" required className="mt-1.5 block h-9 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[11px] text-foreground file:mr-2 file:rounded file:border-0 file:bg-surface-hover file:px-2 file:py-1 file:text-[10px] file:font-semibold" /></label>
        <FormSubmitButton variant="primary" pendingText="Mengimpor…">Impor CSV</FormSubmitButton>
        <a href="/templates/laundry-payment-reconciliation.csv" download className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-[10px] font-semibold text-muted hover:text-accent">Unduh template</a>
      </form>
      <p className="mt-2 text-[10px] leading-5 text-muted">Header wajib: <code>tanggal,nominal,metode</code>. Tanggal lokal cabang format YYYY-MM-DD (opsional jam), nominal angka Rupiah tanpa pemisah, metode transfer atau qris. Baris biaya/nominal negatif dan metode lain dilewati.</p>
    </div>}
    {rows.length === 0 ? <p className="p-6 text-center text-xs text-muted">Belum ada mutasi yang diimpor.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-xs">
      <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Tanggal mutasi</th><th className="px-3 py-3 font-medium">Nominal / metode</th><th className="px-3 py-3 font-medium">Referensi / keterangan</th><th className="px-3 py-3 font-medium">Status & pesanan</th>{canManage && <th className="px-4 py-3 font-medium">Tindakan</th>}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border/70 align-top">
        <td className="px-4 py-3 text-muted">{new Date(row.transactionAt).toLocaleString("id-ID", { timeZone: row.timezone, dateStyle: "medium", timeStyle: "short" })}<p className="mt-1 max-w-48 truncate text-[9px]">{row.fileName}</p></td>
        <td className="px-3 py-3"><p className="font-semibold">{formatCurrency(row.amount)}</p><p className="mt-1 text-[10px] text-muted">{methodLabels[row.method]}</p></td>
        <td className="px-3 py-3"><p className="max-w-56 break-words font-medium">{row.reference || "Tanpa referensi"}</p><p className="mt-1 max-w-56 break-words text-[10px] text-muted">{row.description}</p></td>
        <td className="px-3 py-3"><span className={row.status === "matched" ? "rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-100" : row.status === "ignored" ? "rounded-md bg-surface-hover px-2 py-1 text-[10px] text-muted" : "rounded-md bg-amber-300/10 px-2 py-1 text-[10px] text-amber-100"}>{statusLabels[row.status]}</span>{row.matchedOrderId && <p className="mt-2 text-[10px]">{row.matchedOrderId}{row.matchedCustomerName ? ` · ${row.matchedCustomerName}` : ""}</p>}</td>
        {canManage && <td className="px-4 py-3">{row.status === "pending" ? <div className="flex min-w-72 items-start gap-1.5"><form action={matchStatementRow} className="flex min-w-56 flex-1 items-start gap-1.5"><input type="hidden" name="rowId" value={row.id} /><select name="paymentId" required defaultValue="" aria-label={`Pembayaran untuk baris ${row.reference || row.id}`} className="min-h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-[10px] text-foreground"><option value="" disabled>{row.candidates.length ? "Pilih kandidat nominal & tanggal sama" : "Tidak ada kandidat tepat"}</option>{row.candidates.map((candidate) => <option key={candidate.paymentId} value={candidate.paymentId}>{candidate.orderId} · {candidate.customerName} · {new Date(candidate.receivedAt).toLocaleTimeString("id-ID", { timeZone: row.timezone, hour: "2-digit", minute: "2-digit" })}</option>)}</select><FormSubmitButton variant="primary" disabled={row.candidates.length === 0} className="h-8 px-2 text-[10px]" pendingText="…">Cocokkan</FormSubmitButton></form><form action={ignoreStatementRow}><input type="hidden" name="rowId" value={row.id} /><FormSubmitButton variant="secondary" className="h-8 px-2 text-[10px]" pendingText="…">Abaikan</FormSubmitButton></form></div> : <span className="text-[10px] text-muted">Sumber: {row.fileName}</span>}</td>}
      </tr>)}</tbody>
    </table></div>}
    <p className="border-t border-border px-4 py-3 text-[10px] leading-5 text-muted">Kandidat hanya ditampilkan jika nominal, metode, dan tanggal lokal sama persis. Jika ada lebih dari satu, periksa referensi mutasi sebelum memilih.</p>
  </Card>;
}
