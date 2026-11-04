import { serviceInputSchema, type LaundryService, type ServiceInput } from "@/features/services/domain/service";
import { PostgresServicesRepository } from "@/server/modules/services/services.repository";

export class ServiceNotFoundError extends Error {
  constructor() {
    super("Layanan tidak ditemukan pada cabang ini.");
    this.name = "ServiceNotFoundError";
  }
}

export class ServicesService {
  constructor(private readonly services: PostgresServicesRepository) {}

  list(branchId: string): Promise<LaundryService[]> {
    if (!branchId) throw new Error("Branch context wajib tersedia.");
    return this.services.list(branchId);
  }

  async create(branchId: string, actorId: string, rawInput: unknown): Promise<LaundryService> {
    if (!branchId) throw new Error("Branch context wajib tersedia.");
    if (!actorId) throw new Error("Aktor wajib tersedia.");
    const input = serviceInputSchema.parse(rawInput);
    return this.services.create(branchId, actorId, input);
  }

  async update(branchId: string, actorId: string, id: string, rawInput: unknown): Promise<LaundryService> {
    if (!branchId || !id) throw new Error("Branch context dan ID layanan wajib tersedia.");
    if (!actorId) throw new Error("Aktor wajib tersedia.");
    const input: ServiceInput = serviceInputSchema.parse(rawInput);
    const service = await this.services.update(branchId, actorId, id, input);
    if (!service) throw new ServiceNotFoundError();
    return service;
  }
}
