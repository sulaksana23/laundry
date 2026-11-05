"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ban, CreditCard, Download, History, MessageCircle, Plus, Printer, RotateCcw, Search, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/ui/status-badge";
import { Card } from "@/components/ui/card";
import { createOrderSchema, orderStatusLabels, orderStatuses, type CreateOrderInput, type LaundryOrder, type OrderStatus, type OrderUnit } from "@/features/orders/domain/order";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { analyzeOrderCsv, type OrderImportAnalysis, type OrderImportRowError } from "@/lib/order-import";

type OrderServiceOption = { id: string; name: string; unit: OrderUnit; price: number };

type OrderHistoryEntry = { id: string; previousStatus: string | null; nextStatus: string; changedAt: string };

function whatsappUrl(order: LaundryOrder) {
  const digits = order.customerPhone.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  const international = digits.startsWith("62") ? digits : digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  const remaining = Math.max(0, order.amount - order.paidAmount);
  const message =
    `Halo ${order.customerName}, cucian Anda (pesanan ${order.id} · ${order.serviceName}) sudah selesai dan siap diambil. ` +
    (remaining > 0 ? `Sisa pembayaran ${formatCurrency(remaining)}. ` : "Pembayaran sudah lunas. ") +
    "Terima kasih sudah menggunakan layanan kami.";
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

const storageKey = "laundryos:orders:v1";
const filters = ["Semua", "Diterima", "Dicuci", "Dikeringkan", "Disetrika", "Siap diambil", "Selesai", "Dibatalkan"];
const orderPageSize = 25;
type DueFilter = "" | "today" | "overdue";
type PaymentFilter = "" | "unpaid" | "paid";
type OrderImportResult = { totalRows: number; validRows: number; inserted: number; invalidRows: number; duplicateFile: boolean; errors: OrderImportRowError[] };

const orderCsvHeaders = ["nama", "no_hp", "layanan", "jumlah", "target_selesai", "biaya_express", "biaya_antar", "diskon", "catatan_internal"];

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`;
}

function normalizeStoredOrder(value: unknown): LaundryOrder | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<LaundryOrder> & { weightKg?: number };
  const internalNote = typeof row.internalNote === "string" ? row.internalNote.slice(0, 500) : "";
  if (typeof row.quantity === "number" && ["kg", "pcs", "pasang"].includes(row.unit ?? "")) return { ...row, internalNote } as LaundryOrder;
  if (typeof row.weightKg === "number" && Number.isFinite(row.weightKg)) {
    const { weightKg, ...legacy } = row;
    return { ...legacy, quantity: weightKg, unit: "kg", internalNote } as LaundryOrder;
  }
  return null;
}

export function OrdersView({ initialOrders, initialTotal = initialOrders.length, initialQuery = "", initialStatus, initialDueFilter = "", initialPaymentFilter = "", todayLocal = "", customerId, databaseEnabled = false, availableServices, canCreate = true, canAdvance = true, canPay = true, canExport = true, canCancel = false, canViewFinance = true }: { initialOrders: LaundryOrder[]; initialTotal?: number; initialQuery?: string; initialStatus?: OrderStatus; initialDueFilter?: DueFilter; initialPaymentFilter?: PaymentFilter; todayLocal?: string; customerId?: string; databaseEnabled?: boolean; availableServices: OrderServiceOption[]; canCreate?: boolean; canAdvance?: boolean; canPay?: boolean; canExport?: boolean; canCancel?: boolean; canViewFinance?: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(initialTotal);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialActiveFilter = initialStatus ? orderStatusLabels[initialStatus] : "Semua";
  const [activeFilter, setActiveFilter] = useState(initialActiveFilter);
  const [dueFilter, setDueFilter] = useState<DueFilter>(initialDueFilter);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>(initialPaymentFilter);
  const lastRequest = useRef({ page: 1, query: initialQuery, activeFilter: initialActiveFilter, dueFilter: initialDueFilter, paymentFilter: initialPaymentFilter, refreshKey: 0 });
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importCsvText, setImportCsvText] = useState("");
  const [importAnalysis, setImportAnalysis] = useState<OrderImportAnalysis | null>(null);
  const [importReport, setImportReport] = useState<OrderImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [paymentOrder, setPaymentOrder] = useState<LaundryOrder | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<LaundryOrder | null>(null);
  const [historyOrder, setHistoryOrder] = useState<LaundryOrder | null>(null);
  const [historyEntries, setHistoryEntries] = useState<OrderHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  async function openHistory(order: LaundryOrder) {
    setHistoryOrder(order);
    setHistoryEntries([]);
    setHistoryError("");
    if (!databaseEnabled) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/history`, { credentials: "same-origin" });
      const result = await response.json() as { history?: OrderHistoryEntry[]; error?: string };
      if (!response.ok || !Array.isArray(result.history)) {
        setHistoryError(result.error ?? "Riwayat pesanan gagal dimuat.");
        return;
      }
      setHistoryEntries(result.history);
    } catch {
      setHistoryError("Tidak dapat memuat riwayat pesanan. Coba lagi.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!databaseEnabled) {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed: unknown = JSON.parse(saved);
            if (Array.isArray(parsed)) setOrders(parsed.map(normalizeStoredOrder).filter((order): order is LaundryOrder => order !== null));
            else window.localStorage.removeItem(storageKey);
          } catch {
            window.localStorage.removeItem(storageKey);
          }
        }
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [databaseEnabled]);

  useEffect(() => {
    if (ready && !databaseEnabled) window.localStorage.setItem(storageKey, JSON.stringify(orders));
  }, [orders, ready, databaseEnabled]);

  useEffect(() => {
    if (!databaseEnabled) return;
    const previous = lastRequest.current;
    if (previous.page === currentPage && previous.query === query && previous.activeFilter === activeFilter && previous.dueFilter === dueFilter && previous.paymentFilter === paymentFilter && previous.refreshKey === refreshKey) return;
    lastRequest.current = { page: currentPage, query, activeFilter, dueFilter, paymentFilter, refreshKey };

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingList(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(currentPage), pageSize: String(orderPageSize) });
        if (query.trim()) params.set("search", query.trim());
        if (customerId) params.set("customerId", customerId);
        const status = orderStatuses.find((value) => orderStatusLabels[value] === activeFilter);
        if (status) params.set("status", status);
        if (dueFilter) params.set("due", dueFilter);
        if (paymentFilter) params.set("payment", paymentFilter);
        const response = await fetch("/api/orders?" + params.toString(), { credentials: "same-origin", signal: controller.signal });
        const result = await response.json() as { items?: LaundryOrder[]; total?: number; error?: string };
        if (!response.ok || !Array.isArray(result.items) || !Number.isSafeInteger(result.total) || (result.total ?? -1) < 0) {
          setError(result.error ?? "Daftar pesanan gagal dimuat.");
          return;
        }
        setTotalOrders(result.total!);
        const lastPage = Math.max(1, Math.ceil(result.total! / orderPageSize));
        if (currentPage > lastPage) {
          setCurrentPage(lastPage);
          return;
        }
        setOrders(result.items);
      } catch {
        if (!controller.signal.aborted) setError("Tidak dapat memuat halaman pesanan. Coba lagi.");
      } finally {
        if (!controller.signal.aborted) setLoadingList(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [databaseEnabled, currentPage, query, activeFilter, dueFilter, paymentFilter, refreshKey, customerId]);

  const visibleOrders = useMemo(() => {
    if (databaseEnabled) return orders;
    return orders.filter((order) => {
      const matchesQuery = `${order.id} ${order.customerName} ${order.customerPhone}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = activeFilter === "Semua" || orderStatusLabels[order.status] === activeFilter;
      const isActive = order.status !== "completed" && order.status !== "cancelled";
      const dueDate = order.dueAt.slice(0, 10);
      const matchesDue = !dueFilter || (isActive && (dueFilter === "today" ? dueDate === todayLocal : dueDate < todayLocal));
      const matchesPayment = !paymentFilter || (order.status !== "cancelled" && (paymentFilter === "paid" ? order.paymentStatus === "paid" : order.paymentStatus !== "paid"));
      return matchesQuery && matchesFilter && matchesDue && matchesPayment;
    });
  }, [orders, query, activeFilter, dueFilter, paymentFilter, todayLocal, databaseEnabled]);
  const totalPages = databaseEnabled ? Math.max(1, Math.ceil(totalOrders / orderPageSize)) : 1;
  const rangeStart = totalOrders > 0 ? (currentPage - 1) * orderPageSize + 1 : 0;
  const rangeEnd = Math.min(currentPage * orderPageSize, totalOrders);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input: CreateOrderInput = {
      customerName: String(form.get("customerName") ?? ""),
      customerPhone: String(form.get("customerPhone") ?? ""),
      serviceName: String(form.get("serviceName") ?? ""),
      quantity: Number(form.get("quantity")),
      dueAt: String(form.get("dueAt") ?? ""),
      expressFee: Number(form.get("expressFee") ?? 0),
      deliveryFee: Number(form.get("deliveryFee") ?? 0),
      discountAmount: Number(form.get("discountAmount") ?? 0),
      internalNote: String(form.get("internalNote") ?? ""),
    };
    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Periksa kembali data pesanan.");
      return;
    }
    const service = availableServices.find((item) => item.name === parsed.data.serviceName);
    if (!service) { setError("Layanan yang dipilih tidak ditemukan."); return; }
    if (service.unit !== "kg" && !Number.isInteger(parsed.data.quantity)) { setError("Jumlah untuk layanan pcs atau pasang harus berupa bilangan bulat."); return; }
    if (service.unit === "kg" && Math.abs(parsed.data.quantity * 100 - Math.round(parsed.data.quantity * 100)) > 1e-8) { setError("Berat maksimal dua angka desimal."); return; }

    if (databaseEnabled) {
      setPendingAction("create");
      setError("");
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? "Pesanan gagal disimpan ke PostgreSQL.");
          return;
        }
        setCurrentPage(1);
        setQuery("");
        setActiveFilter("Semua");
        setDueFilter("");
        setPaymentFilter("");
        setRefreshKey((current) => current + 1);
        router.refresh();
        setDialogOpen(false);
        setSelectedServiceName("");
        formElement.reset();
      } catch {
        setError("Tidak dapat menghubungi server. Coba lagi.");
      } finally {
        setPendingAction("");
      }
      return;
    }

    const newOrder: LaundryOrder = {
      id: "LND-" + String(Date.now()).slice(-5),
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      serviceName: service.name,
      quantity: parsed.data.quantity,
      unit: service.unit,
      amount: (service.unit === "kg" ? Math.round(parsed.data.quantity * service.price) : parsed.data.quantity * service.price) + parsed.data.expressFee + parsed.data.deliveryFee - parsed.data.discountAmount,
      expressFee: parsed.data.expressFee,
      deliveryFee: parsed.data.deliveryFee,
      discountAmount: parsed.data.discountAmount,
      internalNote: parsed.data.internalNote,
      paidAmount: 0,
      paymentStatus: "unpaid",
      status: "received",
      receivedAt: new Date().toISOString(),
      dueAt: new Date(parsed.data.dueAt + "T18:00:00").toISOString(),
    };
    setOrders((current) => [newOrder, ...current]);
    setDialogOpen(false);
    setSelectedServiceName("");
    setError("");
    formElement.reset();
  }

  async function advanceOrder(orderId: string, currentStatus: OrderStatus) {
    const currentIndex = orderStatuses.indexOf(currentStatus);
    const nextStatus = orderStatuses[currentIndex + 1];
    if (!nextStatus) return;

    if (databaseEnabled) {
      setPendingAction(orderId);
      setError("");
      try {
        const response = await fetch("/api/orders/" + encodeURIComponent(orderId) + "/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextStatus }),
        });
        const result = await response.json();
        if (!response.ok) {
          setError(result.error ?? "Status pesanan gagal diperbarui.");
          return;
        }
        setOrders((current) => current.map((order) => order.id === orderId ? result.order as LaundryOrder : order));
        router.refresh();
      } catch {
        setError("Tidak dapat menghubungi server. Coba lagi.");
      } finally {
        setPendingAction("");
      }
      return;
    }

    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: nextStatus } : order));
  }

  async function cancelOrder(order: LaundryOrder) {
    if (!databaseEnabled || !canCancel) return;
    const reason = window.prompt("Alasan pembatalan pesanan (wajib):");
    if (!reason || reason.trim().length < 3) return;
    setPendingAction(order.id); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Pembatalan gagal disimpan."); return; }
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: "cancelled" } : item));
      router.refresh();
    } catch { setError("Tidak dapat menghubungi server. Coba lagi."); }
    finally { setPendingAction(""); }
  }

  async function refundOrder(order: LaundryOrder) {
    if (!databaseEnabled || !canCancel || order.paidAmount < 1) return;
    const amountInput = window.prompt(`Nominal refund (maks. Rp${order.paidAmount.toLocaleString("id-ID")}) untuk pesanan ${order.id}:`, String(order.paidAmount));
    if (amountInput === null) return;
    const amount = Number(amountInput.trim().replace(/[^\d]/g, ""));
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > order.paidAmount) {
      setError("Nominal refund harus berupa Rupiah dan tidak boleh melebihi pembayaran bersih.");
      return;
    }
    const methodInput = window.prompt("Metode refund (cash, transfer, qris, other):", "cash");
    if (methodInput === null) return;
    const method = methodInput.trim().toLowerCase();
    if (!["cash", "transfer", "qris", "other"].includes(method)) {
      setError("Metode refund harus cash, transfer, qris, atau other.");
      return;
    }
    const reason = window.prompt("Alasan refund (wajib):");
    if (!reason || reason.trim().length < 3) return;
    setPendingAction(order.id); setError("");
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/refunds`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, method, reason }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Refund gagal dicatat."); return; }
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, paidAmount: result.paidAmount, paymentStatus: result.paidAmount > 0 ? "partial" : "unpaid" } : item));
      router.refresh();
    } catch { setError("Tidak dapat menghubungi server. Coba lagi."); }
    finally { setPendingAction(""); }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentOrder) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const method = String(form.get("method") ?? "cash");
    const remaining = paymentOrder.amount - paymentOrder.paidAmount;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > remaining) {
      setError("Nominal pembayaran harus sesuai sisa tagihan.");
      return;
    }
    setPendingAction(paymentOrder.id);
    setError("");
    if (databaseEnabled) {
      try {
        const response = await fetch("/api/orders/" + encodeURIComponent(paymentOrder.id) + "/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, method }),
        });
        const result = await response.json();
        if (!response.ok) { setError(result.error ?? "Pembayaran gagal disimpan."); return; }
        setOrders((current) => current.map((order) => order.id === paymentOrder.id ? { ...order, paidAmount: result.paidAmount, paymentStatus: result.paymentStatus } : order));
        router.refresh();
        setPaymentOrder(null);
      } catch {
        setError("Tidak dapat menghubungi server. Coba lagi.");
      } finally {
        setPendingAction("");
      }
      return;
    }
    const paidAmount = paymentOrder.paidAmount + amount;
    setOrders((current) => current.map((order) => order.id === paymentOrder.id ? { ...order, paidAmount, paymentStatus: paidAmount >= order.amount ? "paid" : "partial" } : order));
    setPaymentOrder(null);
    setPendingAction("");
  }

  function exportOrders() {
    if (databaseEnabled) {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      const status = orderStatuses.find((value) => orderStatusLabels[value] === activeFilter);
      if (status) params.set("status", status);
      if (dueFilter) params.set("due", dueFilter);
      if (paymentFilter) params.set("payment", paymentFilter);
      const downloadLink = document.createElement("a");
      downloadLink.href = "/api/orders/export?" + params.toString();
      downloadLink.click();
      return;
    }
    const quote = (value: unknown) => "\"" + String(value ?? "").replaceAll("\"", "\"\"") + "\"";
    const rows = [
      ["Pesanan", "Pelanggan", "Telepon", "Layanan", "Jumlah", "Satuan", "Status", "Total (Rp)", "Dibayar (Rp)", "Sisa (Rp)"],
      ...visibleOrders.map((order) => [order.id, order.customerName, order.customerPhone, order.serviceName, order.quantity, order.unit, order.status, order.amount, order.paidAmount, order.amount - order.paidAmount]),
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    link.download = "pesanan-laundry.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function downloadOrderCsvTemplate() {
    const service = availableServices[0];
    const due = new Date();
    due.setDate(due.getDate() + 3);
    const dueAt = due.toISOString().slice(0, 10);
    const rows = [orderCsvHeaders.map(csvCell).join(",")];
    if (service) {
      rows.push([
        "Ni Made Ayu Lestari", "081234567890", service.name,
        service.unit === "kg" ? "2.5" : "2", dueAt, "0", "0", "0", "Pisahkan cucian putih",
      ].map(csvCell).join(","));
    }
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "contoh-impor-pesanan.csv";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleOrderCsvFile(file: File) {
    setImportError("");
    setImportReport(null);
    if (file.size > 512_000) {
      setImportFileName("");
      setImportCsvText("");
      setImportAnalysis(null);
      setImportError("Berkas melebihi 512 KB. Bagi menjadi beberapa file kecil lalu impor bergantian.");
      return;
    }
    try {
      const csvText = await file.text();
      setImportFileName(file.name);
      setImportCsvText(csvText);
      setImportAnalysis(analyzeOrderCsv(csvText, availableServices));
    } catch {
      setImportFileName("");
      setImportCsvText("");
      setImportAnalysis(null);
      setImportError("File CSV tidak dapat dibaca. Coba simpan ulang sebagai CSV UTF-8.");
    }
  }

  async function importOrdersFromFile() {
    if (!importAnalysis || importAnalysis.fatalError || importAnalysis.valid.length === 0 || importBusy) return;
    setImportBusy(true);
    setImportError("");
    setImportReport(null);
    try {
      if (databaseEnabled) {
        if (!importCsvText) { setImportError("Pilih kembali file CSV yang akan diimpor."); return; }
        const response = await fetch("/api/orders/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: importCsvText }),
        });
        const result = await response.json() as { report?: OrderImportResult; error?: string };
        if (!response.ok || !result.report) { setImportError(result.error ?? "Impor pesanan gagal diproses."); return; }
        setImportReport(result.report);
        if (!result.report.duplicateFile && result.report.inserted > 0) {
          setCurrentPage(1);
          setQuery("");
          setActiveFilter("Semua");
          setDueFilter("");
          setPaymentFilter("");
          setRefreshKey((current) => current + 1);
          router.refresh();
        }
        return;
      }

      const receivedAt = new Date();
      const newOrders: LaundryOrder[] = importAnalysis.valid.map((candidate) => ({
        id: "LND-" + receivedAt.toISOString().slice(0, 10).replaceAll("-", "") + "-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase(),
        customerName: candidate.customerName,
        customerPhone: candidate.customerPhone,
        serviceName: candidate.serviceName,
        quantity: candidate.quantity,
        unit: candidate.unit,
        amount: candidate.amount,
        expressFee: candidate.expressFee,
        deliveryFee: candidate.deliveryFee,
        discountAmount: candidate.discountAmount,
        internalNote: candidate.internalNote,
        paidAmount: 0,
        paymentStatus: "unpaid",
        status: "received",
        receivedAt: receivedAt.toISOString(),
        dueAt: new Date(candidate.dueAt + "T18:00:00").toISOString(),
      }));
      setOrders((current) => [...newOrders, ...current]);
      setTotalOrders((current) => current + newOrders.length);
      setImportReport({
        totalRows: importAnalysis.totalRows,
        validRows: importAnalysis.valid.length,
        inserted: newOrders.length,
        invalidRows: importAnalysis.errors.length,
        duplicateFile: false,
        errors: importAnalysis.errors,
      });
    } catch {
      setImportError("Koneksi bermasalah. Pesanan belum dipastikan tersimpan; muat ulang daftar sebelum mencoba lagi.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <>
      {customerId && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-xs"><span>Menampilkan riwayat pesanan pelanggan yang dipilih.</span><Link href="/orders" className="font-semibold text-accent hover:underline">Lihat semua pesanan</Link></div>}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">{filters.map((filter) => <button key={filter} onClick={() => { setActiveFilter(filter); setCurrentPage(1); }} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeFilter === filter ? "bg-accent text-accent-foreground" : "bg-surface text-muted hover:bg-surface-hover hover:text-foreground"}`}>{filter}</button>)}</div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1 lg:flex-none"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} placeholder="Cari nomor atau pelanggan" className="pl-9" /></div>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="order-due-filter">Filter jatuh tempo</label>
            <Select id="order-due-filter" value={dueFilter} onChange={(event) => { setDueFilter(event.target.value as DueFilter); setCurrentPage(1); }} aria-label="Filter jatuh tempo" className="h-9 min-w-36 w-auto px-2 text-xs">
              <option value="">Semua jatuh tempo</option><option value="today">Target hari ini</option><option value="overdue">Terlambat</option>
            </Select>
            {canViewFinance && <><label className="sr-only" htmlFor="order-payment-filter">Filter pembayaran</label><Select id="order-payment-filter" value={paymentFilter} onChange={(event) => { setPaymentFilter(event.target.value as PaymentFilter); setCurrentPage(1); }} aria-label="Filter pembayaran" className="h-9 min-w-36 w-auto px-2 text-xs">
              <option value="">Semua pembayaran</option><option value="unpaid">Belum lunas</option><option value="paid">Lunas</option>
            </Select></>}
          </div>
          {canExport && <Button variant="secondary" onClick={exportOrders} title="Ekspor seluruh pesanan sesuai filter sebagai CSV" aria-label="Ekspor seluruh pesanan sebagai CSV" className="h-9 px-2.5 text-xs"><Download size={14} /> <span className="hidden sm:inline">Ekspor pesanan</span></Button>}
          {canCreate && <Button variant="secondary" onClick={() => { setImportDialogOpen(true); setImportError(""); setImportReport(null); }} title="Impor pesanan dari CSV" className="h-9 px-2.5 text-xs"><Upload size={14} /> <span>Impor CSV</span></Button>}
          {canCreate && <Button variant="primary" onClick={() => setDialogOpen(true)}><Plus size={14} /> Pesanan baru</Button>}
        </div>
      </div>

      {error && !dialogOpen && <p role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="text-sm font-semibold">Daftar pesanan</p><p className="mt-0.5 text-[11px] text-muted">{loadingList ? "Memuat data pesanan…" : visibleOrders.length + " pesanan pada halaman ini"}</p></div><span className="text-[11px] text-muted">{databaseEnabled ? "Neon · Tersambung" : "Mode demo lokal"}</span></div>
        <div className="overflow-x-auto" aria-busy={loadingList}>
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead><tr className="bg-surface-raised/50 text-[10px] uppercase tracking-wide text-muted"><th className="px-4 py-3 font-medium">Pesanan / pelanggan</th><th className="px-3 py-3 font-medium">Layanan</th><th className="px-3 py-3 font-medium">Berat</th><th className="px-3 py-3 font-medium">Jatuh tempo</th><th className="px-3 py-3 font-medium">Status</th>{canViewFinance && <th className="px-3 py-3 font-medium">Pembayaran</th>}{canViewFinance && <th className="px-4 py-3 text-right font-medium">Total</th>}<th className="w-40 px-4 py-3 text-right font-medium">Aksi</th></tr></thead>
            <tbody>{visibleOrders.map((order) => <tr key={order.id} className="border-t border-border/70 transition hover:bg-surface-raised/50"><td className="px-4 py-3"><p className="font-semibold">{order.id}</p><p className="mt-1 text-[10px] text-muted">{order.customerName}{order.customerPhone ? " · " + order.customerPhone : ""}</p>{order.internalNote && <p title={"Catatan internal: " + order.internalNote} className="mt-1 max-w-52 truncate text-[10px] text-accent">Catatan internal: {order.internalNote}</p>}</td><td className="px-3 py-3 text-muted">{order.serviceName}</td><td className="px-3 py-3">{order.quantity} {order.unit}</td><td className="px-3 py-3 text-muted">{formatShortDate(order.dueAt)}</td><td className="px-3 py-3"><OrderStatusBadge status={order.status} /></td>{canViewFinance && <td className="px-3 py-3"><PaymentStatusBadge status={order.paymentStatus} /></td>}{canViewFinance && <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.amount)}</td>}<td className="px-4 py-3 text-right"><div className="flex flex-col items-end gap-1">{canViewFinance && <button type="button" aria-label={"Cetak nota pesanan " + order.id} title="Cetak nota" onClick={() => setReceiptOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted hover:border-accent/50 hover:text-accent"><Printer size={12} /> Nota</button>}<button type="button" aria-label={"Riwayat status pesanan " + order.id} title="Riwayat status" onClick={() => openHistory(order)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted hover:border-accent/50 hover:text-accent"><History size={12} /> Riwayat</button>{canViewFinance && order.status === "ready" && whatsappUrl(order) && <a href={whatsappUrl(order)!} target="_blank" rel="noopener noreferrer" aria-label={"Kabari pelanggan lewat WhatsApp untuk pesanan " + order.id} title="Kabari pelanggan lewat WhatsApp" className="inline-flex items-center gap-1 rounded-md border border-emerald-300/40 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-300/10"><MessageCircle size={12} /> WhatsApp</a>}{canCancel && databaseEnabled && order.status !== "completed" && order.status !== "cancelled" && <button disabled={pendingAction === order.id} onClick={() => void cancelOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-danger/30 px-2 py-1 text-[10px] font-medium text-danger hover:bg-danger/10 disabled:opacity-50"><Ban size={12} /> Batalkan</button>}{canCancel && databaseEnabled && order.status === "cancelled" && order.paidAmount > 0 && <button disabled={pendingAction === order.id} onClick={() => void refundOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-amber-300/30 px-2 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-300/10 disabled:opacity-50"><RotateCcw size={12} /> Refund</button>}{canPay && order.status !== "cancelled" && order.paymentStatus !== "paid" && <button onClick={() => { setPaymentOrder(order); setError(""); }} className="inline-flex items-center gap-1 rounded-md border border-accent/40 px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent/10"><CreditCard size={12} /> Catat bayar</button>}{canAdvance && (order.status !== "completed" && order.status !== "cancelled" ? <button aria-busy={pendingAction === order.id} disabled={pendingAction === order.id} onClick={() => advanceOrder(order.id, order.status)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium text-muted transition hover:border-accent/50 hover:text-accent disabled:cursor-wait disabled:opacity-50">{pendingAction === order.id ? <><Spinner className="size-3" /> Menyimpan…</> : "Lanjut proses"}</button> : <span className="text-[10px] text-muted">{order.status === "cancelled" ? "Dibatalkan" : "Selesai"}</span>)}</div></td></tr>)}</tbody>
          </table>
          {visibleOrders.length === 0 && <div className="p-12 text-center"><p className="text-sm font-medium">Pesanan tidak ditemukan</p><p className="mt-1 text-xs text-muted">Ubah kata kunci atau filter status.</p></div>}
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>{databaseEnabled ? `Menampilkan ${rangeStart}-${rangeEnd} dari ${totalOrders} pesanan` : `Menampilkan ${visibleOrders.length} dari ${orders.length} pesanan`}</span>
          {databaseEnabled ? (
            <nav className="flex items-center justify-between gap-3 sm:justify-end" aria-label="Navigasi halaman pesanan">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={loadingList || currentPage <= 1} aria-label="Halaman sebelumnya" className="rounded-md border border-border px-2.5 py-1.5 hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50">Sebelumnya</button>
              <span aria-live="polite">Halaman {currentPage} dari {totalPages}</span>
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={loadingList || currentPage >= totalPages} aria-label="Halaman berikutnya" className="rounded-md border border-border px-2.5 py-1.5 hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50">Berikutnya</button>
            </nav>
          ) : <span className="text-[10px]">Data demo</span>}
        </div>
      </Card>

      {canCreate && importDialogOpen && <div className="animate-overlay-enter fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5">
        <button type="button" aria-label="Tutup impor pesanan" className="absolute inset-0 bg-black/65" onClick={() => { if (!importBusy) setImportDialogOpen(false); }} />
        <section role="dialog" aria-modal="true" aria-labelledby="order-import-title" className="animate-dialog-enter relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:p-5">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Impor data</p><h2 id="order-import-title" className="mt-1 text-lg font-semibold">Impor pesanan dari CSV</h2><p className="mt-1 text-xs leading-5 text-muted">Tinjau baris dan harga sebelum menyimpan. Harga diambil dari katalog aktif cabang.</p></div>
            <button type="button" onClick={() => { if (!importBusy) setImportDialogOpen(false); }} aria-label="Tutup dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button>
          </header>
          <div className="mb-4 rounded-lg border border-border bg-surface-raised/40 p-3 text-[11px] leading-5 text-muted">
            <p>Kolom wajib: <strong>nama, no_hp, layanan, jumlah, target_selesai</strong> (YYYY-MM-DD).</p>
            <p>Kolom opsional: biaya_express, biaya_antar, diskon, catatan_internal. Maksimum 100 baris dan 512 KB. Pembayaran dimulai belum lunas.</p>
            <p>Baris tidak valid dilewati. Di database, file yang sama hanya dapat diimpor sekali per cabang. Impor membuat pesanan baru; data ini tidak mengubah pesanan yang sudah ada.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={importFileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" aria-label="Pilih berkas CSV pesanan" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleOrderCsvFile(file); event.target.value = ""; }} />
            <Button type="button" variant="secondary" onClick={() => importFileRef.current?.click()}><Upload size={14} /> Pilih file CSV</Button>
            <Button type="button" variant="secondary" onClick={downloadOrderCsvTemplate}><Download size={14} /> Unduh contoh format</Button>
            {importFileName && <span className="max-w-full truncate text-xs text-muted">{importFileName}</span>}
          </div>
          {!databaseEnabled && <p className="mt-2 text-[11px] text-muted">Mode demo: pesanan hasil impor tersimpan di browser ini saja.</p>}
          {importError && <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">{importError}</p>}
          {importAnalysis?.fatalError && <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-xs leading-5 text-danger">{importAnalysis.fatalError}</p>}
          {importAnalysis && !importAnalysis.fatalError && <div className="mt-4 rounded-lg border border-border bg-surface-raised/30 p-3">
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded-md bg-surface-hover px-2 py-1">Baris: <strong>{importAnalysis.totalRows}</strong></span>
              <span className="rounded-md bg-emerald-300/10 px-2 py-1 text-emerald-200">Siap diimpor: <strong>{importAnalysis.valid.length}</strong></span>
              <span className="rounded-md bg-rose-300/10 px-2 py-1 text-rose-200">Bermasalah: <strong>{importAnalysis.errors.length}</strong></span>
            </div>
            {importAnalysis.valid.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[480px] text-left text-[11px]"><thead><tr className="text-muted"><th className="px-2 py-1.5">Pelanggan</th><th className="px-2 py-1.5">Layanan</th><th className="px-2 py-1.5">Jumlah</th><th className="px-2 py-1.5">Target</th><th className="px-2 py-1.5 text-right">Estimasi tagihan</th></tr></thead><tbody>{importAnalysis.valid.slice(0, 5).map((row) => <tr key={row.row} className="border-t border-border/70"><td className="px-2 py-2">{row.customerName}</td><td className="px-2 py-2">{row.serviceName}</td><td className="px-2 py-2">{row.quantity} {row.unit}</td><td className="px-2 py-2">{row.dueAt}</td><td className="px-2 py-2 text-right">{formatCurrency(row.amount)}</td></tr>)}</tbody></table>{importAnalysis.valid.length > 5 && <p className="mt-2 text-[10px] text-muted">Pratinjau 5 dari {importAnalysis.valid.length} baris valid.</p>}</div>}
            {importAnalysis.errors.length > 0 && <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-[11px] leading-5 text-danger">{importAnalysis.errors.slice(0, 10).map((item) => <li key={item.row}>Baris {item.row}: {item.message}</li>)}{importAnalysis.errors.length > 10 && <li>…dan {importAnalysis.errors.length - 10} baris bermasalah lainnya.</li>}</ul>}
          </div>}
          {importReport && <div role="status" className="mt-3 rounded-lg border border-border bg-surface-raised/50 p-3 text-xs">
            <p className="font-semibold">{importReport.duplicateFile ? "File ini sudah pernah diimpor ke cabang ini." : "Impor selesai."}</p>
            <p className="mt-1 text-muted">Berhasil dibuat: {importReport.inserted} · Bermasalah: {importReport.invalidRows} · Total baris: {importReport.totalRows}</p>
            {importReport.errors.length > 0 && <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] leading-5 text-danger">{importReport.errors.slice(0, 10).map((item) => <li key={item.row}>Baris {item.row}: {item.message}</li>)}</ul>}
          </div>}
          <footer className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" onClick={() => { if (!importBusy) setImportDialogOpen(false); }}>Tutup</Button>
            <Button type="button" variant="primary" onClick={() => void importOrdersFromFile()} isLoading={importBusy} loadingText="Mengimpor…" disabled={!importAnalysis || Boolean(importAnalysis.fatalError) || importAnalysis.valid.length === 0}>Impor {importAnalysis?.valid.length ?? 0} pesanan</Button>
          </footer>
        </section>
      </div>}

      {paymentOrder && <div className="animate-overlay-enter fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/65" onClick={() => { setPaymentOrder(null); setError(""); }} />
        <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="animate-dialog-enter relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Pembayaran pesanan</p><h2 id="payment-title" className="mt-1 text-lg font-semibold">Catat pembayaran</h2><p className="mt-1 text-xs text-muted">{paymentOrder.id} · {paymentOrder.customerName}</p></div><button onClick={() => { setPaymentOrder(null); setError(""); }} aria-label="Tutup dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
          <div className="mb-3 rounded-lg bg-surface-raised p-3 text-xs"><div className="flex justify-between"><span className="text-muted">Total tagihan</span><strong>{formatCurrency(paymentOrder.amount)}</strong></div><div className="mt-1 flex justify-between"><span className="text-muted">Sudah dibayar</span><span>{formatCurrency(paymentOrder.paidAmount)}</span></div><div className="mt-2 flex justify-between border-t border-border pt-2"><span className="font-medium">Sisa tagihan</span><strong>{formatCurrency(paymentOrder.amount - paymentOrder.paidAmount)}</strong></div></div>
          <form onSubmit={recordPayment} className="space-y-3">
            <label className="block text-xs font-medium">Nominal pembayaran<Input name="amount" required type="number" min="1" max={paymentOrder.amount - paymentOrder.paidAmount} step="1" defaultValue={paymentOrder.amount - paymentOrder.paidAmount} className="mt-1.5" /></label>
            <label className="block text-xs font-medium">Metode pembayaran<Select name="method" defaultValue="cash" className="mt-1.5"><option value="cash">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option><option value="other">Lainnya</option></Select></label>
            {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" onClick={() => setPaymentOrder(null)}>Batal</Button><Button type="submit" variant="primary" isLoading={pendingAction === paymentOrder.id} loadingText="Menyimpan…">Simpan pembayaran</Button></div>
          </form>
        </div>
      </div>}
      {historyOrder && <div className="animate-overlay-enter fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/65" onClick={() => setHistoryOrder(null)} />
        <div role="dialog" aria-modal="true" aria-labelledby="history-title" className="animate-dialog-enter relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Riwayat status</p><h2 id="history-title" className="mt-1 text-lg font-semibold">{historyOrder.id}</h2><p className="mt-1 text-xs text-muted">{historyOrder.customerName} · {historyOrder.serviceName}</p></div><button onClick={() => setHistoryOrder(null)} aria-label="Tutup dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
          {historyLoading ? <p className="flex items-center gap-2 py-4 text-xs text-muted"><Spinner className="size-3.5" /> Memuat riwayat…</p>
            : historyError ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{historyError}</p>
            : !databaseEnabled ? <p className="py-2 text-xs leading-5 text-muted">Mode demo: riwayat perubahan status tersimpan hanya tersedia saat database aktif. Status saat ini: <span className="font-medium text-foreground">{orderStatusLabels[historyOrder.status]}</span>.</p>
            : historyEntries.length === 0 ? <p className="py-2 text-xs text-muted">Belum ada riwayat perubahan status untuk pesanan ini.</p>
            : <ol className="space-y-0">{historyEntries.map((entry, index) => <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">{index < historyEntries.length - 1 && <span className="absolute left-[5px] top-3 h-full w-px bg-border" />}<span className="relative z-10 mt-1 size-[11px] shrink-0 rounded-full border-2 border-accent bg-surface" /><div className="min-w-0"><p className="text-xs font-medium">{entry.previousStatus ? `${orderStatusLabels[entry.previousStatus as OrderStatus] ?? entry.previousStatus} → ` : ""}{orderStatusLabels[entry.nextStatus as OrderStatus] ?? entry.nextStatus}</p><p className="mt-0.5 text-[10px] text-muted">{formatShortDate(entry.changedAt)} · {new Date(entry.changedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" })} WITA</p></div></li>)}</ol>}
        </div>
      </div>}
      {canCreate && dialogOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button type="button" aria-label="Tutup dialog" className="absolute inset-0 bg-black/65" onClick={() => setDialogOpen(false)} />
        <div role="dialog" aria-modal="true" aria-labelledby="new-order-title" className="animate-dialog-enter relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-accent">Transaksi baru</p><h2 id="new-order-title" className="mt-1 text-lg font-semibold">Buat pesanan</h2><p className="mt-1 text-xs text-muted">Isi data pelanggan dan layanan laundry.</p></div><button onClick={() => setDialogOpen(false)} aria-label="Tutup dialog" className="rounded-md p-1.5 text-muted hover:bg-surface-hover"><X size={16} /></button></div>
          <form onSubmit={handleCreate} className="space-y-3">
            <label className="block text-xs font-medium">Nama pelanggan<Input name="customerName" required minLength={2} placeholder="Contoh: Made Arya" className="mt-1.5" /></label>
            <label className="block text-xs font-medium">Nomor telepon<Input name="customerPhone" required placeholder="08xx xxxx xxxx" className="mt-1.5" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium">Layanan<Select name="serviceName" required value={selectedServiceName} onChange={(event) => setSelectedServiceName(event.target.value)} className="mt-1.5"><option value="">Pilih layanan</option>{availableServices.map((service) => <option key={service.id} value={service.name}>{service.name} · {formatCurrency(service.price)}/{service.unit}</option>)}</Select></label><label className="block text-xs font-medium">{selectedServiceName && availableServices.find((service) => service.name === selectedServiceName)?.unit === "kg" ? "Berat (kg)" : selectedServiceName ? "Jumlah (" + (availableServices.find((service) => service.name === selectedServiceName)?.unit ?? "unit") + ")" : "Jumlah / berat"}<Input name="quantity" required type="number" min={selectedServiceName && availableServices.find((service) => service.name === selectedServiceName)?.unit === "kg" ? "0.01" : "1"} step={selectedServiceName && availableServices.find((service) => service.name === selectedServiceName)?.unit === "kg" ? "0.01" : "1"} placeholder={selectedServiceName && availableServices.find((service) => service.name === selectedServiceName)?.unit === "kg" ? "3.5" : "1"} className="mt-1.5" /></label></div>
            <label className="block text-xs font-medium">Target selesai<Input name="dueAt" required type="date" className="mt-1.5" /></label>
            <div className="grid gap-3 sm:grid-cols-3"><label className="block text-xs font-medium">Biaya express (Rp)<Input name="expressFee" type="number" min="0" step="1" defaultValue="0" className="mt-1.5" /></label><label className="block text-xs font-medium">Biaya antar (Rp)<Input name="deliveryFee" type="number" min="0" step="1" defaultValue="0" className="mt-1.5" /></label><label className="block text-xs font-medium">Diskon (Rp)<Input name="discountAmount" type="number" min="0" step="1" defaultValue="0" className="mt-1.5" /></label></div>
            <label className="block text-xs font-medium">Catatan internal <span className="font-normal text-muted">(opsional, tidak tampil di pelanggan)</span><textarea name="internalNote" maxLength={500} rows={3} placeholder="Contoh: noda di lengan kiri, pisahkan cucian putih" className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" /></label>
            {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit" variant="primary" isLoading={pendingAction === "create"} loadingText="Menyimpan…">Simpan pesanan</Button></div>
          </form>
        </div>
      </div>}
      {receiptOrder && (
        <div id="laundry-receipt" role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="animate-overlay-enter fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <section className="receipt-sheet animate-dialog-enter relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-foreground shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">LaundryOS</p>
                <h2 id="receipt-title" className="mt-1 text-lg font-semibold">Nota pesanan</h2>
                <p className="mt-1 text-xs text-muted">{receiptOrder.id}</p>
              </div>
              <div className="flex shrink-0 gap-2 print:hidden">
                <Button type="button" variant="primary" onClick={() => window.print()}><Printer size={14} /> Cetak</Button>
                <Button type="button" aria-label="Tutup nota" onClick={() => setReceiptOrder(null)}><X size={14} /></Button>
              </div>
            </header>
            <div className="space-y-3 py-4 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">Pelanggan</p>
                <p className="mt-1 font-semibold">{receiptOrder.customerName}</p>
                <p className="mt-0.5 text-muted">{receiptOrder.customerPhone}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-y border-border py-3">
                <div><p className="text-[10px] uppercase tracking-wide text-muted">Tanggal masuk</p><p className="mt-1">{formatShortDate(receiptOrder.receivedAt)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wide text-muted">Target selesai</p><p className="mt-1">{formatShortDate(receiptOrder.dueAt)}</p></div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted">Layanan</p>
                <div className="mt-1 flex justify-between gap-3"><span>{receiptOrder.serviceName}</span><span>{receiptOrder.quantity} {receiptOrder.unit}</span></div>
              </div>
              <div className="space-y-1.5 border-t border-border pt-3">
                {(receiptOrder.expressFee ?? 0) > 0 && <div className="flex justify-between gap-3"><span className="text-muted">Biaya express</span><span>{formatCurrency(receiptOrder.expressFee!)}</span></div>}
                {(receiptOrder.deliveryFee ?? 0) > 0 && <div className="flex justify-between gap-3"><span className="text-muted">Biaya antar</span><span>{formatCurrency(receiptOrder.deliveryFee!)}</span></div>}
                {(receiptOrder.discountAmount ?? 0) > 0 && <div className="flex justify-between gap-3"><span className="text-muted">Diskon</span><span>−{formatCurrency(receiptOrder.discountAmount!)}</span></div>}
                <div className="flex justify-between gap-3"><span className="text-muted">Total tagihan</span><strong>{formatCurrency(receiptOrder.amount)}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-muted">Sudah dibayar</span><span>{formatCurrency(receiptOrder.paidAmount)}</span></div>
                <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold"><span>Sisa tagihan</span><span>{formatCurrency(Math.max(0, receiptOrder.amount - receiptOrder.paidAmount))}</span></div>
              </div>
              <p className="border-t border-border pt-3 text-[10px] text-muted">Status: {orderStatusLabels[receiptOrder.status]} · {receiptOrder.paymentStatus === "paid" ? "Lunas" : receiptOrder.paymentStatus === "partial" ? "Dibayar sebagian" : "Belum dibayar"}</p>
              <p className="text-center text-[10px] leading-5 text-muted">Simpan nota ini untuk pengambilan cucian. Lacak di <Link href="/lacak" className="font-semibold text-accent">/lacak</Link> dengan memasukkan kode pesanan dan nomor HP yang terdaftar.</p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
