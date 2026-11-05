# Checklist Keamanan Produksi

Autentikasi, pembatasan akses, validasi server, audit, dan batas percobaan dasar sudah diterapkan. Checklist ini mencatat kontrol saat ini serta pemeriksaan operasional yang masih diperlukan sebelum penggunaan produksi berskala lebih besar.

- [x] Implementasikan login/registrasi email-password untuk akun Pemilik dengan cookie sesi `HttpOnly`, `Secure` di production, dan `SameSite=Lax`; secret sesi berasal dari `AUTH_SECRET`.
- [x] Terapkan role Pemilik/Kasir/Operator pada server; akun staf dapat diberi akses ke cabang tambahan oleh pemilik.
- [x] Batasi query operasional pada cabang aktif dan cek keanggotaan cabang di server; uji IDOR lintas cabang tetap perlu menjadi bagian dari verifikasi rilis.
- [x] Validasi schema request dan hitung ulang nominal/status di server.
- [ ] Simpan secret di secret manager/deployment environment; jangan commit `.env`.
- [ ] Lindungi mutasi dari CSRF bila pola autentikasi/cookie membutuhkannya.
- [x] Terapkan batas percobaan bersama di Neon untuk login, registrasi, pelacakan publik, dan verifikasi lisensi; demo atau gangguan DB memakai fallback proses.
- [ ] Redaksi nomor telepon/data pribadi dari log dan telemetry.
- [x] Catat audit untuk perubahan utama pesanan, pembayaran/refund, cabang/staf, resep, persediaan, pengeluaran, dan rekonsiliasi.
- [ ] Siapkan backup terenkripsi, retensi, restore drill, dan prosedur insiden.
- [x] Sediakan backup manual JSON per cabang Pro yang dapat diunduh dan dipulihkan; pemilik menyimpan salinan di tempat pilihannya.
- [ ] Lakukan uji pemulihan berkala dari salinan terjadwal.
- [ ] Terapkan dependency update dan pemeriksaan kerentanan pada pipeline.
- [ ] Tentukan dasar hukum, tujuan pemrosesan, akses, retensi, dan penghapusan data pelanggan.
- [ ] Periksa konfigurasi header keamanan, CSP, TLS, dan kebijakan upload sebelum rilis.

## Batas implementasi yang perlu diketahui

- Batas percobaan memakai tabel Neon dan satu operasi atomik per permintaan. Saat Neon gagal, fallback lokal hanya berlaku pada instance tersebut.
- CSV mutasi dibatasi 1 MB/1.000 baris dan tidak menerapkan pembayaran. Petugas memeriksa lalu mencocokkan transaksi secara manual.
- HPP bahan adalah estimasi dari pemakaian resep dan biaya stok tercatat; biaya tenaga kerja/overhead serta pemeriksaan stok fisik berkala belum dihitung.
- Backup tetap manual agar tidak menambah biaya Blob atau job terjadwal. Simpan salinan di lokasi terpisah dan aman.
