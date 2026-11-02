# Aturan Domain dan Asumsi

Dokumentasi ini membedakan perilaku demo dari aturan bisnis yang belum diputuskan.

## Pesanan pada demo

Status pengerjaan yang dipakai UI: `received` → `washing` → `drying` → `ironing` → `ready` → `completed`. Fungsi `canTransitionOrder` berada di `src/features/orders/domain/order.ts`. Pada layar demo, aksi “Lanjut proses” hanya memindahkan status satu tahap.

Status pembayaran demo: `unpaid`, `partial`, `paid`. Status pembayaran dan status pengerjaan sengaja terpisah.

## Asumsi data contoh

- Harga demo per unit tersedia pada katalog fixture.
- Berat contoh menggunakan kilogram; item tertentu memakai pcs/pasang.
- Estimasi tanggal hanya untuk menampilkan alur dan belum menghitung kalender libur/operasional.
- Pembayaran demo selalu dimulai sebagai belum dibayar.
- Pesanan demo baru tersimpan hanya pada `localStorage` browser.

Angka dan ketentuan ini bukan kebijakan usaha yang dikonfirmasi.

## Wajib diputuskan sebelum produksi

- Minimum order dan pembulatan berat (misalnya pembulatan per 0,1 kg atau 1 kg).
- Cara menangani layanan per pcs/pasang, item rusak/hilang, noda khusus, dan komplain.
- Cara menghitung layanan express, diskon, biaya pickup/delivery, pajak, dan pembulatan Rupiah.
- Apakah status bisa mundur, dilewati, dibatalkan, atau perlu persetujuan supervisor.
- Kapan transaksi dianggap selesai dan kapan pembayaran harus lunas.
- Kebijakan refund, uang muka, metode pembayaran, dan rekonsiliasi kas.
- Zona waktu cabang, jam tutup, hari libur, serta definisi omzet dan periode laporan.
- Hak akses kasir, operator, supervisor, owner, dan admin lintas cabang.

## Prinsip implementasi

- Simpan nominal sebagai integer Rupiah dan setiap perubahan invoice sebagai snapshot.
- Catat status history, aktor, timestamp, catatan, dan sumber perubahan.
- Hindari penghapusan permanen transaksi; gunakan pembatalan/void dengan alasan dan audit trail.
- Update stok melalui pergerakan masuk/keluar yang bisa ditelusuri.
- Jangan menurunkan aturan penting hanya dari UI atau nilai fixture.
