import { z } from "zod";

export const orderStatuses = [
  "received",
  "washing",
  "drying",
  "ironing",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type PaymentStatus = "paid" | "partial" | "unpaid";
export type OrderUnit = "kg" | "pcs" | "pasang";

export const orderStatusLabels: Record<OrderStatus, string> = {
  received: "Diterima",
  washing: "Dicuci",
  drying: "Dikeringkan",
  ironing: "Disetrika",
  ready: "Siap diambil",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export interface LaundryOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  quantity: number;
  unit: OrderUnit;
  amount: number;
  expressFee?: number;
  deliveryFee?: number;
  discountAmount?: number;
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
  quantity: z.coerce.number().positive("Jumlah harus lebih dari 0").max(100000),
  dueAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal selesai yang valid"),
  expressFee: z.coerce.number().int().min(0).max(100000000).default(0),
  deliveryFee: z.coerce.number().int().min(0).max(100000000).default(0),
  discountAmount: z.coerce.number().int().min(0).max(100000000).default(0),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  received: ["washing"],
  washing: ["drying"],
  drying: ["ironing"],
  ironing: ["ready"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return allowedTransitions[from].includes(to);
}
