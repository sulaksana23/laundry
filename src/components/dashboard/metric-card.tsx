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
}: {
  label: string;
  value: string;
  change: string;
  positive?: boolean;
  trend?: boolean;
  note?: string;
  icon: LucideIcon;
}) {
  const Trend = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted">{label}</p>
        <span className="rounded-lg border border-border bg-surface-raised p-2 text-accent"><Icon size={15} /></span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {trend ? (
          <span className={cn("mb-1 inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold", positive ? "bg-emerald-300/10 text-emerald-200" : "bg-rose-300/10 text-rose-200")}><Trend size={12} />{change}</span>
        ) : (
          <span className="mb-1 inline-flex items-center gap-0.5 rounded-md bg-surface-raised px-1.5 py-1 text-[10px] font-semibold text-muted">{change}</span>
        )}
      </div>
      <p className="mt-1 text-[10px] text-muted">{note}</p>
    </Card>
  );
}
