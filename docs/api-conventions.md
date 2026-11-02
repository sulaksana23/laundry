# Konvensi API

API backend belum diaktifkan. Saat mulai dibuat, gunakan Next.js Route Handler sebagai adapter HTTP dan prefix `/api/v1`.

## Endpoint awal yang disarankan

| Method | Path | Kegunaan |
| --- | --- | --- |
| `GET` | `/api/v1/orders` | Cari/list order dengan filter, sort, dan pagination |
| `POST` | `/api/v1/orders` | Buat order dan item transaksi |
| `GET` | `/api/v1/orders/{id}` | Detail order, pembayaran, dan histori status |
| `PATCH` | `/api/v1/orders/{id}/status` | Transisi status yang tervalidasi |
| `POST` | `/api/v1/orders/{id}/payments` | Catat pembayaran/refund sesuai aturan yang disepakati |
| `GET/POST` | `/api/v1/customers` | Pencarian dan pembuatan pelanggan |
| `GET/POST` | `/api/v1/services` | Baca dan kelola katalog layanan |
| `GET/POST` | `/api/v1/inventory/items` | Baca barang dan catat penerimaan stok |

## Bentuk response

Sukses satu objek:

```json
{ "data": { "id": "...", "status": "received" } }
```

Sukses list:

```json
{ "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

Error terstruktur:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Periksa kembali data", "fields": { "weightKg": ["Nilai harus lebih dari 0"] }, "requestId": "..." } }
```

## Aturan HTTP

- `201` untuk resource baru, `200` untuk berhasil, `204` hanya jika body memang tidak diperlukan.
- `400` input tidak valid, `401` belum login, `403` tidak berizin, `404` tidak ditemukan pada scope yang diizinkan, `409` konflik domain, `422` aturan bisnis menolak, `500` error tak terduga.
- Gunakan schema Zod di request boundary dan response DTO yang tidak mengekspos field internal.
- Pagination default dan maksimum harus ditetapkan serta divalidasi di server.
- Jangan percaya `branchId`, nominal, status, role, atau harga dari client tanpa verifikasi.
- Tambahkan idempotency key untuk endpoint yang dapat dipanggil ulang akibat retry bila transaksi bisnis memerlukannya.
