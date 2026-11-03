import type { Metadata } from "next";

import { TrackForm } from "./track-form";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description: "Cek status cucian Anda dengan kode pesanan dan nomor HP terdaftar, tanpa perlu masuk.",
};

export default function TrackPage() {
  return <TrackForm />;
}
