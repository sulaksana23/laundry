import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const barHeights = [42, 58, 48, 72, 62, 84, 96];

export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Memuat data dashboard" aria-busy="true">
      <span className="sr-only">Memuat data dashboard…</span>

      <section aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className={`p-3.5 sm:p-4 ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
            <div className="skeleton-pulse h-3 w-24 rounded bg-surface-hover" style={{ animationDelay: `${index * 120}ms` }} />
            <div className="skeleton-pulse mt-3 h-7 w-28 rounded bg-surface-hover" style={{ animationDelay: `${index * 120 + 80}ms` }} />
            <div className="skeleton-pulse mt-2 h-2.5 w-20 rounded bg-surface-hover" style={{ animationDelay: `${index * 120 + 160}ms` }} />
          </Card>
        ))}
      </section>

      <section aria-hidden="true" className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card className="min-w-0">
          <CardHeader>
            <div>
              <CardTitle>Ringkasan pendapatan</CardTitle>
              <p className="mt-1 text-[11px] text-muted">Memuat data…</p>
            </div>
            <span className="rounded-md bg-surface-raised px-2 py-1.5 text-[10px] text-muted">7 hari</span>
          </CardHeader>
          <div className="px-4 pb-4 pt-3">
            <div className="skeleton-pulse mb-3 h-7 w-40 rounded bg-surface-hover" />
            <div className="flex h-[150px] items-end gap-1.5 border-b border-border sm:h-[175px]">
              {barHeights.map((height, index) => (
                <div key={index} className="flex h-full flex-1 items-end">
                  <div
                    className={`skeleton-bar w-full rounded-t-sm ${index === barHeights.length - 1 ? "bg-accent/50" : "bg-[#657d49]/50"}`}
                    style={{ height: `${height}%`, animationDelay: `${index * 110}ms` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between pl-1">
              {barHeights.map((_, index) => (
                <span key={index} className="skeleton-pulse h-2 w-6 rounded bg-surface-hover" style={{ animationDelay: `${index * 90}ms` }} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <div>
              <CardTitle>Proses hari ini</CardTitle>
              <p className="mt-1 text-[11px] text-muted">Memuat data…</p>
            </div>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2.5 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-border bg-surface-raised/50 p-3">
                <div className="skeleton-pulse h-3 w-16 rounded bg-surface-hover" style={{ animationDelay: `${index * 100}ms` }} />
                <div className="skeleton-pulse mt-2 h-5 w-10 rounded bg-surface-hover" style={{ animationDelay: `${index * 100 + 60}ms` }} />
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-raised">
                  <div className="skeleton-progress h-full rounded-full bg-surface-hover" style={{ animationDelay: `${index * 130}ms` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
