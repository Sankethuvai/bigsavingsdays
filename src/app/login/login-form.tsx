"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthState } from "@/app/actions/auth";
import { Mail, Lock, ArrowRight } from "@/components/icons";

export function LoginForm({ next, showDemo }: { next: string; showDemo: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, null);

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <div className="search" style={{ maxWidth: "none" }}>
          <Mail width={15} height={15} />
          <input id="email" className="input" name="email" type="email" placeholder="you@company.com" autoComplete="email" required defaultValue={showDemo ? "admin@bigsavingsdays.com" : undefined} style={{ paddingLeft: 34 }} />
        </div>
      </div>
      <div className="field">
        <div className="row-between">
          <label className="label" htmlFor="password">Password</label>
          {showDemo && <span className="tiny muted">Demo password: admin1234</span>}
        </div>
        <div className="search" style={{ maxWidth: "none" }}>
          <Lock width={15} height={15} />
          <input id="password" className="input" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required maxLength={200} defaultValue={showDemo ? "admin1234" : undefined} style={{ paddingLeft: 34 }} />
        </div>
      </div>
      {state?.error && <p className="error-text" role="alert">{state.error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight width={16} height={16} />}
      </button>
      <p className="small muted center">
        No account yet? <Link href="/signup" style={{ textDecoration: "underline", color: "var(--ink)" }}>Create one free</Link>
      </p>
      {showDemo && (
        <>
          <div className="auth-divider">or</div>
          <Link href="/demo" className="btn btn-ghost btn-block">Enter the demo workspace</Link>
          <div className="demo-box">
            <b style={{ color: "var(--ink)" }}>Default test accounts</b><br />
            Admin — <code>admin@bigsavingsdays.com</code> / <code>admin1234</code><br />
            Creator — <code>user@bigsavingsdays.com</code> / <code>user1234</code><br />
            <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>(Legacy: <code>admin@velo.link</code> / <code>demo@velo.link</code> also active)</span>
          </div>
        </>
      )}
    </form>
  );
}
