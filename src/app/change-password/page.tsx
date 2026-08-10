import { AppHeader } from "@/components/app-header";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/session";

export default async function ChangePasswordPage() {
  const session = await requireUser(true);
  return <><AppHeader session={session} /><main className="auth"><Card className="auth-card"><h1>Change password</h1><p className="muted">Temporary passwords work once. Choose your own before continuing.</p><ChangePasswordForm /></Card></main></>;
}
