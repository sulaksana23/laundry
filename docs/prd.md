# PRD — LaundryOS

_Dokumen kebutuhan produk (Product Requirements Document) untuk LaundryOS, sistem operasional laundry berbasis web. Dokumen ini mencatat implementasi aplikasi versi **v0.19.0** per 5 November 2026 dan pekerjaan yang masih terbuka. Flowchart pendamping tersedia sebagai berkas draw.io di [docs/flowcharts/laundryos-flowcharts.drawio](flowcharts/laundryos-flowcharts.drawio) dan dirender sebagai gambar di README._

| | |
| --- | --- |
| Produk | LaundryOS |
| Versi dokumen | 1.4 (5 November 2026) |
| Versi aplikasi acuan | v0.19.0 |
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
| **Pemilik** | Mengelola satu atau beberapa cabang, sering memantau dari HP | Ringkasan bisnis, keuangan, laporan, pengaturan profil usaha, staf, dan cabang |
| **Kasir/operator** | Bekerja pada cabang yang diberikan pemilik | Menjalankan tugas pesanan sesuai peran dan akses cabang |
| **Pelanggan** | Menyerahkan cucian ke outlet | Mengecek status cucian tanpa login, tahu sisa tagihan dan kapan bisa diambil |

Role yang didukung adalah Pemilik, Kasir, dan Operator. Pemilik memberi akun staf akses ke cabang; izin tetap diperiksa di server dan beberapa tindakan keuangan sensitif hanya tersedia bagi pemilik.

## 4. Ruang lingkup

**Di dalam cakupan (tersedia di v0.19.0):**

- Autentikasi pemilik dan staf (email + kata sandi, sesi cookie HttpOnly, pembatasan percobaan bersama melalui Neon).
- Ringkasan (dashboard) data tersimpan: pendapatan bulan berjalan + perubahan vs bulan lalu, pesanan aktif, siap diambil, belum lunas, grafik pendapatan 7/30/90 hari, antrean per status, pesanan terbaru, catatan stok menipis dan pembayaran tertunda.
- Manajemen pesanan: buat, pencarian, filter status/jatuh tempo/pembayaran, pagination server-side, ubah status dengan riwayat tercatat, pembayaran (lunas/sebagian/belum), nota ringkasan cetak, tombol WhatsApp untuk pesanan siap, dan ekspor CSV sesuai filter aktif.
- Pelanggan: tambah, cari, dan impor massal dari berkas CSV (dengan validasi dan laporan hasil) per cabang.
- Layanan & harga: katalog per cabang, tambah/ubah, aktif/nonaktif; harga aktif dipakai saat pesanan dibuat (snapshot harga tersimpan di pesanan).
- Persediaan: daftar bahan, pembelian dan penyesuaian lewat ledger, resep pemakaian per layanan/tahap, peringatan stok minimum, dan snapshot biaya rata-rata untuk estimasi HPP bahan.
- Keuangan: pemasukan dari pembayaran, pengeluaran operasional, ringkasan kas dan tagihan belum lunas; tutup kasir harian; rekonsiliasi CSV transfer/QRIS yang menunggu pemeriksaan dan konfirmasi manual.
- Laporan: agregasi transaksi, rekap pemilik lintas cabang, rentang tanggal, estimasi HPP bahan, dan ekspor CSV.
- Pengaturan: profil usaha, cabang, akun staf, akses lintas cabang, backup/restore manual Pro, dan informasi versi sistem.
- Lacak pesanan publik (`/lacak`): pelanggan mengecek status dengan kode pesanan + nomor HP terdaftar, tanpa login.
- Pencarian global pesanan/pelanggan serta ringkasan peringatan operasional berbasis data yang sudah dimuat di Dashboard.
- Mode demo tanpa database untuk evaluasi tampilan; demo tidak menyimpan perubahan transaksi ke Neon.

**Di luar cakupan saat ini (roadmap, sebagian menunggu keputusan bisnis pemilik):**

- Impor massal pesanan dari CSV.
- Notifikasi WhatsApp otomatis via provider.
- API pembayaran bank/QRIS otomatis.
- Biaya tenaga kerja, overhead, dan perhitungan laba bersih akuntansi.

## 5. Kebutuhan fungsional

| ID | Kebutuhan | Prioritas | Status |
| --- | --- | --- | --- |
| FR-01 | Pemilik dapat mendaftar dan staf dapat masuk dengan email + kata sandi; percobaan dibatasi lintas instance | Wajib | Tersedia |
| FR-02 | Ringkasan menampilkan metrik, grafik periode 7/30/90 hari, antrean status, pesanan terbaru, dan catatan operasional dari data tersimpan | Wajib | Tersedia |
| FR-03 | Pemilik/kasir dapat membuat pesanan dengan pelanggan, layanan, jumlah, dan estimasi selesai; kode pesanan unik tercetak di nota | Wajib | Tersedia |
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
| FR-21 | Backup cabang Pro dapat diunduh dan dipulihkan secara manual tanpa penyimpanan tambahan dari aplikasi | Penting | Tersedia |
| FR-22 | Mutasi transfer/QRIS CSV dapat diimpor, dicegah duplikasi berkas, disarankan kecocokan, lalu dikonfirmasi/diabaikan manual tanpa mengubah ledger pembayaran | Penting | Tersedia |
| FR-23 | Biaya beli persediaan memperbarui estimasi biaya rata-rata dan penggunaan resep menyimpan snapshot HPP untuk laporan | Penting | Tersedia (estimasi bahan) |
| FR-24 | Pemilik dapat menambah atau mencabut akses cabang untuk akun staf yang sudah ada | Penting | Tersedia |
| FR-25 | Percobaan masuk, daftar, pelacakan publik, dan verifikasi lisensi dibatasi lintas instance Vercel | Penting | Tersedia; fallback lokal saat Neon bermasalah |
| FR-26 | Pengguna dapat mencari pesanan dan pelanggan dari header dengan scope cabang serta hasil terbatas | Penting | Tersedia |
| FR-27 | Daftar pesanan dapat difilter menurut target hari ini/terlambat dan pembayaran lunas/belum lunas sesuai izin | Penting | Tersedia |
| FR-28 | Dashboard merangkum pesanan terlambat, target hari ini, siap diambil, stok menipis, dan tagihan belum lunas | Penting | Tersedia; menggunakan data dashboard yang sudah dimuat |
| FR-29 | Persediaan dapat dicari, difilter berdasarkan batas minimum, dan diekspor dengan biaya hanya untuk peran yang berizin | Penting | Tersedia; memakai data yang telah dimuat halaman |
| FR-30 | Riwayat mutasi stok dapat difilter menurut barang, jenis, dan tanggal lokal cabang serta dibuka per halaman | Penting | Tersedia; maksimal 50 baris per query tanpa hitung total |

## 6. Kebutuhan non-fungsional

| Aspek | Kebutuhan |
| --- | --- |
| Responsif | Alur utama dapat digunakan pada ponsel hingga desktop; tabel lebar menggulir di dalam kontainernya dan tidak memaksa seluruh halaman melebar |
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

Hal berikut **sudah memiliki perilaku aplikasi**, tetapi tetap memerlukan persetujuan pemilik sebelum dijadikan kebijakan usaha baku (sesuai aturan domain di [docs/domain-rules.md](domain-rules.md)):

1. Aturan refund dan pembatalan pesanan (kapan boleh, siapa menyetujui, bagaimana kas disesuaikan).
2. Aturan pembulatan, express/diskon, minimum order, pembayaran, dan kapan pesanan dianggap selesai.
3. Kebijakan tutup kasir (siapa menutup, apakah selisih perlu persetujuan).
4. Provider notifikasi otomatis, persetujuan pelanggan, dan anggarannya. Saat ini WhatsApp hanya dibuka sebagai tautan yang dikirim staf.

Impor massal pesanan, API pembayaran bank/QRIS, penghitungan biaya tenaga kerja/overhead, serta observability terpusat belum tersedia. Tambahkan hanya setelah kebutuhan dan dampak kuota/biayanya jelas.

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
| v0.14.0 | Penyelesaian modul operasional, layanan kg/pcs/pasang, akses berbasis peran, audit, dan laporan |
| v0.15.0 | Akses lintas cabang untuk staf, ringkasan pemilik, pembatalan/refund, dan ekspor pesanan |
| v0.16.0 | Resep dan HPP bahan, backup/restore manual, tren dashboard, rate limit Neon bersama, dan rekonsiliasi CSV transfer/QRIS |
| v0.17.0 | Pencarian global, filter lanjutan pesanan, ringkasan peringatan operasional, dan filter ekspor yang mengikuti pilihan |
| v0.18.0 | Pencarian/filter stok, filter stok minimum, dan ekspor CSV dengan pembatasan kolom biaya sesuai izin |
| v0.19.0 | Filter tanggal, barang, dan jenis mutasi persediaan dengan pagination hemat query |
