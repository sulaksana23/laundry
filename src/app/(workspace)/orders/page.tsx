import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { OrdersView } from "@/features/orders/components/orders-view";
import { mockOrders } from "@/features/orders/data/mock-orders";

export const metadata: Metadata = { title: "Pesanan" };

export default function OrdersPage() {
  const active = mockOrders.filter((order) => order.status !== "completed").length;
  const ready = mockOrders.filter((order) => order.status === "ready").length;
  const today = mockOrders.filter((order) => order.receivedAt.startsWith("2026-11-02")).length;
  const unpaid = mockOrders.filter((order) => order.paymentStatus !== "paid").length;
  return (
    <>
      <PageHeader eyebrow="Operasional" title="Pesanan" description="Pantau alur cucian dari penerimaan hingga siap diambil." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Total hari ini</p><p className="mt-1 text-xl font-semibold">{today}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Sedang diproses</p><p className="mt-1 text-xl font-semibold">{active}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Siap diambil</p><p className="mt-1 text-xl font-semibold">{ready}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Belum lunas</p><p className="mt-1 text-xl font-semibold">{unpaid}</p></Card>
      </div>
      <OrdersView initialOrders={mockOrders} />
    </>
  );
}
