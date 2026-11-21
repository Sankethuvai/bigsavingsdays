import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/auth";
import { demoEnabled } from "@/lib/env";
import { Check } from "@/components/icons";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create your account" };

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <Logo href="/" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div className="kicker" style={{ color: "#a9b2c2" }}>Free forever plan</div>
          <h2 style={{ fontSize: 34, maxWidth: 400 }}>Start with 50 deal links. Maximize your commissions.</h2>
          <ul className="stack mt-24" style={{ gap: 12 }}>
            {[
              "Unlimited redirects — lightning fast",
              "Channel, device and referrer conversion analytics",
              "Deal QR codes with discount badge styling",
              "One Deals Hub bio storefront on bigsavingsdays.com",
              "API access with a personal bearer token",
            ].map((f) => (
              <li key={f} className="row gap-8" style={{ color: "#c8ced9", fontSize: 13.5 }}>
                <Check width={16} height={16} style={{ color: "var(--savings)" }} />{f}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ color: "#6d7789", fontSize: 12, position: "relative", zIndex: 1 }}>No credit card. Upgrade only when you outgrow free.</div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="only-mobile" style={{ marginBottom: 22 }}><Logo /></div>
          <h1>Create your account.</h1>
          <p className="lead">One workspace, high-converting deal links, verified savings.</p>
          <SignupForm showDemo={demoEnabled()} />
        </div>
      </main>
    </div>
  );
}
