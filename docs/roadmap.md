# Roadmap

## Tahap 1 — Fondasi UI (repository ini)

- [x] Struktur Next.js App Router dan TypeScript strict.
- [x] Dashboard, pesanan, pelanggan, layanan, persediaan, keuangan, laporan, dan pengaturan.
- [x] UI pesanan demo: pencarian, filter, buat, validasi, transisi status, localStorage.
- [x] Dokumentasi arsitektur, domain, API, database, keamanan, dan UI.

## Tahap 2 — Aturan usaha dan backend

- [ ] Putuskan aturan berat, harga, express, diskon, pembayaran, refund, pembatalan, dan jam operasi.
- [ ] Tetapkan role dan alur beberapa cabang.
- [ ] Pilih database dan ORM; buat schema, migrasi, seed aman, serta repository PostgreSQL.
- [ ] Implementasikan controller/service/repository untuk order, pelanggan, layanan, pembayaran, stok, dan pengeluaran.
- [ ] Pindahkan UI dari fixture/localStorage ke API.

## Tahap 3 — Kesiapan operasional

- [ ] Autentikasi, role-based access, audit log, pembatasan permintaan, dan isolasi cabang.
- [ ] Nota/cetak, pencarian cepat, pagination, dan impor/ekspor.
- [ ] Notifikasi pelanggan untuk status dan pesanan siap, menggunakan provider yang dipilih.
- [ ] Rekonsiliasi kas, pembayaran digital, refund, dan laporan terdefinisi.
- [ ] Backup/restore, observability, aksesibilitas, dan uji end-to-end.

## Tahap 4 — Multi-cabang dan optimasi

- [ ] Dashboard konsolidasi dan laporan per cabang.
- [ ] Hak akses lintas cabang dan pemindahan order bila diperlukan.
- [ ] Optimasi query, indeks, caching, dan retention berdasarkan volume nyata.
