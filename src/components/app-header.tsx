import Link from "next/link";
import { LogOut } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";

export function AppHeader({ session, adminView = false }: { session: Session; adminView?: boolean }) {
  async function logout() { "use server"; await auth.api.signOut({ headers: await headers() }); redirect("/login"); }
  return <header className="topbar"><div className="topbar-inner"><Link className="brand" href={session.user.role === "admin" ? "/admin" : "/dashboard"}>EZ-ACE</Link><nav className="nav"><span className="muted hide-mobile">{session.user.username}</span>{session.user.role === "admin" && <Link href={adminView ? "/dashboard" : "/admin"}>{adminView ? "Student view" : "Admin"}</Link>}<form action={logout}><button className="button secondary small"><LogOut size={15} /> Log out</button></form></nav></div></header>;
}
