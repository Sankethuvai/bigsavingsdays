"use client";

import { useActionState } from "react";
import { adminSignInAction } from "../actions";
import { ArrowRight, Shield } from "@/components/icons";

export function AdminLoginForm({ showDemo }: { showDemo: boolean }) {
  const [state, action, pending] = useActionState(adminSignInAction, null);
  return (
    <form action={action} className="auth-form">
      <div className="field"><label className="label" htmlFor="email">Admin email</label><input id="email" className="input" name="email" type="email" defaultValue={showDemo ? "admin@velo.link" : undefined} required autoComplete="username" /></div>
      <div className="field"><label className="label" htmlFor="password">Password</label><input id="password" className="input" name="password" type="password" defaultValue={showDemo ? "admin1234" : undefined} required autoComplete="current-password" maxLength={200} /></div>
      {state?.error && <p className="error-text">{state.error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>{pending ? "Checking…" : "Sign in to admin"} {!pending && <ArrowRight width={16} height={16} />}</button>
      {showDemo && (
        <div className="demo-box"><Shield width={13} height={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Demo admin — <code>admin@velo.link</code> / <code>admin1234</code></div>
      )}
    </form>
  );
}
