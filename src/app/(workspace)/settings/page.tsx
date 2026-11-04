import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, CreditCard, Crown, Database, Info, Store, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { APP_NAME, APP_VERSION_LABEL } from "@/lib/app-info";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { isOrdersDatabaseEnabled } from "@/server/db/mode";
import { getAuthSession } from "@/server/modules/auth/auth.session";
import { AuthService } from "@/server/modules/auth/auth.service";
import { getBranchProfile } from "@/server/modules/workspace/operations";
import { getLicenseStatus } from "@/server/modules/license/license";
import { INACTIVE_LICENSE } from "@/lib/pro-features";
import { activateLicense, addBranch, updateBranchProfile } from "./actions";
import { ProActivationCard } from "./pro-activation-card";
import { BackupCard } from "./backup-card";
import { StaffManager } from "./staff-manager";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (session && session.role !== "owner") redirect("/");
  const databaseEnabled = Boolean(session) && isOrdersDatabaseEnabled();
  const profile = databaseEnabled ? await getBranchProfile(session!.branchId) : null;
  const licenseStatus = databaseEnabled ? await getLicenseStatus(session!.branchId) : INACTIVE_LICENSE;
  const staff = databaseEnabled ? await new AuthService().listStaff(session!.branchId) : [];

  return (
    <>
      <PageHeader eyebrow="Preferensi bisnis" title="Pengaturan" description="Kelola profil usaha dan preferensi operasional." />
      <div className="grid gap-4 xl:grid-cols-[220px_1fr]"><nav className="space-y-1"><a href="#business" className="flex h-9 items-center gap-2 rounded-lg bg-surface-hover px-3 text-xs font-medium"><Store size={14} className="text-accent" /> Profil bisnis</a><a href="#branch" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><Building2 size={14} /> Cabang</a><a href="#staff" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><UsersRound size={14} /> Akun staf</a><a href="#payment" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><CreditCard size={14} /> Pembayaran</a><a href="#system" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><Info size={14} /> Sistem</a><a href="#pro" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><Crown size={14} /> LaundryOS Pro</a><a href="#backup" className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs text-muted hover:bg-surface-hover"><Database size={14} /> Backup & restore</a></nav>
        <div className="space-y-4"><Card id="business" className="p-4 sm:p-5"><div className="mb-4 border-b border-border pb-3"><h2 className="text-sm font-semibold">Profil bisnis</h2><p className="mt-1 text-[11px] text-muted">Informasi yang tampil pada nota dan laporan.</p></div>
          {profile ? (
            <form action={updateBranchProfile}>
              <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Nama usaha<Input name="name" required minLength={2} maxLength={100} defaultValue={profile.name} className="mt-1.5" /></label><label className="text-xs font-medium">Nomor telepon<Input name="phone" maxLength={32} defaultValue={profile.phone} placeholder="08xx xxxx xxxx" className="mt-1.5" /></label><label className="text-xs font-medium">Email usaha<Input name="email" type="email" maxLength={254} defaultValue={profile.email} placeholder="usaha@contoh.com" className="mt-1.5" /></label><label className="text-xs font-medium">Zona waktu<Select name="timezone" defaultValue={profile.timezone} className="mt-1.5"><option value="Asia/Makassar">WITA · Asia/Makassar</option><option value="Asia/Jakarta">WIB · Asia/Jakarta</option><option value="Asia/Jayapura">WIT · Asia/Jayapura</option></Select></label><label className="text-xs font-medium sm:col-span-2">Alamat usaha<Input name="address" maxLength={300} defaultValue={profile.address} placeholder="Jalan, kelurahan, kota" className="mt-1.5" /></label></div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><p className="text-[10px] text-muted">Tersimpan di database cabang. Perubahan nama cabang tampil penuh setelah masuk kembali.</p><FormSubmitButton variant="primary">Simpan perubahan</FormSubmitButton></div>
            </form>
          ) : (
            <><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Nama usaha<Input defaultValue="Laundry Demo" className="mt-1.5" /></label><label className="text-xs font-medium">Nomor telepon<Input defaultValue="08XX-XXXX-0000" className="mt-1.5" /></label><label className="text-xs font-medium">Email usaha<Input defaultValue="admin@example.com" className="mt-1.5" /></label><label className="text-xs font-medium">Zona waktu<Select defaultValue="Asia/Makassar" className="mt-1.5"><option value="Asia/Makassar">WITA · Asia/Makassar</option><option value="Asia/Jakarta">WIB · Asia/Jakarta</option><option value="Asia/Jayapura">WIT · Asia/Jayapura</option></Select></label></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><p className="text-[10px] text-muted">Mode demo: profil contoh tidak disimpan. Masuk dengan database aktif untuk menyimpan profil usaha.</p><Button disabled variant="primary" title="Simpan tersedia saat database aktif">Simpan perubahan</Button></div></>
          )}
          </Card>
          {databaseEnabled && <StaffManager staff={staff} />}
          {databaseEnabled && <Card id="branch-management" className="p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Tambah cabang</h2><p className="mt-1 text-[11px] text-muted">Cabang baru otomatis masuk ke ringkasan pemilik dan mendapat katalog layanan awal.</p></div><form action={addBranch} className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"><label className="text-xs font-medium">Nama cabang<Input name="name" required minLength={2} maxLength={100} placeholder="Laundry Denpasar" className="mt-1.5" /></label><label className="text-xs font-medium">Zona waktu<Select name="timezone" defaultValue="Asia/Makassar" className="mt-1.5"><option value="Asia/Makassar">WITA · Asia/Makassar</option><option value="Asia/Jakarta">WIB · Asia/Jakarta</option><option value="Asia/Jayapura">WIT · Asia/Jayapura</option></Select></label><FormSubmitButton variant="primary">Tambah cabang</FormSubmitButton></form></Card>}
          <Card id="branch" className="p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Cabang aktif</h2><p className="mt-1 text-[11px] text-muted">Cabang yang sedang digunakan pada tampilan.</p></div><div className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3"><span className="rounded-lg bg-surface-hover p-2 text-accent"><Building2 size={16} /></span><div className="flex-1"><p className="text-xs font-semibold">{profile ? profile.name : "Laundry Demo · Bangli"}</p><p className="mt-0.5 text-[10px] text-muted">{profile ? (profile.address || "Alamat belum diisi") + " · " + profile.timezone : "Alamat contoh · Bangli, Bali"}</p></div><span className="rounded-md bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-200">Aktif</span></div></Card>
          <Card id="payment" className="p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Pembayaran</h2><p className="mt-1 text-[11px] text-muted">Metode yang dapat dicatat pada transaksi.</p></div><div className="flex flex-wrap gap-2"><span className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[11px]">Tunai</span><span className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[11px]">Transfer bank</span><span className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-[11px]">QRIS</span></div></Card>
          <Card id="system" className="p-4 sm:p-5"><div className="mb-3"><h2 className="text-sm font-semibold">Sistem</h2><p className="mt-1 text-[11px] text-muted">Informasi aplikasi yang sedang digunakan.</p></div><div className="space-y-2 text-xs"><div className="flex items-center justify-between gap-3"><span className="text-muted">Nama aplikasi</span><span className="font-medium">{APP_NAME}</span></div><div className="flex items-center justify-between gap-3"><span className="text-muted">Versi aplikasi</span><span className="rounded-md bg-surface-hover px-2 py-1 text-[11px] font-semibold">{APP_VERSION_LABEL}</span></div></div></Card>
          <Card id="pro" className="p-4 sm:p-5"><div className="mb-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Crown size={15} className="text-accent" /> LaundryOS Pro</h2><p className="mt-1 text-[11px] text-muted">Fitur lanjutan bagi pendukung Bali Tech Solution di Trakteer. Fitur inti LaundryOS selalu gratis.</p></div><ProActivationCard mode={databaseEnabled ? "db" : "demo"} initialStatus={licenseStatus} activateAction={databaseEnabled ? activateLicense : undefined} /></Card>
          <Card id="backup" className="p-4 sm:p-5"><div className="mb-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Database size={15} className="text-accent" /> Backup & restore data</h2><p className="mt-1 text-[11px] text-muted">Salinan seluruh data cabang yang dapat diunduh dan dipulihkan (fitur LaundryOS Pro).</p></div><BackupCard mode={databaseEnabled ? "db" : "demo"} initialProActive={licenseStatus.active} /></Card></div>
      </div>
    </>
  );
}
