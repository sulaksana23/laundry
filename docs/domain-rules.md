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

## Harga dan jumlah layanan

- Pesanan per kg menghitung total dari berat × harga katalog per kg, dibulatkan ke Rupiah terdekat seperti alur yang sudah berjalan.
- Pesanan per pcs/pasang menerima jumlah bulat dan menghitung total dari harga katalog per unit × jumlah. Setiap pesanan menyimpan unit, jumlah, harga unit, dan total sebagai snapshot agar perubahan katalog tidak mengubah nota lama.
- Biaya express, biaya antar, dan diskon dapat dicatat manual per pesanan. Total = jumlah × harga snapshot + biaya express + biaya antar − diskon. Server menolak diskon yang melebihi subtotal dan biaya tambahan.
- Biaya express/antar tidak dihitung otomatis dari jarak atau estimasi waktu; pajak dan aturan pembulatan berat juga belum diterapkan.

## Pembatalan dan refund

- Pemilik dapat membatalkan pesanan yang belum selesai dengan alasan wajib. Pesanan selesai tidak dapat dibatalkan; pembayaran baru juga ditolak setelah pembatalan.
- Refund hanya dicatat untuk pesanan yang sudah dibatalkan. Nominal boleh sebagian atau penuh, tidak boleh melebihi saldo pembayaran bersih, dan menyimpan alasan, metode, aktor, serta waktu.
- Pembatalan masuk ke riwayat status dan audit; refund disimpan pada ledger tersendiri dan mengurangi pemasukan/kas sesuai metode serta tanggal refund.
- Aplikasi mencatat transaksi refund, tetapi tidak mengirim uang secara otomatis. Pemilik tetap melakukan pengembalian dana melalui kanal pembayaran usaha.

Angka dan ketentuan ini bukan kebijakan usaha yang dikonfirmasi.

## Wajib diputuskan sebelum produksi

- Minimum order dan pembulatan berat (misalnya pembulatan per 0,1 kg atau 1 kg).
- Cara menangani item rusak/hilang, noda khusus, dan komplain pada layanan per pcs/pasang.
- Cara menghitung layanan express, diskon, biaya pickup/delivery, pajak, dan pembulatan Rupiah.
- Apakah status boleh mundur/dilewati dan apakah pembatalan perlu persetujuan supervisor.
- Kapan transaksi dianggap selesai dan kapan pembayaran harus lunas.
- Kebijakan uang muka, bukti refund, dan rekonsiliasi kas.
- Zona waktu cabang, jam tutup, hari libur, serta definisi omzet dan periode laporan.
- Apakah dibutuhkan role supervisor atau admin lintas cabang selain Pemilik/Kasir/Operator.

## Prinsip implementasi

- Simpan nominal sebagai integer Rupiah dan setiap perubahan invoice sebagai snapshot.
- Catat status history, aktor, timestamp, catatan, dan sumber perubahan.
- Hindari penghapusan permanen transaksi; gunakan pembatalan/void dengan alasan dan audit trail.
- Update stok melalui pergerakan masuk/keluar yang bisa ditelusuri.
- Jangan menurunkan aturan penting hanya dari UI atau nilai fixture.
