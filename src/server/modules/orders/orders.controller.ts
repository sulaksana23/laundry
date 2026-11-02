import type { OrderListQuery } from "@/server/modules/orders/orders.repository";
import { OrdersService } from "@/server/modules/orders/orders.service";
import type { OrderStatus } from "@/features/orders/domain/order";

/** Adapter tipis untuk Route Handler; autentikasi dan branchId tetap wajib berasal dari sesi server. */
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  list(query: OrderListQuery) {
    return this.service.list(query);
  }

  create(payload: unknown, actor: { branchId: string }) {
    return this.service.create(payload, actor.branchId);
  }

  advanceStatus(input: { id: string; nextStatus: OrderStatus }, actor: { branchId: string; userId: string }) {
    return this.service.advanceStatus({
      id: input.id,
      nextStatus: input.nextStatus,
      branchId: actor.branchId,
      actorId: actor.userId,
    });
  }
}
