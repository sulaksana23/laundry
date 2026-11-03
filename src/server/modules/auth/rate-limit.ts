import "server-only";

// Pembatas percobaan masuk/daftar sederhana di memori proses.
// Cukup untuk satu instance; deployment multi-instance sebaiknya memakai penyimpanan bersama.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

const attempts = new Map<string, { count: number; windowStart: number }>();

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function isRateLimited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordAttempt(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
