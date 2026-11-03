import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIp, isRateLimited, recordAttempt } from "@/server/modules/auth/rate-limit";
import { verifyLicenseKey } from "@/server/modules/license/license";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  key: z.string().min(8).max(4096),
});

// Verifikasi kode aktivasi bersifat publik (hanya memeriksa tanda tangan),
// dan dipakai halaman Pengaturan termasuk pada mode demo.
export async function POST(request: Request) {
  const rateKey = `license:${getClientIp(request)}`;
  if (isRateLimited(rateKey)) {
    return NextResponse.json({ valid: false, reason: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, reason: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    recordAttempt(rateKey);
    return NextResponse.json({ valid: false, reason: "Kode aktivasi tidak valid." }, { status: 400 });
  }

  const result = verifyLicenseKey(parsed.data.key);
  if (!result.valid) {
    recordAttempt(rateKey);
    return NextResponse.json({ valid: false, reason: result.reason });
  }
  return NextResponse.json({
    valid: true,
    payload: {
      name: result.payload.name,
      email: result.payload.email,
      plan: result.payload.plan,
      issuedAt: result.payload.issuedAt,
      expiresAt: result.payload.expiresAt,
    },
  });
}
