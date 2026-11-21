"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type AuthState } from "@/app/actions/auth";
import { ArrowRight } from "@/components/icons";

export function SignupForm({ showDemo }: { showDemo: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, null);

  return (
    <form action={action} className="auth-form">
      <div className="field">
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" name="name" placeholder="Ada Lovelace" autoComplete="name" required minLength={2} />
      </div>
      <div className="field">
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" className="input" name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
      </div>
      <div className="field">
        <label className="label" htmlFor="password">Password</label>
        <input id="password" className="input" name="password" type="password" placeholder="At least 8 characters" autoComplete="new-password" required minLength={8} maxLength={200} />
        <span className="hint">Use 8+ characters. No credit card, no trial clock.</span>
      </div>
      {state?.error && <p className="error-text" role="alert">{state.error}</p>}
      <button className="btn btn-primary btn-block" type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create free account"}
        {!pending && <ArrowRight width={16} height={16} />}
      </button>
      <p className="tiny muted center">By creating an account you agree to the <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link> and <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy Policy</Link>.</p>
      {showDemo && (
        <>
          <div className="auth-divider">or</div>
          <Link href="/demo" className="btn btn-ghost btn-block">Explore the demo first</Link>
        </>
      )}
      <p className="small muted center">Already have an account? <Link href="/login" style={{ textDecoration: "underline", color: "var(--ink)" }}>Sign in</Link></p>
    </form>
  );
}
