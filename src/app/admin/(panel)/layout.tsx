import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/actions/auth";
import { ArrowUpRight, Logout } from "@/components/icons";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/links", label: "Links" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="site-nav scrolled" style={{ position: "sticky" }}>
        <div className="shell nav-inner">
          <div className="row gap-12">
            <Logo href="/admin" />
            <span className="admin-badge">Admin</span>
          </div>
          <nav className="nav-links" aria-label="Admin">
            {tabs.map((t) => <Link key={t.href} href={t.href} className="nav-link">{t.label}</Link>)}
          </nav>
          <div className="row gap-8">
            <span className="small muted hide-mobile">{admin.name}</span>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">Workspace <ArrowUpRight width={13} height={13} /></Link>
            <ThemeToggle />
            <form action={signOutAction}><button className="icon-action" type="submit" aria-label="Sign out"><Logout /></button></form>
          </div>
        </div>
      </header>
      <div className="tabs shell" style={{ marginTop: 16, marginBottom: 0 }}>
        {tabs.map((t) => <Link key={t.href} href={t.href} className="tab">{t.label}</Link>)}
      </div>
      <main className="shell" style={{ paddingBlock: 24 }}>{children}</main>
    </>
  );
}
