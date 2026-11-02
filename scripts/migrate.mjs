import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.info("DATABASE_URL tidak tersedia; migrasi PostgreSQL dilewati untuk build demo.");
  process.exit(0);
}

const sql = neon(connectionString);
await sql`CREATE TABLE IF NOT EXISTS laundry_schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;

const migrationDirectory = join(process.cwd(), "db", "migrations");
const files = (await readdir(migrationDirectory)).filter((file) => file.endsWith(".sql")).sort();

for (const file of files) {
  const existing = await sql`SELECT version FROM laundry_schema_migrations WHERE version = ${file} LIMIT 1`;
  if (existing.length > 0) {
    console.info("Migrasi sudah diterapkan:", file);
    continue;
  }

  const contents = await readFile(join(migrationDirectory, file), "utf8");
  const statements = contents
    .split(/^-- statement\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
  if (statements.length === 0) continue;

  const transaction = statements.map((statement) => sql.query(statement, []));
  transaction.push(sql.query("INSERT INTO laundry_schema_migrations (version) VALUES ($1)", [file]));
  await sql.transaction(transaction);
  console.info("Migrasi diterapkan:", file);
}
