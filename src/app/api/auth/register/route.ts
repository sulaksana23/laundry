import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/server/modules/auth/auth.service";
import { isAuthConfigured, setAuthSession } from "@/server/modules/auth/auth.session";
import { getClientIp, isRateLimited, recordAttempt } from "@/server/modules/auth/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 karakter.").max(80),
  branchName: z.string().trim().min(2, "Nama usaha minimal 2 karakter.").max(100),
  email: z.string().trim().email("Email tidak valid.").max(254),
  password: z.string().min(10, "Kata sandi minimal 10 karakter.").max(128),
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
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid." }, { status: 400 });
  }

  const rateLimitKey = `register:${getClientIp(request)}:${parsed.data.email.toLowerCase()}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan pendaftaran. Coba lagi dalam beberapa menit." }, { status: 429 });
  }
  recordAttempt(rateLimitKey);

  try {
    const user = await new AuthService().register(parsed.data);
    await setAuthSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") {
      return NextResponse.json({ error: "Email sudah terdaftar. Silakan masuk." }, { status: 409 });
    }
    return NextResponse.json({ error: "Pendaftaran gagal. Coba lagi nanti." }, { status: 500 });
  }
}
