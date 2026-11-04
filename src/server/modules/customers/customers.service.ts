import type { CustomerMetrics, CustomerSummary } from "./customers.repository";

interface CustomersRepository {
  metrics(branchId: string): Promise<CustomerMetrics>;
  count(branchId: string, search: string): Promise<number>;
  list(branchId: string, search: string, page: number, pageSize: number): Promise<CustomerSummary[]>;
}

export interface CustomerDirectory {
  items: CustomerSummary[];
  total: number;
  page: number;
  pageSize: number;
  metrics: CustomerMetrics;
}

export class CustomersService {
  private readonly repository: CustomersRepository;
  constructor(repository: CustomersRepository) { this.repository = repository; }

  async directory(branchId: string, search: string, requestedPage: number, pageSize = 25): Promise<CustomerDirectory> {
    if (!branchId) throw new Error("Cabang wajib tersedia.");
    if (!Number.isSafeInteger(requestedPage) || requestedPage < 1) throw new Error("Nomor halaman tidak valid.");
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("Ukuran halaman tidak valid.");
    const query = search.trim().slice(0, 100);
    const [metrics, total] = await Promise.all([
      this.repository.metrics(branchId),
      this.repository.count(branchId, query),
    ]);
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / pageSize)));
    const items = await this.repository.list(branchId, query, page, pageSize);
    return { items, total, page, pageSize, metrics };
  }
}
