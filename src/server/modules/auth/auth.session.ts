import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthUser } from "@/server/modules/auth/auth.repository";
import { AuthRepository } from "@/server/modules/auth/auth.repository";

const COOKIE_NAME = "laundry_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export interface AuthSession extends AuthUser {
  expiresAt: number;
  /** Versi sesi pengguna saat token dibuat; harus sama dengan nilai di DB. */
  sessionVersion: number;
}

function secret(): string | null {
  const value = process.env.AUTH_SECRET;
  return value && Buffer.byteLength(value) >= 32 ? value : null;
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && secret());
}

function signature(payload: string, secretValue: string): Buffer {
  return createHmac("sha256", secretValue).update(payload).digest();
}

function createToken(user: AuthUser, sessionVersion: number, secretValue: string): string {
  const session: AuthSession = {
    ...user,
    sessionVersion,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return payload + "." + signature(payload, secretValue).toString("base64url");
}

function parseToken(token: string | undefined, secretValue: string): AuthSession | null {
  if (!token) return null;
  const [payload, encodedSignature, extra] = token.split(".");
  if (!payload || !encodedSignature || extra) return null;

  const expected = signature(payload, secretValue);
  const actual = Buffer.from(encodedSignature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (
      !value.userId ||
      !value.email ||
      !value.branchId ||
      !value.branchName ||
      !["owner", "cashier", "operator"].includes(value.role) ||
      !Number.isInteger(value.expiresAt) ||
      !Number.isInteger(value.sessionVersion) ||
      value.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const secretValue = secret();
  if (!secretValue) return null;
  const cookieStore = await cookies();
  const signedSession = parseToken(cookieStore.get(COOKIE_NAME)?.value, secretValue);
  if (!signedSession) return null;
  try {
    const user = await new AuthRepository().findActiveUserForBranch(signedSession.userId, signedSession.branchId);
    if (!user || user.sessionVersion !== signedSession.sessionVersion) return null;
    return { ...signedSession, ...user };
  } catch {
    return null;
  }
}

export async function setAuthSession(user: AuthUser): Promise<void> {
  const secretValue = secret();
  if (!secretValue) throw new Error("AUTH_NOT_CONFIGURED");
  const sessionVersion = await new AuthRepository().getSessionVersion(user.userId);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(user, sessionVersion, secretValue), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

/**
 * Logout: hapus cookie dan batalkan semua token pengguna ini (termasuk
 * salinan yang mungkin dicuri). Akibatnya pengguna keluar di semua perangkat.
 */
export async function clearAuthSession(): Promise<void> {
  const secretValue = secret();
  const cookieStore = await cookies();
  const session = secretValue ? parseToken(cookieStore.get(COOKIE_NAME)?.value, secretValue) : null;
  if (session) {
    try {
      await new AuthRepository().revokeSessions(session.userId);
    } catch {
      // Cookie tetap dihapus; token lama kedaluwarsa sesuai SESSION_SECONDS.
    }
  }
  cookieStore.delete(COOKIE_NAME);
}
