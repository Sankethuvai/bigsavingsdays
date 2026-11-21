"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { signOutAction } from "@/app/actions/auth";
import { initials } from "@/lib/utils";
import {
  Chart, Globe, Grid, Key, Layout, LinkIcon, Logout, Menu, Plus, Settings,
  Shield, X, ArrowUpRight,
} from "./icons";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: string;
  avatar_color: string;
};

const mainNav = [
  { href: "/dashboard", label: "Overview", icon: Layout },
  { href: "/dashboard/links", label: "Deal Links", icon: LinkIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: Chart },
  { href: "/dashboard/pages", label: "Deals Hubs", icon: Grid },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
];

const devNav = [{ href: "/dashboard/api", label: "API keys", icon: Key }];
const accountNav = [{ href: "/dashboard/settings", label: "Settings", icon: Settings }];

export function DashboardShell({
  user,
  linkCount,
  children,
}: {
  user: User;
  linkCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const navItem = (item: { href: string; label: string; icon: typeof Layout }, count?: number) => {
    const Icon = item.icon;
    return (
      <Link key={item.href} href={item.href} className={`side-link${isActive(item.href) ? " active" : ""}`} onClick={() => setOpen(false)}>
        <Icon />
        <span>{item.label}</span>
        {count !== undefined && <span className="count">{count}</span>}
      </Link>
    );
  };

  const current = [...mainNav, ...devNav, ...accountNav].find((n) => isActive(n.href));

  return (
    <div className="app-shell">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="row-between" style={{ paddingRight: 4 }}>
          <Logo href="/dashboard" />
          <button className="icon-action only-mobile" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
        </div>

        <div className="side-section">Workspace</div>
        {mainNav.map((n) => navItem(n, n.href === "/dashboard/links" ? linkCount : undefined))}

        <div className="side-section">Developers</div>
        {devNav.map((n) => navItem(n))}

        <div className="side-section">Account</div>
        {accountNav.map((n) => navItem(n))}
        {user.role === "admin" && (
          <Link href="/admin" className="side-link" style={{ color: "var(--signal)" }}>
            <Shield /><span>Admin panel</span><span className="admin-badge">Staff</span>
          </Link>
        )}

        <div className="side-footer">
          <div className="side-user">
            <span className="avatar" style={{ background: user.avatar_color }}>{initials(user.name)}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div className="mail" style={{ textTransform: "capitalize" }}>{user.plan} plan</div>
            </div>
            <form action={signOutAction}>
              <button className="icon-action" type="submit" aria-label="Sign out" title="Sign out"><Logout /></button>
            </form>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="row gap-12">
            <button className="icon-action only-mobile" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
            <div className="crumbs hide-mobile">
              <span>Workspace</span>
              <span style={{ opacity: .4 }}>/</span>
              <b>{current?.label ?? "Dashboard"}</b>
            </div>
          </div>
          <div className="row gap-8">
            <Link href="/" className="btn btn-ghost btn-sm hide-mobile" target="_blank">
              View site <ArrowUpRight width={13} height={13} />
            </Link>
            <ThemeToggle />
            <Link href="/dashboard/links?new=1" className="btn btn-deal btn-sm"><Plus width={14} height={14} /> New Deal Link</Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
