import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { getSessionUserIdOrNull } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSessionUserIdOrNull()) redirect("/");
  return <AuthForm mode="register" />;
}
