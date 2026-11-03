import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { ServicesManager } from "@/features/services/components/services-manager";
import { serviceCatalog } from "@/features/orders/data/mock-orders";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { getServicesService } from "@/server/modules/services/services.runtime";

export const metadata: Metadata = { title: "Layanan" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const session = await getAuthSession();
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const services = session && databaseEnabled
    ? await getServicesService().list(session.branchId)
    : serviceCatalog.map(({ id, name, description, unit, price, durationMinutes, isActive }) => ({
        id, name, description, unit: unit as "kg" | "pcs" | "pasang", price, durationMinutes, isActive,
      }));

  return (
    <>
      <PageHeader eyebrow="Katalog usaha" title="Layanan" description="Kelola nama, harga, satuan, estimasi, dan status layanan per cabang." />
      <ServicesManager initialServices={services} databaseEnabled={databaseEnabled} />
    </>
  );
}
