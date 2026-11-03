import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL belum tersedia. Seeder demo tidak dijalankan.");
  process.exit(1);
}

const email = (process.env.LAUNDRY_DEMO_EMAIL || "demo@laundry.test").trim().toLowerCase();
const sql = neon(connectionString);

try {
  const accounts = await sql.query(
    "SELECT id, branch_id FROM laundry_users WHERE lower(email) = $1 LIMIT 1",
    [email],
  );
  const account = accounts[0];
  if (!account) {
    console.error("Akun demo belum terdaftar. Daftarkan " + email + " melalui halaman Register terlebih dahulu.");
    process.exit(1);
  }

  const migrations = await sql.query(
    "SELECT version FROM laundry_schema_migrations WHERE version = '004_demo_seed_data.sql' LIMIT 1",
  );
  if (migrations.length === 0) {
    console.error("Migrasi demo belum diterapkan. Jalankan npm run db:migrate terlebih dahulu.");
    process.exit(1);
  }

  const result = await sql.query(
    "SELECT laundry_seed_demo_data($1, $2) AS seeded",
    [account.branch_id, account.id],
  );
  if (result[0]?.seeded === true) {
    console.info("Data contoh berhasil ditambahkan untuk cabang akun demo.");
  } else {
    console.info("Tidak ada perubahan: data demo sudah dibuat atau cabang sudah memiliki data.");
  }
} catch {
  console.error("Seeder demo gagal. Periksa koneksi DATABASE_URL dan status migrasi.");
  process.exitCode = 1;
}
