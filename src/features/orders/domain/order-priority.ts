import type { LaundryOrder, OrderStatus } from "./order";

export type OrderPriority = "overdue" | "today";

export function getOrderPriority(status: OrderStatus, dueDate: string, today: string): OrderPriority | null {
  if (status === "ready" || status === "completed") return null;
  const day = dueDate.slice(0, 10);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return null;
}

export function getDemoOrderPriorities(orders: LaundryOrder[], today: string) {
  const relevant = orders
    .map((order) => ({ order, priority: getOrderPriority(order.status, order.dueAt, today) }))
    .filter((item): item is { order: LaundryOrder; priority: OrderPriority } => item.priority !== null)
    .sort((a, b) => a.order.dueAt.localeCompare(b.order.dueAt) || a.order.id.localeCompare(b.order.id));
  return {
    overdue: relevant.filter((item) => item.priority === "overdue").length,
    today: relevant.filter((item) => item.priority === "today").length,
    items: relevant.slice(0, 5).map(({ order, priority }) => ({
      id: order.id,
      customerName: order.customerName,
      serviceName: order.serviceName,
      dueDate: order.dueAt.slice(0, 10),
      status: order.status,
      priority,
    })),
  };
}
