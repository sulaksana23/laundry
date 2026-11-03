// Daftar fitur LaundryOS Pro dan status lisensi yang dibagikan ke UI.
// Fitur inti (pesanan, pelanggan, layanan, stok, keuangan dasar, lacak publik)
// selalu gratis; fitur di daftar ini memerlukan aktivasi Pro.

export interface ProFeature {
  key: string;
  label: string;
  description: string;
}

export const PRO_FEATURES: ProFeature[] = [
  {
    key: "reports-export",
    label: "Ekspor laporan CSV",
    description: "Unduh rekap transaksi tersimpan sebagai berkas CSV untuk dibagikan atau diolah lagi.",
  },
  {
    key: "cash-closing",
    label: "Tutup kasir harian",
    description: "Rekonsiliasi kas tunai sistem dengan uang fisik setiap hari dan catat selisihnya.",
  },
  {
    key: "backup-restore",
    label: "Backup & restore data",
    description: "Unduh salinan seluruh data cabang dan pulihkan kembali bila diperlukan.",
  },
];

export const TRAKTEER_SUPPORT_URL = "https://trakteer.id/bali_techsolution/support";

export interface LicenseStatusView {
  active: boolean;
  holderName: string | null;
  holderEmail: string | null;
  expiresAt: string | null;
}

export const INACTIVE_LICENSE: LicenseStatusView = {
  active: false,
  holderName: null,
  holderEmail: null,
  expiresAt: null,
};
