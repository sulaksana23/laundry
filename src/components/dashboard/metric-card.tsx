import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  change,
  positive = true,
  trend = true,
  note = "dibanding bulan lalu",
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  trend?: boolean;
  note?: string;
  icon: LucideIcon;
  className?: string;
}) {
  const Trend = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className={cn("min-w-0 p-3.5 sm:p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-medium leading-4 text-muted">{label}</p>
        <span className="shrink-0 rounded-lg border border-border bg-surface-raised p-1.5 text-accent sm:p-2"><Icon size={15} /></span>
      </div>
      <div className="mt-2.5 flex flex-col items-start gap-1.5 sm:mt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <p className="whitespace-nowrap text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">{value}</p>
        {trend ? (
          <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold sm:mb-1", positive ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200")}><Trend size={12} />{change}</span>
        ) : (
          <span className="inline-flex max-w-full items-center gap-0.5 truncate rounded-md bg-surface-raised px-1.5 py-1 text-[10px] font-semibold text-muted sm:mb-1">{change}</span>
        )}
      </div>
      <p className="mt-1 text-[10px] leading-4 text-muted">{note}</p>
    </Card>
  );
}
