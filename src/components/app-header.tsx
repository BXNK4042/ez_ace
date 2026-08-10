import Link from "next/link";
import { LogOut } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";

export function AppHeader({ session }: { session: Session }) {
  async function logout() { "use server"; await auth.api.signOut({ headers: await headers() }); redirect("/login"); }
  return <header className="topbar"><div className="topbar-inner"><Link className="brand" href={session.user.role === "admin" ? "/admin" : "/dashboard"}>Exam Prep</Link><nav className="nav"><span className="muted hide-mobile">{session.user.username}</span>{session.user.role === "admin" && <Link href="/dashboard">Student view</Link>}<form action={logout}><button className="button secondary small"><LogOut size={15} /> Log out</button></form></nav></div></header>;
}
