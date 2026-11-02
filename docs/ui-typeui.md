# Panduan UI TypeUI

TypeUI di repository ini adalah standar tampilan proyek: ringkas, konsisten, fokus pada keterbacaan dan pekerjaan operasional. Ini adalah pedoman lokal, bukan ketergantungan terhadap package eksternal.

## Prinsip visual

- Dark mode sebagai tema awal dengan kontras teks yang cukup.
- Surface bertingkat seperlunya; hindari kartu dekoratif berulang dan ruang kosong besar.
- Gunakan aksen lime untuk aksi utama dan fokus, warna lain hanya untuk status.
- Tipografi satu keluarga system sans-serif; judul tegas, label ringkas, nilai penting mudah discan.
- Tabel rapat dengan kolom inti, header kecil, separator halus, dan horizontal scroll di mobile.
- Maksimum satu aksi primer pada setiap header halaman.

## Token

Token dasar didefinisikan sebagai CSS variables di `src/app/globals.css` dan diekspos ke Tailwind v4 melalui `@theme inline`.

| Token | Peran |
| --- | --- |
| `background` | Latar halaman |
| `surface` | Panel dan kartu |
| `surface-raised` | Header tabel dan bidang sekunder |
| `surface-hover` | Hover dan elemen terpilih |
| `border` | Garis pemisah |
| `foreground` / `muted` | Teks utama / sekunder |
| `accent` | CTA, fokus, elemen aktif |
| `success` / `warning` / `danger` | Status semantik |

## Komponen dan layout

- Pakai `Button`, `Input`, `Select`, `Card`, dan `OrderStatusBadge` sebelum membuat ulang pola.
- Tinggi kontrol standar 36 px; radius 8–12 px; gunakan skala gap 4, 8, 12, 16, 24 px.
- Modal harus punya judul, deskripsi, tombol tutup, label field, pesan error, dan area aksi.
- Gunakan empty state yang menjelaskan kondisi serta langkah berikutnya.
- Tampilkan status dalam teks, bukan warna saja.
- Semua tabel harus memiliki caption/heading yang bermakna, header kolom, dan label kontrol input.

## Responsif dan aksesibilitas

- Navigasi samping menjadi drawer di viewport kecil.
- Tabel boleh scroll horizontal, tetapi jangan memotong kolom informasi penting tanpa alternatif detail.
- Semua fitur dapat diakses keyboard; fokus terlihat; tombol icon-only wajib punya accessible name.
- Targetkan kontras WCAG AA untuk teks dan status; jangan gunakan warna muted untuk teks utama.
- Hormati reduced motion jika animasi ditambahkan.

## Bahasa antarmuka

- Gunakan Bahasa Indonesia yang lugas: “Pesanan baru”, “Siap diambil”, “Belum bayar”.
- Istilah teknis hanya dipakai jika memang dikenal pengguna; berikan konteks bila ambigu.
- Konsisten antara tabel, form, notifikasi, dan dokumentasi.
