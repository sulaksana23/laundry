import type { LaundryOrder } from "@/features/orders/domain/order";

// Semua identitas dan nomor kontak di bawah adalah fixture sintetis, bukan data pelanggan nyata.
export const mockOrders: LaundryOrder[] = [
  { id: "LND-24018", customerName: "Pelanggan A", customerPhone: "08XX-XXXX-0001", serviceName: "Cuci + Setrika", quantity: 4.5, unit: "kg", amount: 36000, paidAmount: 36000, paymentStatus: "paid", status: "washing", receivedAt: "2026-11-02T08:35:00+08:00", dueAt: "2026-11-03T18:00:00+08:00" },
  { id: "LND-24017", customerName: "Pelanggan B", customerPhone: "08XX-XXXX-0002", serviceName: "Cuci Kering", quantity: 3, unit: "kg", amount: 18000, paidAmount: 10000, paymentStatus: "partial", status: "ready", receivedAt: "2026-11-02T08:10:00+08:00", dueAt: "2026-11-02T19:00:00+08:00" },
  { id: "LND-24016", customerName: "Pelanggan C", customerPhone: "08XX-XXXX-0003", serviceName: "Setrika Saja", quantity: 2.5, unit: "kg", amount: 20000, paidAmount: 0, paymentStatus: "unpaid", status: "ironing", receivedAt: "2026-11-02T07:45:00+08:00", dueAt: "2026-11-03T12:00:00+08:00" },
  { id: "LND-24015", customerName: "Pelanggan D", customerPhone: "08XX-XXXX-0004", serviceName: "Cuci + Setrika", quantity: 6, unit: "kg", amount: 48000, paidAmount: 48000, paymentStatus: "paid", status: "drying", receivedAt: "2026-11-01T16:20:00+08:00", dueAt: "2026-11-03T16:00:00+08:00" },
  { id: "LND-24014", customerName: "Pelanggan E", customerPhone: "08XX-XXXX-0005", serviceName: "Express 6 Jam", quantity: 2, unit: "kg", amount: 24000, paidAmount: 24000, paymentStatus: "paid", status: "completed", receivedAt: "2026-11-01T11:30:00+08:00", dueAt: "2026-11-01T17:30:00+08:00" },
  { id: "LND-24013", customerName: "Pelanggan F", customerPhone: "08XX-XXXX-0006", serviceName: "Cuci Kering", quantity: 5, unit: "kg", amount: 30000, paidAmount: 0, paymentStatus: "unpaid", status: "received", receivedAt: "2026-11-01T10:15:00+08:00", dueAt: "2026-11-03T18:00:00+08:00" },
];

export const serviceCatalog = [
  { id: "svc-wash-iron", name: "Cuci + Setrika", description: "Cuci, keringkan, dan setrika", unit: "kg", price: 8000, duration: "2 hari", durationMinutes: 2880, isActive: true },
  { id: "svc-dry", name: "Cuci Kering", description: "Cuci dan keringkan", unit: "kg", price: 6000, duration: "1 hari", durationMinutes: 1440, isActive: true },
  { id: "svc-iron", name: "Setrika Saja", description: "Setrika pakaian bersih", unit: "kg", price: 8000, duration: "1 hari", durationMinutes: 1440, isActive: true },
  { id: "svc-express", name: "Express 6 Jam", description: "Prioritas selesai maksimal 6 jam", unit: "kg", price: 12000, duration: "6 jam", durationMinutes: 360, isActive: true },
  { id: "svc-bedcover", name: "Bed cover", description: "Cuci khusus perlengkapan tidur", unit: "pcs", price: 25000, duration: "2 hari", durationMinutes: 2880, isActive: true },
  { id: "svc-shoes", name: "Cuci sepatu", description: "Pembersihan sepatu per pasang", unit: "pasang", price: 35000, duration: "3 hari", durationMinutes: 4320, isActive: true },
];

export const customers = [
  { id: "CUS-001", name: "Pelanggan A", phone: "08XX-XXXX-0001", orders: 18, totalSpent: 645000, lastOrder: "2026-11-02" },
  { id: "CUS-002", name: "Pelanggan B", phone: "08XX-XXXX-0002", orders: 12, totalSpent: 421000, lastOrder: "2026-11-02" },
  { id: "CUS-003", name: "Pelanggan C", phone: "08XX-XXXX-0003", orders: 9, totalSpent: 318000, lastOrder: "2026-11-02" },
  { id: "CUS-004", name: "Pelanggan D", phone: "08XX-XXXX-0004", orders: 7, totalSpent: 287000, lastOrder: "2026-11-01" },
  { id: "CUS-005", name: "Pelanggan E", phone: "08XX-XXXX-0005", orders: 22, totalSpent: 892000, lastOrder: "2026-11-01" },
  { id: "CUS-006", name: "Pelanggan F", phone: "08XX-XXXX-0006", orders: 4, totalSpent: 112000, lastOrder: "2026-11-01" },
];

export const inventoryItems = [
  { id: "INV-001", name: "Detergen cair", category: "Bahan cuci", unit: "liter", stock: 8, minStock: 10, price: 42000 },
  { id: "INV-002", name: "Pewangi laundry", category: "Bahan cuci", unit: "liter", stock: 14, minStock: 8, price: 38000 },
  { id: "INV-003", name: "Plastik kemasan M", category: "Kemasan", unit: "pak", stock: 6, minStock: 5, price: 27000 },
  { id: "INV-004", name: "Plastik kemasan L", category: "Kemasan", unit: "pak", stock: 3, minStock: 5, price: 35000 },
  { id: "INV-005", name: "Pelembut pakaian", category: "Bahan cuci", unit: "liter", stock: 11, minStock: 8, price: 36000 },
];

export const expenseItems = [
  { id: "EXP-091", label: "Pembelian detergen", category: "Bahan baku", amount: 210000, date: "2026-11-02", method: "Tunai" },
  { id: "EXP-090", label: "Tagihan listrik", category: "Utilitas", amount: 785000, date: "2026-11-01", method: "Transfer" },
  { id: "EXP-089", label: "Perbaikan mesin pengering", category: "Perawatan", amount: 325000, date: "2026-10-31", method: "Tunai" },
];
