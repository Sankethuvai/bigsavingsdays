import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";
import { getSessionUser } from "@/lib/auth";
import { demoEnabled } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Logo href="/" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <blockquote>&ldquo;A deal link should build buyer trust, deliver instant savings, and maximize commissions. That is the whole product.&rdquo;</blockquote>
          <div className="quote-by">The BigSavingsDays principle</div>
          <div className="row gap-16 mt-32" style={{ color: "#a9b2c2", fontSize: 12.5 }}>
            <span>Verified deal badges</span>
            <span>·</span>
            <span>+42% Average CTR</span>
            <span>·</span>
            <span>Affiliate tags preserved</span>
          </div>
        </div>
        <div style={{ color: "#6d7789", fontSize: 12, position: "relative", zIndex: 1 }}>© {new Date().getFullYear()} BigSavingsDays.com. High-converting deal links.</div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="only-mobile" style={{ marginBottom: 22 }}><Logo /></div>
          <h1>Welcome back.</h1>
          <p className="lead">Sign in to manage links, domains and the numbers behind them.</p>
          <LoginForm next={next ?? "/dashboard"} showDemo={demoEnabled()} />
        </div>
      </main>
    </div>
  );
}
