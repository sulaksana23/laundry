import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/components/auth-form";
import { getAuthSession, isAuthConfigured } from "@/server/modules/auth/auth.session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAuthSession()) redirect("/");
  return <AuthForm mode="login" authReady={isAuthConfigured()} />;
}
