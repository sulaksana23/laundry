const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number) {
  return idr.format(value).replace("Rp", "Rp ");
}

export function formatDate(value: string | Date, timeZone = "Asia/Makassar") {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

export function formatShortDate(value: string | Date, timeZone = "Asia/Makassar") {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone,
  }).format(new Date(value));
}
