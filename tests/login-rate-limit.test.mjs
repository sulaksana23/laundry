import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const fake = (name) => ({ url: new URL("./fakes/" + name, import.meta.url).href, shortCircuit: true });
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export%20%7B%7D", shortCircuit: true };
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/server/db/neon") return fake("neon.mjs");
    if (specifier === "@/server/modules/auth/auth.service" || specifier === "@/server/modules/auth/auth.session") return fake("auth-for-login.mjs");
    if (specifier.startsWith("@/")) return { url: new URL("../src/" + specifier.slice(2) + ".ts", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

// DB tidak tersedia → rate limit memakai penghitung lokal (perilaku fallback yang sama).
globalThis.__fakeSql = () => { throw new Error("db offline"); };
process.env.AUTH_SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";

const { POST } = await import("../src/app/api/auth/login/route.ts");

function login(ip, email, password) {
  return POST(new Request("https://laundry.test/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: JSON.stringify({ email, password }),
  }));
}

test("login sukses ke akun sendiri tidak me-reset batas tebakan dari IP yang sama", async () => {
  const ip = "10.0.0.1";
  const statuses = [];
  // Pola serangan lama: 9 tebakan salah ke korban, lalu 1 login sukses ke akun sendiri, diulang.
  for (let round = 0; round < 3; round += 1) {
    for (let i = 0; i < 9; i += 1) statuses.push((await login(ip, "korban@laundry.test", "tebakan")).status);
    statuses.push((await login(ip, "penyerang@laundry.test", "benar")).status);
  }
  assert.ok(statuses.includes(429), "penyerang harus terkena batas percobaan");
  assert.equal(statuses.filter((status) => status === 401).length, 9, "hanya 9 tebakan sebelum terkunci");
});

test("pengguna di IP lain tidak terdampak", async () => {
  assert.equal((await login("10.0.0.2", "kasir@laundry.test", "benar")).status, 200);
});

test("salah password beberapa kali lalu benar tetap bisa masuk", async () => {
  const ip = "10.0.0.3";
  for (let i = 0; i < 3; i += 1) assert.equal((await login(ip, "kasir@laundry.test", "salah")).status, 401);
  assert.equal((await login(ip, "kasir@laundry.test", "benar")).status, 200);
});
