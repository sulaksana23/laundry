# Modul dan Kriteria Penerimaan

Dokumen ini membatasi target produk agar istilah “lengkap” punya cakupan yang bisa dikembangkan per tahap.

| Modul | Tujuan | Cakupan awal | Kriteria penerimaan produksi |
| --- | --- | --- | --- |
| Dashboard | Ringkasan operasional | KPI, omzet, antrean, catatan stok, tren 7/30/90 hari | Nilai berasal dari query server dan rentang waktu lokal cabang jelas |
| Pesanan | Mengelola cucian | Penerimaan, layanan kg/pcs/pasang, biaya express/antar, diskon, estimasi selesai, status, pembayaran, pembatalan/refund, ekspor | Nomor unik, validasi server, histori status, snapshot harga/unit, ledger refund, cetak/nota, pencarian dan pagination |
| Pelanggan | Data dan loyalitas | Identitas, kontak, jumlah transaksi | Dedup nomor kontak sesuai keputusan usaha, histori pesanan, hak akses |
| Layanan | Katalog harga | Nama, satuan, durasi, harga, status aktif | Perubahan harga tidak mengubah invoice lama |
| Persediaan | Bahan operasional | Barang, stok, batas minimum, resep konsumsi otomatis per layanan/tahap, biaya rata-rata, estimasi HPP bahan, pembelian/pemakaian/penyesuaian dengan alasan | Saldo bergerak melalui ledger per cabang; status pesanan ditahan saat resep membutuhkan stok yang tidak cukup; biaya tidak diketahui ditandai belum lengkap |
| Keuangan | Pemasukan/pengeluaran | Rekap, pembayaran tertunda, refund, pengeluaran, tutup kasir, rekonsiliasi CSV manual | Ledger pembayaran tidak berubah saat mutasi dicocokkan; kecocokan memerlukan konfirmasi pengguna |
| Laporan | Analisis usaha | Filter tanggal, perbandingan periode setara, layanan terlaris, metode pembayaran, estimasi HPP bahan, rekap lintas cabang untuk pemilik | Zona waktu cabang, akses cabang, definisi metrik dan metode pembayaran ditampilkan |
| Pengaturan | Konfigurasi usaha | Profil, cabang, pindah cabang, akun staf kasir/operator, akses lintas cabang, aktif/nonaktif staf | Akses cabang diverifikasi di server, validasi per peran, perubahan penting tercatat |

## Di dalam repository saat ini

- Login dan registrasi memakai Neon serta cookie sesi bertanda tangan saat `DATABASE_URL` dan `AUTH_SECRET` tersedia. Pengguna membuat akunnya sendiri; seeder tidak membuat akun demo login. Cabang aktif di sesi harus cocok dengan keanggotaan akses pengguna.
- Pesanan, pelanggan, layanan, persediaan, pembayaran, pengeluaran, dan laporan membaca/menulis data per cabang pada deployment yang dikonfigurasi. Daftar pelanggan mendukung ekspor CSV seluruh hasil pencarian; ekspor mengalir bertahap dan nilai berbahaya spreadsheet diamankan.
- Katalog layanan dapat ditambah, diubah, dan diaktifkan/nonaktifkan. Harga dibaca ulang di server saat pesanan dibuat; jumlah, unit, harga unit, dan total menjadi snapshot pesanan.
- Nota ringkasan dapat dicetak dan memberi tautan `/lacak`; riwayat pelanggan, pencarian, pagination, dan ekspor pesanan berjalan per cabang. Pemilik mengatur staf, memberi akses staf ke cabang tambahan, membuat/memilih cabang yang boleh diakses, dan melihat aktivitas audit.
- Layanan per kg, pcs, dan pasang tersedia pada form pesanan. Pcs/pasang menerima jumlah bulat; harga katalog per unit dikalikan jumlah.
- Riwayat persediaan mencatat jenis pergerakan, selisih, alasan, pengguna, dan waktu. Pemilik dapat mengatur pemakaian otomatis per layanan dan tahap; tanpa resep, stok tetap dikelola manual.
- Biaya pembelian menghasilkan biaya rata-rata tertimbang dan snapshot HPP resep; laporan menandai pesanan bila ada pemakaian tanpa biaya tercatat.
- Pesanan dapat memakai biaya express/antar serta diskon yang dimasukkan staf; perubahan harga katalog tidak mengubah tagihan lama.
- Pemilik dapat membatalkan pesanan dan mencatat refund sebagian/penuh setelah pembatalan. Refund memperbarui saldo pembayaran dan laporan; pengiriman dana tetap dilakukan manual di kanal eksternal.
- Laporan mendukung rentang tanggal maksimal 366 hari, perbandingan dengan periode sebelumnya yang sama panjang, dan ringkasan penerimaan menurut metode untuk dicocokkan dengan mutasi bank/penyedia QRIS.
- Laporan pemilik merangkum jumlah pesanan dan penerimaan bersih dari cabang yang terhubung ke akun, dengan tanggal lokal tiap cabang.
- Rekonsiliasi CSV membatasi 1 MB/1.000 baris, menghindari impor berkas identik, menyarankan pembayaran dengan cabang/nominal/metode/tanggal sama, lalu menunggu tindakan manual. Tidak memanggil API eksternal dan tidak mengubah ledger pembayaran.
- Pemilik cabang Pro dapat mengunduh dan memulihkan backup JSON manual dari Pengaturan. Salinan perlu disimpan sendiri di tempat aman.
- Matriks akses awal: Pemilik memiliki akses penuh; Kasir mengelola pesanan, pelanggan, pembayaran, dan keuangan; Operator melihat serta memajukan status pesanan dan melihat persediaan. Pembatalan/refund dibatasi untuk pemilik. Pemilik dapat berpindah di antara cabang yang terdaftar pada akunnya; data modul tetap dibatasi ke cabang aktif.

## Alur utama pesanan

1. Petugas memilih pelanggan atau memasukkan data baru.
2. Petugas memilih layanan dan unit/berat.
3. Server membaca harga katalog aktif dan menghitung biaya; jumlah, unit, harga, dan total disimpan pada pesanan.
4. Pesanan masuk status awal.
5. Status bergerak sesuai urutan yang disetujui usaha.
6. Pembayaran dicatat; pelunasan tidak otomatis mengubah status pengerjaan.
7. Pesanan ditutup setelah aturan serah-terima dipenuhi.

Besaran biaya express/antar dan diskon ditentukan oleh petugas saat membuat pesanan; tetapkan aturan harga usaha sebelum dipakai. Proses refund dicatat aplikasi, tetapi dana dikembalikan secara manual lewat kanal pembayaran.
