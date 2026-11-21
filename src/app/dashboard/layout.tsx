import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const count = (getDb()
    .prepare("SELECT COUNT(*) AS n FROM links WHERE user_id = ?")
    .get(user.id) as { n: number }).n;

  return (
    <DashboardShell user={user} linkCount={count}>
      {children}
    </DashboardShell>
  );
}
