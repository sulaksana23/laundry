# Checklist Keamanan Produksi

Starter belum memiliki autentikasi dan jangan dipublikasikan sebagai sistem transaksi produksi sebelum checklist berikut dirancang dan diterapkan.

- [x] Implementasikan login/registrasi email-password untuk akun Pemilik dengan cookie sesi `HttpOnly`, `Secure` di production, dan `SameSite=Lax`; secret sesi berasal dari `AUTH_SECRET`.
- [ ] Terapkan role-based access terperinci pada server untuk owner, admin, kasir, dan operator sesuai peran final.
- [ ] Pastikan semua query dibatasi tenant/cabang; uji IDOR lintas cabang.
- [ ] Validasi schema request dan ulangi perhitungan nominal/status di server.
- [ ] Simpan secret di secret manager/deployment environment; jangan commit `.env`.
- [ ] Lindungi mutasi dari CSRF bila pola autentikasi/cookie membutuhkannya.
- [ ] Terapkan rate limit dan proteksi brute force pada login, pencarian, dan endpoint sensitif.
- [ ] Redaksi nomor telepon/data pribadi dari log dan telemetry.
- [ ] Tambahkan audit log untuk perubahan harga, transaksi, pembayaran, status, dan stok.
- [ ] Siapkan backup terenkripsi, retensi, restore drill, dan prosedur insiden.
- [x] Jadwalkan backup private cabang Pro harian di Vercel Blob dengan retensi 30 hari dan endpoint Cron yang dilindungi `CRON_SECRET`.
- [ ] Lakukan uji pemulihan berkala dari salinan terjadwal.
- [ ] Terapkan dependency update dan pemeriksaan kerentanan pada pipeline.
- [ ] Tentukan dasar hukum, tujuan pemrosesan, akses, retensi, dan penghapusan data pelanggan.
- [ ] Periksa konfigurasi header keamanan, CSP, TLS, dan kebijakan upload sebelum rilis.
