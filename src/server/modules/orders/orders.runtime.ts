import "server-only";
import { getNeonSql } from "@/server/db/neon";
import { OrdersService } from "@/server/modules/orders/orders.service";
import { PostgresOrdersRepository } from "@/server/modules/orders/postgres-orders.repository";

export function getOrdersService() {
  const sql = getNeonSql();
  const pricing = {
    async calculate(input: { serviceName: string; weightKg: number }, branchId: string) {
      const rows = await sql`SELECT price_per_unit FROM laundry_services WHERE branch_id = ${branchId} AND name = ${input.serviceName} AND unit = 'kg' AND is_active = true LIMIT 1`;
      const service = rows[0] as { price_per_unit: number | string } | undefined;
      if (!service) throw new Error("Layanan tidak tersedia pada cabang ini.");
      const amount = Math.round(input.weightKg * Number(service.price_per_unit));
      if (!Number.isSafeInteger(amount)) throw new Error("Total pesanan tidak valid.");
      return amount;
    },
  };

  return new OrdersService(new PostgresOrdersRepository(), pricing);
}
