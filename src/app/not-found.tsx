import Link from "next/link";
import { ArrowLeft, Shirt } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
      <div className="max-w-sm"><span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Shirt size={22} /></span><p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-accent">404 · Tidak ditemukan</p><h1 className="mt-2 text-2xl font-semibold">Halaman ini tidak ada</h1><p className="mt-2 text-sm leading-6 text-muted">Alamat mungkin berubah atau halaman sudah dipindahkan.</p><Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"><ArrowLeft size={15} /> Kembali ke ringkasan</Link></div>
    </main>
  );
}
