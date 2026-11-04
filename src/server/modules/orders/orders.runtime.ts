import "server-only";
import { getNeonSql } from "@/server/db/neon";
import { OrdersService } from "@/server/modules/orders/orders.service";
import { PostgresOrdersRepository } from "@/server/modules/orders/postgres-orders.repository";

export function getOrdersService() {
  const sql = getNeonSql();
  const pricing = {
    async calculate(input: { serviceName: string; quantity: number }, branchId: string) {
      const rows = await sql`SELECT price_per_unit, unit FROM laundry_services WHERE branch_id = ${branchId} AND name = ${input.serviceName} AND is_active = true LIMIT 1`;
      const service = (rows as unknown as Array<{ price_per_unit: number | string; unit: "kg" | "pcs" | "pasang" }>)[0];
      if (!service) throw new Error("Layanan tidak tersedia pada cabang ini.");
      if (service.unit !== "kg" && !Number.isInteger(input.quantity)) throw new Error("Jumlah untuk layanan pcs atau pasang harus berupa bilangan bulat.");
      if (service.unit === "kg" && Math.abs(input.quantity * 100 - Math.round(input.quantity * 100)) > 1e-8) throw new Error("Berat maksimal dua angka desimal.");
      const unitPrice = Number(service.price_per_unit);
      const amount = service.unit === "kg" ? Math.round(input.quantity * unitPrice) : input.quantity * unitPrice;
      if (!Number.isSafeInteger(amount)) throw new Error("Total pesanan tidak valid.");
      return { amount, unit: service.unit, unitPrice };
    },
  };

  return new OrdersService(new PostgresOrdersRepository(), pricing);
}
