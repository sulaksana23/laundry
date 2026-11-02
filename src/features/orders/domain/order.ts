import { z } from "zod";

export const orderStatuses = [
  "received",
  "washing",
  "drying",
  "ironing",
  "ready",
  "completed",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = "paid" | "partial" | "unpaid";

export const orderStatusLabels: Record<OrderStatus, string> = {
  received: "Diterima",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  ready: "Siap diambil",
  completed: "Selesai",
};

export interface LaundryOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  weightKg: number;
  amount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  receivedAt: string;
  dueAt: string;
}

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Nama pelanggan minimal 2 karakter"),
  customerPhone: z.string().trim().min(8, "Nomor telepon belum valid"),
  serviceName: z.string().trim().min(1, "Pilih layanan"),
  weightKg: z.coerce.number().positive("Berat harus lebih dari 0"),
  dueAt: z.string().min(1, "Pilih tanggal selesai"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  received: ["washing"],
  washing: ["drying"],
  drying: ["ironing"],
  ironing: ["ready"],
  ready: ["completed"],
  completed: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return allowedTransitions[from].includes(to);
}
