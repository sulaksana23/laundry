# Roadmap

## Tahap 1 — Fondasi UI (selesai untuk MVP)

- [x] Struktur Next.js App Router dan TypeScript strict.
- [x] Dashboard, pesanan, pelanggan, layanan, persediaan, keuangan, laporan, dan pengaturan.
- [x] UI demo pesanan: pencarian, filter, buat, validasi, transisi status, dan localStorage.
- [x] Dokumentasi arsitektur, domain, API, database, keamanan, dan UI.

## Tahap 2 — Persistensi awal dan aturan usaha (sedang berjalan)

- [ ] Putuskan aturan berat, harga, express, diskon, pembayaran, refund, pembatalan, dan jam operasi.
- [ ] Tetapkan role dan alur beberapa cabang.
- [x] Buat migrasi PostgreSQL awal dan seed katalog layanan sintetis.
- [x] Implementasikan repository/API pesanan untuk local development dan Preview.
- [ ] Implementasikan repository untuk pelanggan, layanan, pembayaran, stok, dan pengeluaran.
- [ ] Pindahkan modul selain Pesanan dari fixture ke API.

## Tahap 3 — Kesiapan operasional

- [x] Login/registrasi email-password untuk akun Pemilik dan pembatasan pesanan berdasarkan cabang sesi.
- [ ] Role-based access terperinci, audit log, rate limit, dan uji isolasi cabang lintas akun.
- [ ] Nota/cetak, pagination, dan impor/ekspor.
- [ ] Notifikasi pelanggan untuk status dan pesanan siap, menggunakan provider yang dipilih.
- [ ] Rekonsiliasi kas, pembayaran digital, refund, dan laporan terdefinisi.
- [ ] Backup/restore, observability, aksesibilitas, dan uji end-to-end.

## Tahap 4 — Multi-cabang dan optimasi

- [ ] Dashboard konsolidasi dan laporan per cabang.
- [ ] Hak akses lintas cabang dan pemindahan order bila diperlukan.
- [ ] Optimasi query, indeks, caching, dan retensi berdasarkan volume nyata.
