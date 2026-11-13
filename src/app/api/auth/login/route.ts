import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/server/modules/auth/auth.service";
import { isAuthConfigured, setAuthSession } from "@/server/modules/auth/auth.session";
import { clearRateLimitAttempts, consumeRateLimitAttempt, getClientIp } from "@/server/modules/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().trim().email("Email tidak valid.").max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Login belum aktif. Hubungkan DATABASE_URL dan AUTH_SECRET pada environment Preview." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data masuk tidak valid." }, { status: 400 });
  }

  // Dua penghitung: per IP (menahan tebakan massal) dan per IP+email (yang
  // di-reset saat login berhasil). Penghitung per IP tidak pernah di-reset,
  // sehingga login sukses ke akun sendiri tidak membuka kembali tebakan ke akun lain.
  const clientIp = getClientIp(request);
  const ipKey = `login:${clientIp}`;
  const accountKey = `login:${clientIp}:${parsed.data.email.toLowerCase()}`;
  const [ipLimited, accountLimited] = await Promise.all([
    consumeRateLimitAttempt(ipKey),
    consumeRateLimitAttempt(accountKey),
  ]);
  if (ipLimited || accountLimited) {
    return NextResponse.json({ error: "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit." }, { status: 429 });
  }

  try {
    const user = await new AuthService().login(parsed.data.email, parsed.data.password);
    await clearRateLimitAttempts(accountKey);
    await setAuthSession(user);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return NextResponse.json({ error: "Email atau kata sandi salah." }, { status: 401 });
    }
    return NextResponse.json({ error: "Login gagal. Coba lagi nanti." }, { status: 500 });
  }
}
