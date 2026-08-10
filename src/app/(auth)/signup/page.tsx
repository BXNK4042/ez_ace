import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/session";

export default async function SignupPage() {
  if (await getSession()) redirect("/");
  return <main className="auth"><Card className="auth-card stack"><div><h1>Create account</h1><p className="muted">Signup code comes from your admin.</p></div><AuthForm mode="signup" /><p>Have account? <Link className="success" href="/login">Log in</Link></p></Card></main>;
}
