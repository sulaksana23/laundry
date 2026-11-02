import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthSession, isAuthConfigured } from "@/server/modules/auth/auth.session";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getAuthSession();
  const productionDemo = process.env.VERCEL_ENV === "production" && !isAuthConfigured();
  if (!session && !productionDemo) redirect("/login");

  const user = session
    ? { fullName: session.fullName, email: session.email, branchName: session.branchName, isDemo: false }
    : { fullName: "Laundry Demo", email: "", branchName: "Cabang Demo", isDemo: true };
  return <AppShell user={user}>{children}</AppShell>;
}
