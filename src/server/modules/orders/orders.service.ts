import { canTransitionOrder, createOrderSchema, type CreateOrderInput, type OrderStatus } from "@/features/orders/domain/order";
import type { OrderListQuery, OrderListResult, OrderPricingPolicy, OrdersRepository } from "@/server/modules/orders/orders.repository";

export class OrderNotFoundError extends Error {
  constructor() { super("Pesanan tidak ditemukan."); this.name = "OrderNotFoundError"; }
}

export class InvalidOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Status pesanan tidak dapat berpindah dari ${from} ke ${to}.`);
    this.name = "InvalidOrderTransitionError";
  }
}

export class OrderConflictError extends Error {
  constructor() { super("Pesanan berubah oleh proses lain. Muat ulang data lalu coba lagi."); this.name = "OrderConflictError"; }
}

export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly pricing: OrderPricingPolicy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(query: OrderListQuery): Promise<OrderListResult> {
    if (!query.branchId) throw new Error("Branch context wajib tersedia.");
    if (!Number.isInteger(query.page) || query.page < 1) throw new Error("Nomor halaman tidak valid.");
    if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) throw new Error("Ukuran halaman tidak valid.");
    return this.orders.list(query);
  }

  async create(rawInput: unknown, branchId: string) {
    const parsed = createOrderSchema.safeParse(rawInput);
    if (!parsed.success) throw parsed.error;
    if (!branchId) throw new Error("Branch context wajib tersedia.");

    const amount = await this.pricing.calculate(parsed.data, branchId);
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Kebijakan harga mengembalikan nominal yang tidak valid.");

    return this.orders.create({
      ...parsed.data,
      branchId,
      amount,
      receivedAt: this.now().toISOString(),
    });
  }

  async advanceStatus(input: { id: string; branchId: string; actorId: string; nextStatus: OrderStatus }) {
    const current = await this.orders.findById(input.id, input.branchId);
    if (!current) throw new OrderNotFoundError();
    if (!canTransitionOrder(current.status, input.nextStatus)) {
      throw new InvalidOrderTransitionError(current.status, input.nextStatus);
    }

    try {
      return await this.orders.updateStatus({
        id: input.id,
        branchId: input.branchId,
        expectedStatus: current.status,
        nextStatus: input.nextStatus,
        actorId: input.actorId,
        changedAt: this.now().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ORDER_CONFLICT") {
        throw new OrderConflictError();
      }
      throw error;
    }
  }
}

export type { CreateOrderInput };
