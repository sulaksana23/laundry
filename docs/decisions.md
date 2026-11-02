# Catatan Keputusan

## 2026-11-02 — Starter UI dan arsitektur

- Memakai Next.js App Router dan feature-first modular monolith agar UI dan API dapat dikembangkan dalam satu repo tanpa mencampur business logic.
- Menggunakan data contoh dan penyimpanan `localStorage` hanya untuk alur demo pesanan karena kredensial/database belum ditentukan.
- Menjadikan dark mode awal dan komponen compact sebagai gaya lokal TypeUI.
- Memisahkan service, repository, dan controller dalam dokumentasi sebelum mengaktifkan persistence produksi.

Keputusan ini dapat diganti melalui PR dan catatan alasan/dampaknya.
