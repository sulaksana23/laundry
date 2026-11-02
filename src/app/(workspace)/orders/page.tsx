import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { OrdersView } from "@/features/orders/components/orders-view";
import { mockOrders } from "@/features/orders/data/mock-orders";
import { getLaundryBranchId, isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getOrdersService } from "@/server/modules/orders/orders.runtime";

export const metadata: Metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const databaseEnabled = isOrdersDatabaseEnabled();
  const orders = databaseEnabled
    ? (await getOrdersService().list({ branchId: getLaundryBranchId(), page: 1, pageSize: 100 })).items
    : mockOrders;
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());
  const active = orders.filter((order) => order.status !== "completed").length;
  const ready = orders.filter((order) => order.status === "ready").length;
  const today = orders.filter((order) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date(order.receivedAt)) === todayKey).length;
  const unpaid = orders.filter((order) => order.paymentStatus !== "paid").length;

  return (
    <>
      <PageHeader eyebrow="Operasional" title="Pesanan" description="Pantau alur cucian dari penerimaan hingga siap diambil." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Total hari ini</p><p className="mt-1 text-xl font-semibold">{today}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Sedang diproses</p><p className="mt-1 text-xl font-semibold">{active}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Siap diambil</p><p className="mt-1 text-xl font-semibold">{ready}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Belum lunas</p><p className="mt-1 text-xl font-semibold">{unpaid}</p></Card>
      </div>
      <OrdersView initialOrders={orders} databaseEnabled={databaseEnabled} />
    </>
  );
}
