import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { OrdersView } from "@/features/orders/components/orders-view";
import { mockOrders, serviceCatalog } from "@/features/orders/data/mock-orders";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession, isAuthConfigured } from "@/server/modules/auth/auth.session";
import { getOrdersService } from "@/server/modules/orders/orders.runtime";
import { getOrderSummary } from "@/server/modules/workspace/operations";
import { getServicesService } from "@/server/modules/services/services.runtime";
import { isUuid } from "@/lib/uuid";
import { hasPermission } from "@/server/modules/auth/permissions";
import type { OrderUnit } from "@/features/orders/domain/order";
import { redactOrderForRole } from "@/server/modules/orders/order-access";

export const metadata: Metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ search?: string | string[]; customer?: string | string[] }> }) {
  const params = await searchParams;
  const initialQuery = typeof params.search === "string" ? params.search.trim().slice(0, 100) : "";
  if (params.customer !== undefined && (typeof params.customer !== "string" || !isUuid(params.customer))) notFound();
  const customerId = typeof params.customer === "string" ? params.customer : undefined;
  const session = await getAuthSession();
  const productionDemo = process.env.VERCEL_ENV === "production" && !isAuthConfigured();
  if (!session && !productionDemo) redirect("/login");
  if (session && !hasPermission(session.role, "orders:read")) redirect("/");
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  if (customerId && !databaseEnabled) notFound();
  const [ordersResult, servicesResult, databaseSummary] = session && databaseEnabled
    ? await Promise.all([
        getOrdersService().list({ branchId: session.branchId, page: 1, pageSize: 25, search: initialQuery || undefined, customerId }),
        getServicesService().list(session.branchId),
        getOrderSummary(session.branchId),
      ])
    : [null, null, null];
  const orders = ordersResult?.items ?? mockOrders;
  const safeOrders = session ? orders.map((order) => redactOrderForRole(order, session.role)) : orders;
  const availableServices = (servicesResult ?? serviceCatalog).filter((service) => service.isActive).map(({ id, name, unit, price }) => ({ id, name, unit: unit as OrderUnit, price }));
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date());
  const summary = databaseSummary ?? {
    active: orders.filter((order) => order.status !== "completed").length,
    ready: orders.filter((order) => order.status === "ready").length,
    today: orders.filter((order) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Makassar" }).format(new Date(order.receivedAt)) === todayKey).length,
    unpaid: orders.filter((order) => order.paymentStatus !== "paid").length,
  };

  return (
    <>
      <PageHeader eyebrow="Operasional" title="Pesanan" description="Pantau alur cucian dari penerimaan hingga siap diambil." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-3.5"><p className="text-[11px] text-muted">Total hari ini</p><p className="mt-1 text-xl font-semibold">{summary.today}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Sedang diproses</p><p className="mt-1 text-xl font-semibold">{summary.active}</p></Card>
        <Card className="p-3.5"><p className="text-[11px] text-muted">Siap diambil</p><p className="mt-1 text-xl font-semibold">{summary.ready}</p></Card>
        {(!session || hasPermission(session.role, "finance:read")) && <Card className="p-3.5"><p className="text-[11px] text-muted">Belum lunas</p><p className="mt-1 text-xl font-semibold">{summary.unpaid}</p></Card>}
      </div>
      <OrdersView key={customerId ?? "all"} initialOrders={safeOrders} initialTotal={ordersResult?.total ?? orders.length} initialQuery={initialQuery} customerId={customerId} databaseEnabled={databaseEnabled} availableServices={availableServices} canCreate={session ? hasPermission(session.role, "orders:create") : true} canAdvance={session ? hasPermission(session.role, "orders:advance") : true} canPay={session ? hasPermission(session.role, "payments:record") : true} canExport={session ? hasPermission(session.role, "orders:export") : true} canViewFinance={session ? hasPermission(session.role, "finance:read") : true} />
    </>
  );
}
