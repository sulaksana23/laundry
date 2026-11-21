import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    if (specifier === "next/headers") return { url: new URL("./fakes/next-headers.mjs", import.meta.url).href, shortCircuit: true };
    if (specifier === "@/server/db/neon") return { url: new URL("./fakes/neon.mjs", import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL("../src/" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

process.env.AUTH_SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";
process.env.DATABASE_URL = "postgres://fake";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const user = {
  userId: USER_ID, email: "kasir@laundry.test", fullName: "Kasir", branchId: "branch-a", branchName: "Cabang A", role: "cashier",
};
const db = { sessionVersion: 0, active: true };

globalThis.__fakeSql = (text) => {
  if (text.startsWith("SELECT session_version FROM laundry_users")) return [{ session_version: db.sessionVersion }];
  if (text.startsWith("UPDATE laundry_users SET session_version")) { db.sessionVersion += 1; return []; }
  if (text.includes("FROM laundry_users u JOIN laundry_user_branch_access")) {
    return db.active ? [{
      user_id: user.userId, email: user.email, full_name: user.fullName, branch_id: user.branchId,
      branch_name: user.branchName, role: user.role, session_version: db.sessionVersion,
    }] : [];
  }
  throw new Error("query tak terduga: " + text);
};

const { getAuthSession, setAuthSession, clearAuthSession } = await import("../src/server/modules/auth/auth.session.ts");
const jar = globalThis.__cookieJar;

test("sesi yang ditandatangani dapat dibaca kembali", async () => {
  await setAuthSession(user);
  const session = await getAuthSession();
  assert.equal(session?.userId, USER_ID);
  assert.equal(session?.sessionVersion, db.sessionVersion);
});

test("token yang diubah ditolak", async () => {
  await setAuthSession(user);
  const [payload, signature] = jar.get("laundry_session").split(".");
  const forged = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  forged.role = "owner";
  jar.set("laundry_session", Buffer.from(JSON.stringify(forged)).toString("base64url") + "." + signature);
  assert.equal(await getAuthSession(), null);
});

test("logout mematikan salinan cookie lama (mis. yang dicuri)", async () => {
  await setAuthSession(user);
  const stolen = jar.get("laundry_session");
  await clearAuthSession();
  assert.equal(jar.has("laundry_session"), false);
  jar.set("laundry_session", stolen);
  assert.equal(await getAuthSession(), null);
});

test("login ulang setelah logout membuat sesi baru yang valid", async () => {
  await setAuthSession(user);
  assert.equal((await getAuthSession())?.userId, USER_ID);
});

test("staf yang dinonaktifkan langsung kehilangan sesi", async () => {
  await setAuthSession(user);
  db.active = false;
  try {
    assert.equal(await getAuthSession(), null);
  } finally {
    db.active = true;
  }
});

test("getClientIp hanya membaca header proxy tepercaya", async () => {
  const { getClientIp } = await import("../src/server/modules/auth/rate-limit.ts");
  const spoofed = new Request("https://x.test", { headers: { "x-forwarded-for": "1.2.3.4" } });
  assert.equal(getClientIp(spoofed), "unknown");
  assert.equal(getClientIp(new Request("https://x.test", { headers: { "x-real-ip": "9.9.9.9" } })), "9.9.9.9");
  process.env.LAUNDRY_CLIENT_IP_HEADER = "CF-Connecting-IP";
  try {
    assert.equal(getClientIp(new Request("https://x.test", { headers: { "cf-connecting-ip": "5.5.5.5", "x-real-ip": "9.9.9.9" } })), "5.5.5.5");
  } finally {
    delete process.env.LAUNDRY_CLIENT_IP_HEADER;
  }
});
