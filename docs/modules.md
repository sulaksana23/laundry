# Modul dan Kriteria Penerimaan

Dokumen ini membatasi target produk agar istilah “lengkap” punya cakupan yang bisa dikembangkan per tahap.

| Modul | Tujuan | Cakupan awal | Kriteria penerimaan produksi |
| --- | --- | --- | --- |
| Dashboard | Ringkasan operasional | KPI, omzet, antrean, catatan stok | Nilai berasal dari query server dan rentang waktu jelas |
| Pesanan | Mengelola cucian | Penerimaan, layanan, berat, estimasi selesai, status, pembayaran | Nomor unik, validasi server, histori status, cetak/nota, pencarian dan pagination |
| Pelanggan | Data dan loyalitas | Identitas, kontak, jumlah transaksi | Dedup nomor kontak sesuai keputusan usaha, histori pesanan, hak akses |
| Layanan | Katalog harga | Nama, satuan, durasi, harga, status aktif | Perubahan harga tidak mengubah invoice lama |
| Persediaan | Bahan operasional | Barang, stok, batas minimum | Stok bergerak melalui ledger, bukan edit saldo tanpa catatan |
| Keuangan | Pemasukan/pengeluaran | Rekap, pembayaran tertunda, pengeluaran | Rekonsiliasi transaksi, metode bayar, refund, periode yang konsisten |
| Laporan | Analisis usaha | Omzet, volume, layanan terlaris | Rumus, zona waktu, pembatalan, dan status pembayaran didokumentasikan |
| Pengaturan | Konfigurasi usaha | Profil usaha, cabang, pembayaran | Role-based access, validasi server, perubahan tercatat |

## Di dalam repository saat ini

- Login dan registrasi memakai Neon serta cookie sesi bertanda tangan saat `DATABASE_URL` dan `AUTH_SECRET` tersedia. Pengguna membuat akunnya sendiri; seeder tidak membuat akun demo login.
- Pesanan, pelanggan, layanan, persediaan, pembayaran, pengeluaran, dan laporan membaca/menulis data per cabang pada deployment yang dikonfigurasi.
- Katalog layanan dapat ditambah, diubah, dan diaktifkan/nonaktifkan. Harga dibaca ulang di server saat pesanan dibuat; nama dan total pesanan lama tersimpan sebagai snapshot.
- Nota ringkasan pesanan dapat dicetak dari daftar pesanan; Dashboard dan profil Pengaturan masih memakai tampilan/contoh. Refund, role terperinci, audit log, dan pagination belum tersedia.
- Alur pesanan saat ini memilih layanan per kilogram. Layanan per pcs/pasang sudah ada di katalog, tetapi belum dapat dipilih pada form pesanan.

## Alur utama pesanan

1. Petugas memilih pelanggan atau memasukkan data baru.
2. Petugas memilih layanan dan unit/berat.
3. Aplikasi menampilkan estimasi biaya; backend nanti wajib menghitung ulang.
4. Pesanan masuk status awal.
5. Status bergerak sesuai urutan yang disetujui usaha.
6. Pembayaran dicatat; pelunasan tidak otomatis mengubah status pengerjaan.
7. Pesanan ditutup setelah aturan serah-terima dipenuhi.

Langkah 1, 3, 6, dan 7 memerlukan aturan pemilik usaha sebelum menjadi transaksi produksi.
