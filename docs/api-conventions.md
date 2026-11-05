# Konvensi API

API operasional menggunakan Next.js Route Handler pada `/api`. Endpoint belum memakai prefix versi `/api/v1`; perubahan kontrak yang tidak kompatibel perlu disepakati dan didokumentasikan sebelum dilakukan.

## Endpoint yang tersedia

| Method | Path | Kegunaan | Akses |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Membuat akun pemilik | Publik, dibatasi percobaan |
| `POST` | `/api/auth/login` | Membuat sesi | Publik, dibatasi percobaan |
| `POST` | `/api/auth/logout` | Menghapus sesi | Sesi |
| `GET` | `/api/auth/session` | Membaca pengguna pada sesi | Sesi |
| `POST` | `/api/auth/branch` | Mengganti cabang aktif | Sesi dan keanggotaan cabang |
| `GET` | `/api/search?q=...` | Cari hingga 5 pesanan dan 5 pelanggan pada cabang aktif | Sesi dan izin baca; minimal 2 karakter |
| `GET`, `POST` | `/api/orders` | Daftar terfilter/paginated dan membuat pesanan | Sesi serta izin pesanan |
| `GET` | `/api/orders/export` | Ekspor pesanan dengan filter aktif | Sesi dan izin ekspor |
| `PATCH` | `/api/orders/{id}/status` | Memajukan status pesanan | Sesi dan izin status |
| `GET` | `/api/orders/{id}/history` | Riwayat status pesanan | Sesi dan izin baca |
| `POST` | `/api/orders/{id}/payments` | Mencatat pembayaran | Sesi dan izin pembayaran |
| `POST` | `/api/orders/{id}/cancel` | Membatalkan pesanan dengan alasan | Pemilik |
| `POST` | `/api/orders/{id}/refunds` | Mencatat refund dengan alasan | Pemilik |
| `GET`, `POST` | `/api/services` | Membaca katalog dan membuat layanan | Sesi dan izin layanan |
| `PATCH` | `/api/services/{id}` | Memperbarui layanan | Sesi dan izin kelola layanan |
| `POST` | `/api/customers/import` | Impor pelanggan CSV | Sesi dan izin pelanggan |
| `GET` | `/api/customers/export` | Ekspor direktori pelanggan | Sesi dan izin ekspor |
| `GET` | `/api/reports/export` | Ekspor laporan CSV | Pemilik, fitur Pro |
| `POST` | `/api/track` | Memeriksa status pesanan publik | Publik, kode + nomor HP, rate-limited |
| `GET` | `/api/health` | Status aplikasi/database | Publik, tanpa detail rahasia |
| `POST` | `/api/license/verify` | Memverifikasi kode LaundryOS Pro | Publik, rate-limited |
| `GET` | `/api/backup/export` | Mengunduh backup cabang | Pemilik, fitur Pro |
| `POST` | `/api/backup/restore` | Memulihkan backup cabang | Pemilik, fitur Pro |

`GET /api/orders` menerima filter `search`, `status`, `customerId`, `due` (`today`/`overdue`), dan `payment` (`unpaid`/`paid`). Filter tanggal memakai zona waktu cabang. Filter pembayaran mensyaratkan izin `finance:read`. Ekspor pesanan mengikuti filter yang sama.

Daftar direktori pelanggan dan halaman workspace memuat data melalui Server Component, bukan endpoint `GET /api/customers`. Mutasi keuangan, resep, staf, cabang, dan rekonsiliasi juga menggunakan Server Actions yang memvalidasi sesi dan izin.

## Bentuk request dan response

Kontrak response mengikuti kebutuhan tiap route dan saat ini belum seragam. Contoh bentuk yang digunakan:

```json
{ "order": { "id": "...", "status": "received" } }
```

```json
{ "items": [], "total": 0, "page": 1, "pageSize": 25 }
```

```json
{ "error": "Periksa kembali data yang dikirim." }
```

Jangan mengasumsikan semua route memakai envelope `{ data, meta }`. Saat menambah atau mengubah endpoint, pertahankan bentuk yang dipakai route sejenis dan dokumentasikan respons sukses maupun gagal.

## Aturan HTTP dan keamanan

- Gunakan `201` untuk resource baru, `200` untuk berhasil, serta status yang sesuai untuk validasi dan konflik domain.
- Status yang dipakai termasuk `400`, `401`, `403`, `404`, `409`, `413`, `422`, `429`, `500`, dan `503` sesuai route.
- Validasi input di server dengan schema Zod atau pemeriksaan domain yang setara; validasi browser hanya untuk pengalaman pengguna.
- Ambil cabang aktif, peran, dan identitas aktor dari sesi server. Jangan mempercayai nilai cabang, nominal, harga, atau role yang dikirim browser.
- Periksa izin sebelum membaca atau mengubah data dan batasi query ke cabang yang diizinkan.
- Mutasi penting harus mencatat aktor dan audit trail. Operasi yang mengubah pesanan dan stok harus tetap atomik di database.
- Endpoint publik yang memeriksa kredensial pesanan harus dibatasi percobaannya, menghindari cache, dan tidak mengungkap data sebelum pasangan kode + nomor HP cocok.
- Jangan menulis rahasia atau nomor pelanggan penuh ke log.

## Batas integrasi

Belum ada API publik untuk integrasi pihak ketiga, webhook pembayaran, atau pengiriman notifikasi otomatis. Rekonsiliasi bank/QRIS hanya menerima CSV dan menunggu konfirmasi petugas; endpoint tersebut tidak membuat pembayaran otomatis.
