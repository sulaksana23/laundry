import { UserPlus, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StaffMember } from "@/server/modules/auth/auth.repository";
import { createStaffMember, setStaffMemberActive } from "./staff-actions";

export function StaffManager({ staff }: { staff: StaffMember[] }) {
  return <Card id="staff" className="p-4 sm:p-5">
    <div className="mb-4 flex items-center gap-2"><UsersRound size={16} className="text-accent" /><div><h2 className="text-sm font-semibold">Akun staf</h2><p className="mt-1 text-[11px] text-muted">Kasir dapat mengelola transaksi; operator hanya melihat dan memproses pesanan.</p></div></div>
    <form action={createStaffMember} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <Input name="fullName" required minLength={2} maxLength={100} placeholder="Nama staf" aria-label="Nama staf" />
      <Input name="email" required type="email" maxLength={254} placeholder="Email login" aria-label="Email staf" />
      <Input name="password" required type="password" minLength={12} maxLength={128} autoComplete="new-password" placeholder="Password awal (min. 12)" aria-label="Password awal staf" />
      <Select name="role" defaultValue="cashier" aria-label="Peran staf"><option value="cashier">Kasir</option><option value="operator">Operator</option></Select>
      <FormSubmitButton variant="primary" pendingText="Menyimpan…"><UserPlus size={14} /> Tambah staf</FormSubmitButton>
    </form>
    <div className="mt-4 divide-y divide-border rounded-lg border border-border">
      {staff.map((member) => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-xs">
        <div className="min-w-0"><p className="truncate font-medium">{member.fullName} <span className="text-muted">· {member.role === "cashier" ? "Kasir" : "Operator"}</span></p><p className="truncate text-[10px] text-muted">{member.email}</p></div>
        <form action={setStaffMemberActive}><input type="hidden" name="userId" value={member.userId} /><input type="hidden" name="active" value={String(!member.isActive)} /><FormSubmitButton variant="secondary" className="h-8 px-2.5 text-[11px]">{member.isActive ? "Nonaktifkan" : "Aktifkan"}</FormSubmitButton></form>
      </div>)}
      {staff.length === 0 && <p className="px-3 py-4 text-center text-[11px] text-muted">Belum ada akun staf.</p>}
    </div>
  </Card>;
}
