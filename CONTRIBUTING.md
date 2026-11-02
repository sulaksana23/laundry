# Panduan Kontribusi

## Sebelum mulai

1. Baca `AGENTS.md` dan dokumen modul terkait di `docs/`.
2. Buka issue untuk perubahan lintas modul atau perubahan aturan usaha.
3. Jangan mulai perubahan yang menyentuh rumus/aturan yang belum disetujui.

## Standar implementasi

- Gunakan TypeScript strict dan hindari `any`.
- Pisahkan perubahan UI, domain, dan penyimpanan sesuai batas layer.
- Pertahankan API publik dan rute yang sudah ada kecuali issue meminta perubahan.
- Gunakan komponen dari `src/components/ui` untuk konsistensi.
- Perbarui dokumentasi saat alur, endpoint, skema data, atau perilaku UI berubah.
- Jangan commit `.env`, data pelanggan, file build, atau credential.

## Pemeriksaan sebelum pull request

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Untuk perubahan backend, sertakan pengujian service/domain. Jelaskan perilaku yang berubah, risiko migrasi, dan cara verifikasi manual di pull request.

## Commit

Gunakan pesan singkat berbentuk perintah, misalnya `feat(orders): add order detail workflow` atau `docs(api): define error response format`.
