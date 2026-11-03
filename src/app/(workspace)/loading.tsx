import { Spinner } from "@/components/ui/spinner";

export default function WorkspaceLoading() {
  return (
    <div className="animate-page-enter flex min-h-[60vh] items-center justify-center">
      <div role="status" aria-live="polite" className="inline-flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        <Spinner className="text-accent" />
        <span>Memuat data LaundryOS…</span>
      </div>
    </div>
  );
}
