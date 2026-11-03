import "server-only";
import { randomUUID } from "node:crypto";
import type { LaundryService, ServiceInput, ServiceUnit } from "@/features/services/domain/service";
import { getNeonSql } from "@/server/db/neon";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  unit: ServiceUnit;
  price_per_unit: number | string;
  duration_minutes: number | string;
  is_active: boolean;
};

function rowsOf(result: unknown): ServiceRow[] {
  if (Array.isArray(result)) return result as ServiceRow[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as ServiceRow[];
  }
  return [];
}

function mapService(row: ServiceRow): LaundryService {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    price: Number(row.price_per_unit),
    durationMinutes: Number(row.duration_minutes),
    isActive: row.is_active,
  };
}

const serviceColumns = "id, name, description, unit, price_per_unit, duration_minutes, is_active";

export class PostgresServicesRepository {
  async list(branchId: string): Promise<LaundryService[]> {
    const result = await getNeonSql().query(
      "SELECT " + serviceColumns + " FROM laundry_services WHERE branch_id = $1 ORDER BY name ASC",
      [branchId],
    );
    return rowsOf(result).map(mapService);
  }

  async create(branchId: string, input: ServiceInput): Promise<LaundryService> {
    const result = await getNeonSql().query(
      "INSERT INTO laundry_services (id, branch_id, name, description, unit, price_per_unit, duration_minutes, is_active) " +
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING " + serviceColumns,
      [randomUUID(), branchId, input.name, input.description, input.unit, input.price, input.durationMinutes, input.isActive],
    );
    const row = rowsOf(result)[0];
    if (!row) throw new Error("SERVICE_CREATE_FAILED");
    return mapService(row);
  }

  async update(branchId: string, id: string, input: ServiceInput): Promise<LaundryService | null> {
    const result = await getNeonSql().query(
      "UPDATE laundry_services SET name = $3, description = $4, unit = $5, price_per_unit = $6, " +
        "duration_minutes = $7, is_active = $8, updated_at = now() " +
        "WHERE branch_id = $1 AND id = $2 RETURNING " + serviceColumns,
      [branchId, id, input.name, input.description, input.unit, input.price, input.durationMinutes, input.isActive],
    );
    const row = rowsOf(result)[0];
    return row ? mapService(row) : null;
  }
}
