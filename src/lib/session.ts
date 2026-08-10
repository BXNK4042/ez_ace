import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser(allowPasswordChange = false) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allowPasswordChange && session.user.mustChangePassword) redirect("/change-password");
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}
