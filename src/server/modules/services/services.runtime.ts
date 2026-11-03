import "server-only";
import { PostgresServicesRepository } from "@/server/modules/services/services.repository";
import { ServicesService } from "@/server/modules/services/services.service";

export function getServicesService() {
  return new ServicesService(new PostgresServicesRepository());
}
