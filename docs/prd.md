# PRD — LaundryOS

_Dokumen kebutuhan produk (Product Requirements Document) untuk LaundryOS, sistem operasional laundry berbasis web. Dokumen ini menggambarkan produk sebagaimana berjalan pada versi **v0.5.1** dan arah pengembangan berikutnya. Flowchart pendamping tersedia sebagai berkas draw.io di [docs/flowcharts/laundryos-flowcharts.drawio](flowcharts/laundryos-flowcharts.drawio) dan dirender sebagai gambar di README._

| | |
| --- | --- |
| Produk | LaundryOS |
| Versi dokumen | 1.0 (3 November 2026) |
| Versi aplikasi acuan | v0.5.1 |
| Pemilik produk | Pemilik usaha laundry (Cabang Bangli) |
| Status | Live di production (Vercel + Neon PostgreSQL) |

## 1. Latar belakang dan masalah

Operasional laundry harian — menerima cucian, memproses tahapan cuci, mencatat pembayaran, dan menyerahkan kembali ke pelanggan — umumnya dicatat manual di buku atau spreadsheet. Akibatnya:

1. Status cucian sulit dilacak; pelanggan berulang kali bertanya lewat chat.
2. Tagihan belum lunas dan stok bahan menipis sering terlambat disadari.
3. Pemilik tidak punya ringkasan pendapatan dan antrean yang siap dilihat kapan saja, terutama dari HP.

LaundryOS menyelesaikan ketiganya dalam satu aplikasi web yang responsif penuh di HP, tablet, dan desktop.

## 2. Tujuan produk dan metrik keberhasilan

| Tujuan | Metrik keberhasilan |
| --- | --- |
| Semua pesanan tercatat dan terlacak statusnya | 100% pesanan baru dibuat lewat LaundryOS; tidak ada lagi catatan kertas |
| Pelanggan mandiri mengecek status | Halaman lacak publik dipakai pelanggan; pertanyaan status via chat menurun |
| Keuangan transparan | Pemilik dapat melihat pendapatan hari ini/bulan ini dan daftar belum lunas dalam < 10 detik dari HP |
| Operasional tidak terlewat | Stok di bawah batas minimum dan pesanan siap diambil selalu tampil di Ringkasan |

## 3. Pengguna dan persona

| Persona | Deskripsi | Kebutuhan utama |
| --- | --- | --- |
| **Pemilik** | Mengelola satu cabang, sering memantau dari HP | Ringkasan bisnis, keuangan, laporan, pengaturan profil usaha |
| **Staf/kasir** | Menerima dan memproses pesanan di outlet | Membuat pesanan cepat, mengubah status, mencatat pembayaran |
| **Pelanggan** | Menyerahkan cucian ke outlet | Mengecek status cucian tanpa login, tahu sisa tagihan dan kapan bisa diambil |

Saat ini akun yang didukung adalah Pemilik; pembagian peran staf vs pemilik (RBAC) ada di roadmap dan menunggu keputusan aturan dari pemilik usaha.

## 4. Ruang lingkup

**Di dalam cakupan (sudah tersedia di v0.5.1):**

- Autentikasi pemilik (email + kata sandi, sesi cookie HttpOnly, rate limit percobaan masuk/daftar).
- Ringkasan (dashboard) data tersimpan: pendapatan bulan berjalan + perubahan vs bulan lalu, pesanan aktif, siap diambil, belum lunas, grafik pendapatan 7 hari, antrean per status, pesanan terbaru, catatan stok menipis dan pembayaran tertunda.
- Manajemen pesanan: buat, cari/filter, pagination server-side, ubah status dengan riwayat tercatat, pembayaran (lunas/sebagian/belum), nota ringkasan cetak, tombol WhatsApp untuk pesanan siap, ekspor halaman aktif.
- Pelanggan: tambah, cari, dan impor massal dari berkas CSV (dengan validasi dan laporan hasil) per cabang.
- Layanan & harga: katalog per cabang, tambah/ubah, aktif/nonaktif; harga aktif dipakai saat pesanan dibuat (snapshot harga tersimpan di pesanan).
- Persediaan: daftar bahan, resep pemakaian per layanan/tahap, penyesuaian stok, ledger, dan peringatan stok minimum.
- Keuangan: pemasukan dari pembayaran, pengeluaran operasional, ringkasan kas dan tagihan belum lunas; tutup kasir harian membandingkan kas tunai sistem dengan uang fisik dan mencatat selisihnya.
- Laporan: agregasi transaksi, rekap pemilik lintas cabang, dan ekspor CSV.
- Pengaturan: profil usaha (nama, telepon, email, alamat, zona waktu) tersimpan ke database; informasi versi sistem tampil di sidebar, footer, dan Pengaturan → Sistem.
- Lacak pesanan publik (`/lacak`): pelanggan mengecek status dengan kode pesanan + nomor HP terdaftar, tanpa login.
- Mode demo tanpa database untuk evaluasi tampilan.

**Di luar cakupan saat ini (roadmap, sebagian menunggu keputusan bisnis pemilik):**

- Refund/pembatalan pesanan (aturan belum diputuskan).
- Peran terperinci staf vs pemilik (RBAC).
- Impor massal pesanan dari CSV.
- Backup dan restore data.
- Notifikasi WhatsApp otomatis via provider.
- Multi-cabang dalam satu akun.

## 5. Kebutuhan fungsional

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-01 | Pemilik dapat mendaftar dan masuk dengan email + kata sandi; percobaan dibatasi (rate limit) | Wajib | Tersedia |
| FR-02 | Ringkasan menampilkan metrik, grafik 7 hari, antrean status, pesanan terbaru, dan catatan operasional dari data tersimpan | Wajib | Tersedia |
| FR-03 | Staf/pemilik dapat membuat pesanan dengan pelanggan, layanan, berat, dan estimasi selesai; kode pesanan unik tercetak di nota | Wajib | Tersedia |
| FR-04 | Status pesanan bergerak mengikuti alur Diterima → Dicuci → Dikeringkan → Disetrika → Siap diambil → Selesai; setiap perubahan tercatat di riwayat | Wajib | Tersedia |
| FR-05 | Pembayaran dapat dicatat penuh atau sebagian; sisa tagihan terhitung otomatis | Wajib | Tersedia |
| FR-06 | Pesanan siap diambil dapat dikabari ke pelanggan via WhatsApp dalam satu ketuk | Wajib | Tersedia |
| FR-07 | Pelanggan/pesanan dapat dicari; daftar pesanan memakai pagination server-side | Wajib | Tersedia |
| FR-08 | Katalog layanan dan harga dikelola per cabang; perubahan harga tidak mengubah pesanan lama (snapshot) | Wajib | Tersedia |
| FR-09 | Stok bahan dapat disesuaikan; stok di bawah minimum memunculkan peringatan di Ringkasan dan Persediaan | Wajib | Tersedia |
| FR-10 | Pengeluaran operasional tercatat dan memengaruhi ringkasan keuangan | Wajib | Tersedia |
| FR-11 | Laporan transaksi dapat diekspor ke CSV | Penting | Tersedia |
| FR-12 | Profil usaha tersimpan ke database dan dipakai di seluruh aplikasi (nama cabang, kontak) | Penting | Tersedia |
| FR-13 | Pelanggan dapat melacak status pesanan secara publik dengan kode pesanan + nomor HP terdaftar; hasil memuat tahapan, riwayat, sisa tagihan, dan kontak cabang | Wajib | Tersedia |
| FR-14 | Versi aplikasi tampil jelas di sidebar agar versi yang berjalan mudah diverifikasi | Penting | Tersedia |
| FR-15 | Tutup kasir harian: membandingkan kas sistem vs uang fisik dan mencatat selisih | Penting | Tersedia |
| FR-16 | Impor massal pelanggan dari berkas CSV dengan validasi dan laporan hasil | Penting | Tersedia |
| FR-17 | Backup data cabang yang dapat diunduh dan dipulihkan | Penting | Tersedia (fitur Pro) |
| FR-18 | Aktivasi LaundryOS Pro: fitur lanjutan (ekspor laporan CSV, tutup kasir harian, backup & restore) terkunci dan terbuka dengan kode aktivasi bertanda tangan digital yang diterbitkan bagi pendukung Trakteer | Penting | Tersedia (fondasi) |
| FR-19 | Pemilik mengatur resep bahan per layanan dan tahap; perubahan status serta pemakaian stok dicatat atomik dan ditolak jika stok tidak cukup | Wajib | Tersedia |
| FR-20 | Pemilik melihat gabungan pesanan dan pemasukan bersih dari semua cabang yang dapat diakses untuk rentang tanggal terpilih | Penting | Tersedia |
| FR-21 | Backup cabang Pro dijadwalkan harian ke penyimpanan privat dengan retensi 30 hari dan dapat diunduh untuk pemulihan | Penting | Tersedia |

## 6. Kebutuhan non-fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Responsif | Semua halaman berfungsi penuh pada lebar 320px–desktop tanpa geser horizontal; daftar kompleks berubah menjadi kartu di layar kecil; teks data produksi yang panjang tidak terpotong |
| Keamanan | Kata sandi ter-hash; sesi cookie HttpOnly + Secure di production; validasi server untuk semua input; data terisolasi per cabang pada setiap query; pelacakan publik mewajibkan nomor HP yang cocok dan dibatasi percobaannya (rate limit), respons tidak menyimpan cache |
| Kinerja | Ringkasan memakai streaming (skeleton tampil lebih dulu); halaman publik ringan |
| Keandalan | Migrasi database berjalan otomatis saat build; endpoint `/api/health` melaporkan status dan versi |
| Aksesibilitas | Setiap kontrol memiliki label/nama aksesibel, status loading/error/empty jelas, animasi menghormati `prefers-reduced-motion` |
| Bahasa | Seluruh UI berbahasa Indonesia |

## 7. Model data ringkas

Entitas inti (PostgreSQL/Neon): `laundry_branches` (cabang + profil usaha), `laundry_customers` (pelanggan, unik per cabang+nomor HP), `laundry_services` (katalog layanan), `laundry_orders` (pesanan dengan snapshot layanan/harga), `laundry_order_status_history` (riwayat status), dan tabel persediaan serta pengeluaran pada modul workspace. Nilai uang disimpan sebagai integer Rupiah. Rincian skema ada di [docs/database.md](database.md).

## 8. Alur utama

Tiga alur digambarkan pada flowchart draw.io pendamping:

1. **Alur status pesanan** — dari pesanan diterima sampai selesai dan diserahkan, termasuk titik pembayaran dan pemberitahuan WhatsApp.
2. **Alur lacak pesanan publik** — pelanggan memasukkan kode + nomor HP, sistem memverifikasi dan menampilkan status atau pesan kesalahan sebagai toast.
3. **Arsitektur sistem** — browser pelanggan/staf, aplikasi Next.js di Vercel, database Neon PostgreSQL, dan tautan WhatsApp keluar.

## 9. Asumsi dan keputusan terbuka

Hal berikut **belum diputuskan** dan harus dikonfirmasi pemilik usaha sebelum dibangun (sesuai aturan domain di [docs/domain-rules.md](domain-rules.md)):

1. Aturan refund dan pembatalan pesanan (kapan boleh, siapa menyetujui, bagaimana kas disesuaikan).
2. Pembagian hak akses staf vs pemilik.
3. Kebijakan tutup kasir (siapa menutup, apakah selisih perlu persetujuan).
4. Provider notifikasi WhatsApp otomatis dan anggarannya.

## 10. Riwayat versi aplikasi

| Versi | Sorotan |
| --- | --- |
| v0.1.0 | Versi aplikasi tampil di sidebar, footer, dan Pengaturan |
| v0.2.0 | Ringkasan tersambung ke data Neon, sapaan dinamis, animasi grafik, font Inter |
| v0.3.0 | Riwayat status pesanan, tombol WhatsApp pesanan siap, profil usaha tersimpan, rate limit auth, `/api/health` |
| v0.3.1 | Animasi loading skeleton untuk grafik Ringkasan |
| v0.3.2 | Perbaikan overflow horizontal Ringkasan di HP |
| v0.3.3 | Label "Versi sistem" yang jelas di sidebar |
| v0.3.4 | Pesanan terbaru menjadi daftar kartu di HP |
| v0.4.0 | Redesign Ringkasan mobile-first (metrik 2 kolom, tile antrean) |
| v0.4.1 | Baris pesanan terbaru tanpa teks terpotong untuk data produksi yang panjang |
| v0.5.0 | Halaman lacak pesanan publik untuk pelanggan |
| v0.5.1 | Pesan error lacak menjadi toast melayang |
| v0.6.0 | Tutup kasir harian di halaman Keuangan |
| v0.7.0 | Impor massal pelanggan dari CSV di halaman Pelanggan |
| v0.8.0 | Fondasi Aktivasi Pro: kode aktivasi Ed25519, bagian LaundryOS Pro di Pengaturan, ekspor CSV dan tutup kasir menjadi fitur Pro |
| v0.9.0 | Backup & restore data cabang (FR-17) sebagai fitur Pro: unduh JSON seluruh data cabang dan pulihkan ke cabang yang sama dari Pengaturan |
| v0.9.1 | Validasi isi backup, snapshot konsisten, dan restore data cabang dalam satu transaksi database |
| v0.10.0 | Panel prioritas pesanan berdasarkan tanggal target dan zona waktu cabang; tautan langsung ke pencarian pesanan |
| v0.11.0 | Riwayat pesanan per pelanggan dengan pencarian, filter status, pagination, dan pembatasan cabang |
| v0.16.0 | Resep pemakaian stok otomatis, laporan pemilik lintas cabang, backup privat harian, dan kompatibilitas backup lama |
