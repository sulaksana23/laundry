# LaundryOS

Dashboard operasional laundry berbasis **Next.js App Router**, TypeScript, dan Tailwind CSS. Tampilan memakai pola TypeUI yang ringkas: fokus pada data, jarak rapat, navigasi sederhana, dan dark mode sebagai tema awal.

> **Status:** starter MVP untuk pengembangan. Semua nama dan nomor kontak dalam fixture adalah sintetis/masked; data transaksi hanya angka contoh. Dashboard memakai fixture; halaman Pesanan dapat membuat pesanan dan mengubah status yang tersimpan di `localStorage` browser. Belum ada autentikasi, database, multi-cabang, atau transaksi backend. Jangan gunakan data contoh sebagai catatan usaha sungguhan.

## Fitur antarmuka

- Ringkasan omzet, antrean proses, pesanan terbaru, dan catatan operasional.
- Pesanan: pencarian, filter status, buat pesanan, validasi form, hitung total berdasarkan katalog, dan lanjutkan status secara berurutan.
- Pelanggan, katalog layanan, persediaan, keuangan, laporan, dan pengaturan sebagai layar awal dengan data contoh.
- Layout responsif dengan navigasi desktop dan drawer untuk layar kecil.
- Komponen UI dasar, label status, format Rupiah/tanggal, dan domain pesanan terpusat.

## Teknologi

- Next.js App Router dan React Server Components untuk halaman yang tidak memerlukan interaksi browser.
- TypeScript strict mode.
- Tailwind CSS v4 melalui plugin PostCSS.
- Zod untuk validasi payload domain.
- Lucide React untuk ikon.

Next.js merekomendasikan App Router untuk aplikasi baru. Setup Tailwind mengikuti panduan resmi integrasi Next.js. Lihat [Next.js Installation](https://nextjs.org/docs/app/getting-started/installation) dan [Tailwind CSS + Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Menjalankan secara lokal

Persyaratan: Node.js **20.9 atau lebih baru** dan npm/pnpm.

```bash
corepack enable
pnpm install
pnpm dev
```

Buka `http://localhost:3000`.

Perintah proyek:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

File `.nvmrc` meminta Node.js 22. Salin `.env.example` ke `.env.local` hanya saat integrasi backend mulai dibuat. Variabel database belum digunakan oleh aplikasi demo ini.

## Struktur direktori

```text
src/
├── app/                       # route, metadata, layout, global CSS
│   └── (workspace)/           # layar aplikasi operasional
├── components/                # komponen UI dan layout lintas fitur
├── features/                  # domain dan komponen per fitur
│   └── orders/
│       ├── domain/            # tipe, schema, aturan transisi
│       ├── data/              # fixture data demo
│       └── components/        # UI interaktif pesanan
├── lib/                       # utilitas format dan class name
└── server/                    # batas penempatan controller/service/repository backend
docs/                          # spesifikasi dan standar teknis
```

Detail dan contoh pola ada di [docs/architecture.md](docs/architecture.md), [docs/pattern-controller-service-repository.md](docs/pattern-controller-service-repository.md), serta [AGENTS.md](AGENTS.md).

## Batas demo dan produksi

Data contoh di `src/features/orders/data/mock-orders.ts` bukan sumber data persisten. Pesanan yang dibuat melalui layar Pesanan disimpan di browser yang sedang dipakai, sehingga tidak muncul di perangkat atau browser lain. Sebelum operasional nyata, implementasikan autentikasi dan otorisasi, PostgreSQL, repository server, audit log, validasi API, migrasi, pencadangan, dan pengujian sesuai dokumentasi.

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [Arsitektur](docs/architecture.md) | Batas layer, folder, dan alur request |
| [Pola controller-service-repository](docs/pattern-controller-service-repository.md) | Template implementasi per fitur |
| [Modul](docs/modules.md) | Ruang lingkup modul dan acceptance criteria |
| [Aturan domain](docs/domain-rules.md) | Status pesanan, pembayaran, stok, dan aturan yang perlu dikonfirmasi |
| [Database](docs/database.md) | Usulan relasi PostgreSQL dan strategi migrasi |
| [Konvensi API](docs/api-conventions.md) | Bentuk endpoint, request, response, dan error |
| [UI TypeUI](docs/ui-typeui.md) | Token, tabel, formulir, modal, dan aksesibilitas |
| [Keamanan](docs/security.md) | Checklist sebelum rilis produksi |
| [Workflow](docs/development-workflow.md) | Branch, commit, review, dan quality gate |
| [Roadmap](docs/roadmap.md) | Tahapan dari demo ke sistem produksi |

## Lisensi

Belum ditentukan. Tetapkan lisensi sebelum mendistribusikan atau menerima kontribusi eksternal.
