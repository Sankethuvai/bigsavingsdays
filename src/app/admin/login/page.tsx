import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getSessionUser } from "@/lib/auth";
import { AdminLoginForm } from "./admin-login-form";
import { seedDemo } from "@/lib/env";

export const metadata = { title: "Admin login" };

export default async function AdminLoginPage() {
  const user = await getSessionUser();
  if (user?.role === "admin") redirect("/admin");

  return (
    <div className="auth-simple">
      <div className="auth-card" style={{ position: "relative" }}>
        <div className="center"><Logo /></div>
        <div className="card card-pad mt-16">
          <span className="admin-badge">Staff only</span>
          <h1 style={{ fontSize: 26, marginTop: 10 }}>Admin sign in</h1>
          <p className="lead">Restricted area. All actions are logged.</p>
          <AdminLoginForm showDemo={seedDemo()} />
        </div>
        <p className="center small muted mt-16"><a href="/" style={{ textDecoration: "underline" }}>Back to BigSavingsDays</a></p>
      </div>
    </div>
  );
}
