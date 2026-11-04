import type { OrderStatus, PaymentStatus } from "@/features/orders/domain/order";
import { orderStatusLabels } from "@/features/orders/domain/order";
import { cn } from "@/lib/utils";

const orderTone: Record<OrderStatus, string> = {
  received: "bg-surface-hover text-foreground",
  washing: "bg-sky-400/10 text-sky-300",
  drying: "bg-amber-300/10 text-amber-200",
  ironing: "bg-violet-300/10 text-violet-200",
  ready: "bg-accent/15 text-accent",
  completed: "bg-emerald-300/10 text-emerald-200",
  cancelled: "bg-rose-300/10 text-rose-200",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span key={status} className={cn("status-badge inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", orderTone[status])}>{orderStatusLabels[status]}</span>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const labels: Record<PaymentStatus, string> = { paid: "Lunas", partial: "Sebagian", unpaid: "Belum bayar" };
  const tones: Record<PaymentStatus, string> = {
    paid: "bg-emerald-300/10 text-emerald-200",
    partial: "bg-amber-300/10 text-amber-200",
    unpaid: "bg-rose-300/10 text-rose-200",
  };
  return <span key={status} className={cn("status-badge inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", tones[status])}>{labels[status]}</span>;
}
