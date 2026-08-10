import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui";
import { getSession } from "@/lib/session";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <main className="auth"><Card className="auth-card stack"><div><h1>Welcome back</h1><p className="muted">Log in with your class username.</p></div><AuthForm mode="login" /><p>New student? <Link className="success" href="/signup">Create account</Link></p></Card></main>;
}
