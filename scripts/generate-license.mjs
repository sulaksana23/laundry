#!/usr/bin/env node
/**
 * Penerbit kode aktivasi LaundryOS Pro (hanya untuk Bali Tech Solution).
 *
 * Membuat pasangan kunci baru:
 *   node scripts/generate-license.mjs --init --key-file ./laundry-license-private.pem
 *   -> kunci privat ditulis ke berkas (jangan pernah masuk repositori),
 *      kunci publik ditampilkan untuk disematkan di aplikasi.
 *
 * Menerbitkan kode untuk seorang pendukung:
 *   LICENSE_PRIVATE_KEY_FILE=./laundry-license-private.pem \
 *     node scripts/generate-license.mjs --name "Nama Pendukung" --email "email@contoh.id" --days 365
 *   Tambahkan --permanent untuk kode tanpa masa berlaku.
 */
import { generateKeyPairSync, createPrivateKey, sign } from "node:crypto";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const args = process.argv.slice(2);
function argValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
const hasFlag = (flag) => args.includes(flag);

if (hasFlag("--init")) {
  const keyFile = argValue("--key-file") || process.env.LICENSE_PRIVATE_KEY_FILE;
  if (!keyFile) {
    console.error("Tentukan --key-file <path> untuk menyimpan kunci privat.");
    process.exit(1);
  }
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  writeFileSync(keyFile, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  chmodSync(keyFile, 0o600);
  console.log(`Kunci privat disimpan di: ${keyFile} (simpan aman, JANGAN masuk repositori)`);
  console.log("Kunci publik untuk disematkan di src/server/modules/license/license.ts:");
  console.log(publicKey.export({ type: "spki", format: "pem" }));
  process.exit(0);
}

const name = argValue("--name");
if (!name || name.trim().length < 2) {
  console.error('Wajib: --name "Nama Pendukung"');
  process.exit(1);
}
const email = argValue("--email") || null;
const permanent = hasFlag("--permanent");
const days = Number(argValue("--days") || "365");
if (!permanent && (!Number.isFinite(days) || days < 1 || days > 3650)) {
  console.error("--days harus antara 1 dan 3650 (atau pakai --permanent).");
  process.exit(1);
}

const keyFile = argValue("--key-file") || process.env.LICENSE_PRIVATE_KEY_FILE;
const pem = process.env.LICENSE_PRIVATE_KEY_PEM || (keyFile ? readFileSync(keyFile, "utf8") : null);
if (!pem) {
  console.error("Kunci privat tidak ditemukan. Atur LICENSE_PRIVATE_KEY_FILE atau LICENSE_PRIVATE_KEY_PEM.");
  process.exit(1);
}

const issuedAt = new Date().toISOString().slice(0, 10);
const expiresAt = permanent ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const payload = { v: 1, name: name.trim(), email, plan: "pro", issuedAt, expiresAt };
const payloadSegment = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
const signature = sign(null, Buffer.from(payloadSegment, "utf8"), createPrivateKey(pem)).toString("base64url");

console.log(`Kode aktivasi LaundryOS Pro untuk ${payload.name}${email ? ` <${email}>` : ""}`);
console.log(`Masa berlaku: ${expiresAt ? `sampai ${expiresAt}` : "selamanya"}`);
console.log("");
console.log(`LOS1.${payloadSegment}.${signature}`);
