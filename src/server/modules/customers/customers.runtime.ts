import "server-only";
import { PostgresCustomersRepository } from "./customers.repository";
import { CustomersService } from "./customers.service";

export function getCustomersService() {
  return new CustomersService(new PostgresCustomersRepository());
}
