import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSession } from "@/server/modules/auth/auth.session";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  return <AppShell user={{ fullName: session.fullName, email: session.email, branchName: session.branchName }}>{children}</AppShell>;
}
