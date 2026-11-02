# Workflow Pengembangan

## Branch dan commit

- `main`: branch yang selalu siap untuk dirilis.
- `feat/<nama>`: fitur baru.
- `fix/<nama>`: perbaikan bug.
- `docs/<nama>`: dokumentasi.
- Commit gunakan Conventional Commits singkat, misalnya `feat(orders): add order creation`.

## Pull request

Setiap PR menjelaskan tujuan, perubahan yang terlihat pengguna, skema/migrasi, dampak keamanan, cara verifikasi, dan screenshot bila UI berubah.

## Quality gate

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Tambahkan unit test untuk aturan domain dan service. Tambahkan integration test untuk database dan API. Tambahkan end-to-end test untuk alur menerima order, proses cucian, pembayaran, dan serah-terima saat backend tersedia.

## Rilis

1. Review migrasi dan kompatibilitas data.
2. Pastikan env staging/production lengkap dan berbeda.
3. Jalankan pemeriksaan, migrasi, dan smoke check staging.
4. Siapkan rollback aplikasi dan database.
5. Tinjau log/error setelah deploy tanpa mencatat secret atau data pelanggan berlebihan.
