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
- [x] Implementasikan operasi pelanggan, layanan, pembayaran, persediaan, pengeluaran, dan laporan pada Neon.
- [x] Hubungkan modul operasional tersebut ke data cabang.
- [x] Hubungkan Dashboard ke data tersimpan.
- [x] Hubungkan profil Pengaturan ke data tersimpan (migrasi 006: telepon, email, alamat cabang).

## Tahap 3 — Kesiapan operasional

- [x] Login/registrasi email-password untuk akun Pemilik dan pembatasan pesanan berdasarkan cabang sesi.
- [x] Role-based access Pemilik/Kasir/Operator, audit log tindakan utama, dan nonaktifkan staf.
- [x] Cetak nota ringkasan pesanan dari daftar.
- [x] Pagination server-side untuk daftar pesanan, pencarian, dan filter status.
- [x] Panel prioritas pesanan yang masih diproses dan targetnya hari ini atau sudah lewat.
- [x] Riwayat perubahan status pesanan dapat dilihat dari daftar pesanan.
- [x] Kabari pelanggan lewat WhatsApp (tautan wa.me) saat pesanan siap diambil.
- [x] Rate limit percobaan login dan registrasi.
- [x] Endpoint health check di `/api/health`.
- [x] Impor massal pelanggan dan ekspor CSV seluruh hasil pencarian lintas halaman.
- [x] Ekspor CSV pesanan lintas halaman mengikuti filter aktif.
- [ ] Notifikasi pelanggan untuk status dan pesanan siap, menggunakan provider yang dipilih.
- [x] Filter periode laporan, ringkasan metode pembayaran, dan tutup kasir tunai.
- [x] Pembatalan pesanan dengan alasan dan audit; refund sebagian/penuh melalui ledger serta pengurangan pemasukan bersih.
- [ ] Rekonsiliasi digital terhadap mutasi eksternal.
- [x] Backup/restore, dengan pemulihan saldo stok sebagai saldo awal.
- [ ] Observability, aksesibilitas, dan uji end-to-end.

## Pembaruan operasional

- [x] Pesanan satu layanan dengan unit kg, pcs, atau pasang dan snapshot harga per unit.
- [x] Ledger stok bercabang untuk saldo awal, pembelian, pemakaian, dan penyesuaian beralasan.
- [x] Resep pemakaian stok otomatis per layanan dan tahap, dengan pembaruan status yang atomik serta validasi saldo cukup.
- [x] Riwayat audit pemilik untuk perubahan transaksi dan konfigurasi utama.
- [x] Filter laporan tanggal dan CSV mengikuti periode pilihan.
- [x] Biaya express/antar dan diskon per pesanan dengan validasi server.
- [x] Pemilik dapat membuat cabang dan berpindah antara cabang yang terdaftar; data operasional dibatasi ke cabang aktif.
- [x] Laporan pemilik menggabungkan jumlah pesanan dan pemasukan bersih dari cabang yang dapat diakses.
- [x] Format backup manual ikut membawa resep bahan dan tetap menerima versi backup sebelumnya.
- [x] Jadwal backup harian privat dengan retensi 30 hari tersedia melalui Vercel Cron dan Blob; perlu konfigurasi penyimpanan produksi.

## Tahap 4 — Multi-cabang dan optimasi

- [x] Ringkasan pesanan dan pendapatan per cabang pada dashboard pemilik.
- [ ] Pengelolaan staf lintas cabang dan pemindahan order bila diperlukan.
- [ ] Optimasi query, indeks, caching, dan retensi berdasarkan volume nyata.
