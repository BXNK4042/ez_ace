import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return <><AppHeader session={session} />{children}</>;
}
