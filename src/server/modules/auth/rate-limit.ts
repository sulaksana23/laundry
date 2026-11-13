import "server-only";

import { createHmac } from "node:crypto";
import { getNeonSql } from "@/server/db/neon";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const localAttempts = new Map<string, { count: number; windowStart: number }>();
let cleanupCounter = 0;

function hashKey(key: string) {
  const secret = process.env.AUTH_SECRET || process.env.DATABASE_URL || "laundry-rate-limit-fallback";
  return createHmac("sha256", secret).update(key).digest("hex");
}

/**
 * IP klien untuk rate limit. Hanya header yang ditulis ulang oleh proxy
 * tepercaya yang dipakai: default `x-real-ip` (diisi Vercel). Untuk deploy di
 * luar Vercel, set LAUNDRY_CLIENT_IP_HEADER ke header yang diisi proxy Anda
 * (mis. `cf-connecting-ip`). `x-forwarded-for` tidak dibaca karena bagian
 * awalnya bisa diisi bebas oleh klien.
 */
export function getClientIp(request: Request) {
  const header = (process.env.LAUNDRY_CLIENT_IP_HEADER || "x-real-ip").trim().toLowerCase();
  return request.headers.get(header)?.split(",")[0]?.trim() || "unknown";
}

function consumeLocally(keyHash: string) {
  const now = Date.now();
  if (localAttempts.size > 2_000) {
    for (const [candidate, value] of localAttempts) {
      if (now - value.windowStart >= WINDOW_MS) localAttempts.delete(candidate);
    }
    if (localAttempts.size > 2_000) {
      for (const candidate of localAttempts.keys()) {
        localAttempts.delete(candidate);
        if (localAttempts.size <= 1_500) break;
      }
    }
  }
  const entry = localAttempts.get(keyHash);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    localAttempts.set(keyHash, { count: 1, windowStart: now });
    return false;
  }
  entry.count = Math.min(entry.count + 1, MAX_ATTEMPTS + 1);
  return entry.count > MAX_ATTEMPTS;
}

/**
 * Consume one attempt using Neon so separate Vercel instances share the same
 * window. A bounded in-process fallback keeps demo and temporary DB failures usable.
 */
export async function consumeRateLimitAttempt(key: string): Promise<boolean> {
  const keyHash = hashKey(key);
  try {
    const result = await getNeonSql().query(
      "INSERT INTO laundry_rate_limits (key_hash, attempts, window_started_at, updated_at) " +
      "VALUES ($1, 1, now(), now()) ON CONFLICT (key_hash) DO UPDATE SET " +
      "attempts = CASE WHEN laundry_rate_limits.window_started_at <= now() - interval '10 minutes' THEN 1 ELSE LEAST(laundry_rate_limits.attempts + 1, 11) END, " +
      "window_started_at = CASE WHEN laundry_rate_limits.window_started_at <= now() - interval '10 minutes' THEN now() ELSE laundry_rate_limits.window_started_at END, " +
      "updated_at = now() RETURNING attempts > 10 AS limited",
      [keyHash],
    );
    const row = Array.isArray(result) ? result[0] as { limited?: boolean } | undefined : undefined;
    if (!row) throw new Error("Rate limit query did not return a row.");
    cleanupCounter += 1;
    if (cleanupCounter >= 500) {
      cleanupCounter = 0;
      void getNeonSql().query("DELETE FROM laundry_rate_limits WHERE updated_at < now() - interval '1 day'").catch(() => undefined);
    }
    return row?.limited === true;
  } catch {
    return consumeLocally(keyHash);
  }
}

export async function clearRateLimitAttempts(key: string) {
  const keyHash = hashKey(key);
  localAttempts.delete(keyHash);
  try {
    await getNeonSql().query("DELETE FROM laundry_rate_limits WHERE key_hash = $1", [keyHash]);
  } catch {
    // The local counter is already cleared; DB cleanup can retry on the next successful window.
  }
}
