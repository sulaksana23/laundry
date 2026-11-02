import type { CreateOrderInput, LaundryOrder, OrderStatus } from "@/features/orders/domain/order";

export interface OrderListQuery {
  branchId: string;
  search?: string;
  status?: OrderStatus;
  page: number;
  pageSize: number;
}

export interface OrderListResult {
  items: LaundryOrder[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewOrderRecord extends CreateOrderInput {
  branchId: string;
  amount: number;
  receivedAt: string;
}

export interface UpdateOrderStatusRecord {
  id: string;
  branchId: string;
  expectedStatus: OrderStatus;
  nextStatus: OrderStatus;
  actorId: string;
  changedAt: string;
}

/** Port penyimpanan; implementasi PostgreSQL/ORM ditambahkan saat backend diputuskan. */
export interface OrdersRepository {
  list(query: OrderListQuery): Promise<OrderListResult>;
  findById(id: string, branchId: string): Promise<LaundryOrder | null>;
  create(input: NewOrderRecord): Promise<LaundryOrder>;
  updateStatus(input: UpdateOrderStatusRecord): Promise<LaundryOrder>;
}

/** Harga harus diambil dari katalog pada server, bukan dari angka kiriman browser. */
export interface OrderPricingPolicy {
  calculate(input: CreateOrderInput, branchId: string): Promise<number>;
}
