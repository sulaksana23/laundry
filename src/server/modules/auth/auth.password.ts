import "server-only";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt);
  return "scrypt:v1:" + salt + ":" + key.toString("hex");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, version, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || version !== "v1" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await deriveKey(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
