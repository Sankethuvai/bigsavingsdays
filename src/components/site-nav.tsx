"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Menu, X } from "./icons";

const links = [
  { href: "/#deals-shortener", label: "Deal Shortener" },
  { href: "/#deals-hub", label: "Deals Hub" },
  { href: "/#analytics", label: "Analytics" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={`site-nav${scrolled ? " scrolled" : ""}`}>
      <div className="shell nav-inner">
        <Logo />
        <nav className="nav-links" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? " active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Start free</Link>
            </>
          )}
          <button className="nav-toggle" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X width={18} height={18} style={{ margin: "0 auto" }} /> : <Menu width={18} height={18} style={{ margin: "0 auto" }} />}
          </button>
        </div>
      </div>
      <div className={`mobile-menu${open ? " open" : ""}`}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        <Link href={signedIn ? "/dashboard" : "/login"} onClick={() => setOpen(false)}>{signedIn ? "Dashboard" : "Sign in"}</Link>
        {!signedIn && (
          <Link href="/signup" className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>Start free</Link>
        )}
      </div>
    </header>
  );
}
