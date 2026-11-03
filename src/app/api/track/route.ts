import { NextResponse } from "next/server";

import { isValidPhoneNumber } from "@/lib/phone";
import { getClientIp, isRateLimited, recordAttempt } from "@/server/modules/auth/rate-limit";
import { findTrackedOrder } from "@/server/modules/tracking/track-order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NOT_FOUND = "Pesanan tidak ditemukan. Periksa kembali kode pesanan dan nomor HP yang terdaftar saat pemesanan.";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rateKey = `track:${getClientIp(request)}`;
  if (isRateLimited(rateKey)) {
    return json({ error: "Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit." }, 429);
  }
  recordAttempt(rateKey);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Format permintaan tidak valid." }, 400);
  }

  const body = (payload ?? {}) as { code?: unknown; phone?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (code.length < 4 || code.length > 40) {
    return json({ error: "Kode pesanan tidak valid." }, 400);
  }
  if (!isValidPhoneNumber(phone)) {
    return json({ error: "Nomor HP tidak valid. Gunakan nomor yang terdaftar saat pemesanan." }, 400);
  }

  try {
    const order = await findTrackedOrder(code, phone);
    if (!order) return json({ error: NOT_FOUND }, 404);
    return json({ order });
  } catch {
    return json({ error: "Pelacakan sedang bermasalah. Silakan coba lagi nanti." }, 500);
  }
}
