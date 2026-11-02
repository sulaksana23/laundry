# Standar Kerja LaundryOS

Panduan untuk Codex dan coding agent yang mengubah repository ini.

## Bahasa dan efisiensi

- Gunakan bahasa Indonesia untuk UI dan penjelasan; istilah teknis boleh berbahasa Inggris.
- Jawab ringkas, baca file yang relevan saja, dan hindari scan `node_modules`, `.next`, atau file hasil generate.
- Sebelum edit, jelaskan rencana singkat. Inspeksi read-only boleh dilakukan lebih dulu.

## Arsitektur

- Pertahankan Next.js App Router, TypeScript strict, dan struktur feature-first.
- Jaga pemisahan `app` (route), `components` (UI bersama), `features` (domain/use-case/UI per fitur), `server` (HTTP/application/data access), dan `lib` (utilitas generik).
- Untuk backend, alirkan pekerjaan melalui controller → service/use-case → repository. Controller menangani HTTP, service aturan bisnis, repository penyimpanan data.
- Jangan akses database langsung dari komponen React atau controller.
- Jangan menaruh business logic di halaman, komponen presentasi, atau utilitas UI.
- Buat dependency mengarah ke dalam: domain tidak mengimpor Next.js, React, atau adapter database.

## Aturan domain

- Baca `docs/domain-rules.md` sebelum mengubah alur pesanan, tagihan, pembayaran, persediaan, atau laporan.
- Aturan bisnis yang belum diputuskan harus ditandai sebagai asumsi dan dikonfirmasi pemilik usaha sebelum dipakai untuk transaksi nyata.
- Perubahan status harus memvalidasi transisi di service/domain, bukan hanya menyembunyikan pilihan di UI.
- Nilai uang disimpan sebagai integer Rupiah; hindari float untuk perhitungan pembayaran.

## UI/UX TypeUI

- Ikuti `docs/ui-typeui.md`: layout compact, hierarki tipografi jelas, dark mode awal, tabel rapat, jarak konsisten, dan responsive.
- Gunakan komponen UI yang sudah ada sebelum membuat variasi baru.
- Setiap kontrol harus punya label/accessible name, focus state, dan state loading/error/empty yang sesuai.
- Hindari tombol yang tampak aktif jika aksinya belum diimplementasikan. Jika masih placeholder, tandai dan nonaktifkan.
- Pertahankan istilah UI Indonesia yang jelas dan konsisten.

## Keamanan dan data

- Jangan simpan password, token, atau data pelanggan asli di source control.
- Semua input tepercaya harus divalidasi ulang di server. Validasi browser hanya untuk pengalaman pengguna.
- Periksa tenant/cabang dan izin pengguna pada setiap query server.
- Jangan mencatat rahasia atau data pribadi lengkap ke log.
- Data contoh hanya untuk demo; jangan menyamarkannya sebagai data produksi.

## Quality gate

- Jalankan `pnpm lint`, `pnpm typecheck`, dan `pnpm build` sebelum mengusulkan merge bila lingkungan memungkinkan.
- Tambahkan pengujian untuk aturan domain, service, dan alur kritis saat fitur backend mulai dibuat.
- Jangan menghapus atau mengganti fitur/rute tanpa memeriksa pemakainya.
