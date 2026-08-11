import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return <><AppHeader session={session} adminView />{children}</>;
}
