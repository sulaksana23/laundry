import type { LaundryOrder } from "@/features/orders/domain/order";
import type { AuthRole } from "@/server/modules/auth/auth.repository";
import { hasPermission } from "@/server/modules/auth/permissions";

export function redactOrderForRole(order: LaundryOrder, role: AuthRole): LaundryOrder {
  if (hasPermission(role, "finance:read")) return order;
  return { ...order, customerPhone: "", amount: 0, paidAmount: 0, paymentStatus: "unpaid" };
}
