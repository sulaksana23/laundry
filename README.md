# LaundryOS

Sistem operasional laundry berbasis **Next.js App Router**, TypeScript, dan Tailwind CSS. UI memakai pola TypeUI yang ringkas, responsif, serta berfokus pada data dan alur kerja harian.

![Pratinjau fitur LaundryOS](./public/readme-feature-overview.svg)

> **Status saat ini:** MVP. Pesanan, pelanggan, layanan, persediaan, keuangan, dan laporan memakai Neon pada Preview serta Production dengan sesi yang valid. Profil usaha dan preferensi di Pengaturan masih berupa contoh. Login/register aktif saat `DATABASE_URL` dan `AUTH_SECRET` tersedia; akun demo tidak dibuat otomatis. Gunakan data uji sampai audit, backup, dan kontrol operasional siap.

## Cakupan fitur lengkap

Daftar berikut adalah cakupan produk yang dituju. Status implementasi sebenarnya dirangkum setelah tabel ini.

| Modul | Fitur yang dituju |
| --- | --- |
| Dashboard | Ringkasan omzet dan jumlah pesanan; antrean per status; pesanan siap diambil dan belum lunas; tren periode; layanan terlaris; stok menipis; ringkasan per cabang. |
| Pesanan | Penerimaan cucian; data pelanggan dan item/layanan; berat atau satuan; estimasi selesai; harga dan diskon; status pengerjaan; riwayat perubahan; pembayaran penuh/parsial; pencarian, filter, pagination; nota cetak; pembatalan dan refund sesuai kebijakan. |
| Pelanggan | Profil dan kontak; pencarian; riwayat transaksi; frekuensi dan nilai transaksi; pencegahan duplikasi berdasarkan aturan nomor kontak; catatan preferensi dengan kontrol akses. |
| Layanan & harga | Katalog layanan per kg atau per item; harga, durasi, status aktif; layanan reguler/express; perubahan harga dengan snapshot agar invoice lama tetap akurat. |
| Persediaan | Katalog bahan; saldo dan batas minimum; penerimaan/penggunaan/penyesuaian melalui ledger; stok opname; peringatan stok menipis; histori pergerakan. |
| Keuangan | Pemasukan dan pengeluaran; metode pembayaran; tagihan belum lunas; pembayaran parsial; refund/reversal; rekap kas dan rekonsiliasi berdasarkan periode. |
| Laporan | Omzet, volume pesanan, status, pembayaran, layanan terlaris, pelanggan, pengeluaran, dan persediaan; filter tanggal/cabang; ekspor setelah hak akses dan definisi metrik ditetapkan. |
| Pengaturan & akses | Profil usaha dan cabang; jam operasional; konfigurasi layanan dan pembayaran; akun, role, hak akses; audit log; pengaturan notifikasi dan preferensi aplikasi. |
| Operasional lintas modul | Multi-cabang; notifikasi status/pesanan siap; impor data; backup dan pemulihan; validasi server; aksesibilitas dan tampilan responsif. |

## Status implementasi

| Bagian | Tersedia sekarang | Belum tersedia |
| --- | --- | --- |
| Dashboard | Ringkasan visual menggunakan data contoh | Query langsung dari database dan filter periode nyata |
| Pesanan | Pencarian/filter cabang, pagination server-side 25 baris, status dan pembayaran tersimpan, ekspor halaman aktif, nota ringkasan cetak | Histori audit yang dapat dilihat, refund, impor massal, dan role terperinci |
| Pelanggan | Tambah dan cari pelanggan tersimpan per cabang di Neon | Impor massal, histori lengkap, dan kontrol akses terperinci |
| Layanan & harga | Katalog tersimpan per cabang; tambah, ubah, aktif/nonaktif; harga aktif dipakai saat membuat pesanan | Satuan pcs/pasang pada form pesanan, histori perubahan harga, dan hak akses terperinci |
| Persediaan & keuangan | Penyesuaian stok, pengeluaran, pembayaran, dan ringkasan kas tersimpan di Neon | Ledger stok, refund/reversal, dan rekonsiliasi mendalam |
| Laporan | Agregasi transaksi tersimpan dan ekspor CSV | Filter periode/cabang yang lebih lengkap serta definisi metrik terverifikasi |
| Pengaturan | Tampilan profil, cabang, dan metode pembayaran | Simpan profil usaha dan preferensi ke database; role dan audit log |
| Platform | Layout responsif, komponen UI, TypeScript strict, pola controller/service/repository, migrasi PostgreSQL untuk pesanan | Role terperinci, API produksi, multi-cabang, backup, notifikasi |

Status rinci dan kriteria penerimaan ada di [docs/modules.md](docs/modules.md) dan [docs/roadmap.md](docs/roadmap.md). Nama serta nomor kontak dalam fixture bersifat sintetis/masked.

## Teknologi

- Next.js App Router dan React Server Components.
- TypeScript strict mode.
- Tailwind CSS v4 melalui plugin PostCSS.
- Zod untuk validasi domain.
- Lucide React untuk ikon.
- Pola controller → service → repository disiapkan untuk backend per modul.

## Menjalankan secara lokal

Persyaratan: Node.js **22** (lihat `.nvmrc`) dan npm.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Perintah yang tersedia:

```bash
npm run lint
npm run typecheck
npm run build
```

`.env.example` berisi variabel untuk Neon. Modul operasional memakai Neon jika `DATABASE_URL` tersedia dan sesi `AUTH_SECRET` valid. Local development juga perlu `LAUNDRY_DATABASE_MODE=true`. Jangan masukkan rahasia ke `NEXT_PUBLIC_*`.

## Deploy ke Vercel + PostgreSQL (Neon)

Repository ini menyiapkan migrasi SQL, autentikasi email/password, dan implementasi PostgreSQL untuk modul Pesanan. Vercel menjalankan `npm run db:migrate` sebelum build jika Neon menyediakan `DATABASE_URL`. API database aktif pada local development yang dikonfigurasi dan Vercel Preview; mode Production tetap demo karena autentikasi belum tersedia.

### Langkah deployment

1. Hubungkan repository `sulaksana23/laundry` ke Vercel dengan framework Next.js dan Node.js 22.
2. Tambahkan Neon PostgreSQL melalui integrasi Vercel Marketplace dan hubungkan resource ke environment Preview.
3. Pastikan `DATABASE_URL` dan `AUTH_SECRET` tersedia sebagai environment variable server-side untuk Preview. Buat `AUTH_SECRET` acak minimal 32 karakter; jangan menaruh rahasia di variabel `NEXT_PUBLIC_*`.
4. Build Vercel menjalankan migrasi SQL, lalu seeder demo secara idempoten sebelum build. Seeder dilewati jika akun demo belum terdaftar atau DATABASE_URL tidak tersedia; akun demo baru juga otomatis mendapat data saat registrasi.
5. Akses Preview melalui Vercel Authentication. Gunakan data uji sampai kebijakan backup dan audit siap.
6. Setelah deploy Production, akun dengan sesi valid memakai data Neon yang terisolasi menurut cabang.

### Lingkup database saat ini

Tabel cabang, pengguna, pelanggan, layanan, pesanan, histori status, pembayaran, persediaan, dan pengeluaran dibuat oleh migrasi. Modul operasional menyimpan data per cabang. Akun `demo@laundry.test` mendapat pelanggan, pesanan, pembayaran, persediaan, dan pengeluaran contoh saat didaftarkan; buat password sendiri pada formulir registrasi.

## Akun dan data demo

Daftarkan email `demo@laundry.test` melalui halaman registrasi dan pilih password sendiri. Saat akun demo dibuat, aplikasi mengisi cabangnya dengan pelanggan, pesanan, pembayaran, persediaan, dan pengeluaran sintetis. Akun serta password tidak ditanam sebagai kredensial bawaan di source code. Email lain mendapat cabang baru tanpa data contoh.

Jika akun demo sudah terdaftar sebelum fitur seed aktif, isi datanya sekali dengan `npm run db:seed:demo` setelah `DATABASE_URL` tersedia dan migrasi dijalankan. Seeder tidak menyimpan password dan tidak mengubah cabang yang sudah berisi data.

## Struktur direktori

```text
src/
├── app/                       # route, metadata, layout, global CSS
│   └── (workspace)/           # layar operasional
├── components/                # komponen UI dan layout bersama
├── features/                  # domain, data demo, dan UI per fitur
│   └── orders/
│       ├── domain/            # tipe, schema, aturan transisi
│       ├── data/              # fixture demo
│       └── components/        # UI interaktif pesanan
├── lib/                       # utilitas format dan class name
└── server/                    # pola controller/service/repository
docs/                          # spesifikasi dan standar teknis
```

## Dokumentasi proyek

| Dokumen | Isi |
| --- | --- |
| [Arsitektur](docs/architecture.md) | Batas layer, folder, dan alur request |
| [Pola controller-service-repository](docs/pattern-controller-service-repository.md) | Template implementasi per fitur |
| [Modul dan kriteria penerimaan](docs/modules.md) | Ruang lingkup modul dan definisi fitur |
| [Aturan domain](docs/domain-rules.md) | Status pesanan, pembayaran, stok, dan aturan yang perlu dikonfirmasi |
| [Rancangan database](docs/database.md) | Relasi PostgreSQL dan strategi migrasi |
| [Konvensi API](docs/api-conventions.md) | Bentuk endpoint, request, response, dan error |
| [UI TypeUI](docs/ui-typeui.md) | Token, tabel, formulir, modal, dan aksesibilitas |
| [Keamanan](docs/security.md) | Checklist sebelum rilis produksi |
| [Workflow pengembangan](docs/development-workflow.md) | Branch, commit, review, dan quality gate |
| [Roadmap](docs/roadmap.md) | Tahapan dari demo menuju sistem produksi |

## Lisensi

Belum ditentukan. Tetapkan lisensi sebelum mendistribusikan atau menerima kontribusi eksternal.
