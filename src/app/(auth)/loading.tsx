import { Spinner } from "@/components/ui/spinner";

export default function AuthLoading() {
  return (
    <main className="animate-page-enter flex min-h-screen items-center justify-center bg-background px-4">
      <div role="status" aria-live="polite" className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <Spinner className="text-accent" />
        <span>Memuat halaman akun…</span>
      </div>
    </main>
  );
}
