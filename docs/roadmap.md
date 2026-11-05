# Roadmap

## Tahap 1 — Fondasi UI (selesai untuk MVP)

- [x] Struktur Next.js App Router dan TypeScript strict.
- [x] Dashboard, pesanan, pelanggan, layanan, persediaan, keuangan, laporan, dan pengaturan.
- [x] UI demo pesanan: pencarian, filter, buat, validasi, transisi status, dan localStorage.
- [x] Dokumentasi arsitektur, domain, API, database, keamanan, dan UI.

## Tahap 2 — Persistensi awal dan aturan usaha (sedang berjalan)

- [ ] Putuskan kebijakan usaha final untuk pembulatan berat, express, diskon, pembayaran, refund, pembatalan, dan jam operasi.
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
- [x] Rate limit lintas instance untuk login, pendaftaran, tracking publik, dan verifikasi lisensi memakai Neon; fallback lokal saat DB tidak tersedia.
- [x] Endpoint health check di `/api/health`.
- [x] Impor massal pelanggan dan ekspor CSV seluruh hasil pencarian lintas halaman.
- [x] Ekspor CSV pesanan lintas halaman mengikuti filter aktif.
- [ ] Notifikasi pelanggan untuk status dan pesanan siap, menggunakan provider yang dipilih.
- [x] Filter periode laporan, ringkasan metode pembayaran, dan tutup kasir tunai.
- [x] Pembatalan pesanan dengan alasan dan audit; refund sebagian/penuh melalui ledger serta pengurangan pemasukan bersih.
- [x] Impor mutasi transfer/QRIS dari CSV, de-duplikasi file, usulan kecocokan yang tepat, dan konfirmasi/abaikan manual dengan audit.
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
- [x] Backup manual per cabang menyertakan resep bahan dan menerima format versi sebelumnya; tidak membutuhkan layanan penyimpanan tambahan.

## Tahap 4 — Multi-cabang dan optimasi

- [x] Ringkasan pesanan dan pendapatan per cabang pada dashboard pemilik.
- [x] Pemilik dapat memberi atau mencabut akses staf kasir/operator ke cabang tambahan; perubahan tercatat di audit.
- [ ] Pemindahan pesanan antar cabang bila proses usaha memerlukannya.
- [ ] Optimasi query, indeks, caching, dan retensi berdasarkan volume nyata.

## Pembaruan 5 November 2026

- [x] Dashboard menyediakan tren 7, 30, atau 90 hari menurut tanggal lokal cabang.
- [x] Nota cetak memuat tautan halaman pelacakan publik `/lacak`.
- [x] Biaya pembelian stok memperbarui estimasi biaya rata-rata tertimbang; pemakaian resep menyimpan snapshot biaya dan laporan menampilkan estimasi HPP bahan serta jumlah pesanan yang biayanya belum lengkap.
- [x] Batas percobaan sensitif memakai penyimpanan Neon bersama agar konsisten antar instance Vercel.
- [x] Dokumentasi keamanan dan cakupan produk diselaraskan dengan fitur yang tersedia.

Fitur ini tidak menambah layanan berbayar, penyimpanan file eksternal, atau job Cron. HPP tetap estimasi bahan dan tidak mengikutsertakan biaya selain pemakaian persediaan.
