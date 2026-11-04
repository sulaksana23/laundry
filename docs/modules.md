# Modul dan Kriteria Penerimaan

Dokumen ini membatasi target produk agar istilah “lengkap” punya cakupan yang bisa dikembangkan per tahap.

| Modul | Tujuan | Cakupan awal | Kriteria penerimaan produksi |
| --- | --- | --- | --- |
| Dashboard | Ringkasan operasional | KPI, omzet, antrean, catatan stok | Nilai berasal dari query server dan rentang waktu jelas |
| Pesanan | Mengelola cucian | Penerimaan, layanan kg/pcs/pasang, jumlah, estimasi selesai, status, pembayaran | Nomor unik, validasi server, histori status, snapshot harga/unit, cetak/nota, pencarian dan pagination |
| Pelanggan | Data dan loyalitas | Identitas, kontak, jumlah transaksi | Dedup nomor kontak sesuai keputusan usaha, histori pesanan, hak akses |
| Layanan | Katalog harga | Nama, satuan, durasi, harga, status aktif | Perubahan harga tidak mengubah invoice lama |
| Persediaan | Bahan operasional | Barang, stok, batas minimum, pembelian/pemakaian/penyesuaian dengan alasan | Saldo bergerak melalui ledger per cabang, bukan edit tanpa jejak |
| Keuangan | Pemasukan/pengeluaran | Rekap, pembayaran tertunda, pengeluaran, tutup kasir | Pencocokan metode bayar dan kas; refund masih mengikuti kebijakan usaha |
| Laporan | Analisis usaha | Filter tanggal, perbandingan periode setara, layanan terlaris, metode pembayaran | Zona waktu cabang, definisi metrik dan metode pembayaran ditampilkan |
| Pengaturan | Konfigurasi usaha | Profil, akun staf kasir/operator, aktif/nonaktif staf | Hak akses per peran, validasi server, perubahan penting tercatat |

## Di dalam repository saat ini

- Login dan registrasi memakai Neon serta cookie sesi bertanda tangan saat `DATABASE_URL` dan `AUTH_SECRET` tersedia. Pengguna membuat akunnya sendiri; seeder tidak membuat akun demo login.
- Pesanan, pelanggan, layanan, persediaan, pembayaran, pengeluaran, dan laporan membaca/menulis data per cabang pada deployment yang dikonfigurasi. Daftar pelanggan mendukung ekspor CSV seluruh hasil pencarian; ekspor mengalir bertahap dan nilai berbahaya spreadsheet diamankan.
- Katalog layanan dapat ditambah, diubah, dan diaktifkan/nonaktifkan. Harga dibaca ulang di server saat pesanan dibuat; jumlah, unit, harga unit, dan total menjadi snapshot pesanan.
- Nota ringkasan dapat dicetak; riwayat pelanggan, pencarian, dan pagination pesanan berjalan di server per cabang. Pemilik mengatur akun kasir/operator dan melihat aktivitas audit.
- Layanan per kg, pcs, dan pasang tersedia pada form pesanan. Pcs/pasang menerima jumlah bulat; harga katalog per unit dikalikan jumlah.
- Riwayat persediaan mencatat jenis pergerakan, selisih, alasan, pengguna, dan waktu. Saat ini pemakaian stok perlu dicatat staf secara manual.
- Laporan mendukung rentang tanggal maksimal 366 hari, perbandingan dengan periode sebelumnya yang sama panjang, dan ringkasan penerimaan menurut metode untuk dicocokkan dengan mutasi bank/penyedia QRIS.
- Matriks akses awal: Pemilik memiliki akses penuh; Kasir mengelola pesanan, pelanggan, pembayaran, dan keuangan; Operator melihat serta memajukan status pesanan dan melihat persediaan. Hak lintas cabang dan refund belum tersedia.

## Alur utama pesanan

1. Petugas memilih pelanggan atau memasukkan data baru.
2. Petugas memilih layanan dan unit/berat.
3. Server membaca harga katalog aktif dan menghitung biaya; jumlah, unit, harga, dan total disimpan pada pesanan.
4. Pesanan masuk status awal.
5. Status bergerak sesuai urutan yang disetujui usaha.
6. Pembayaran dicatat; pelunasan tidak otomatis mengubah status pengerjaan.
7. Pesanan ditutup setelah aturan serah-terima dipenuhi.

Aturan refund, biaya tambahan, layanan express, dan serah-terima tetap memerlukan kebijakan usaha sebelum diaktifkan.
