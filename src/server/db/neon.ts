import "server-only";
import { neon } from "@neondatabase/serverless";

let cachedUrl: string | undefined;
let cachedClient: ReturnType<typeof neon> | undefined;

export function getNeonSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum dikonfigurasi.");
  if (!cachedClient || cachedUrl !== connectionString) {
    cachedUrl = connectionString;
    cachedClient = neon(connectionString);
  }
  return cachedClient;
}
