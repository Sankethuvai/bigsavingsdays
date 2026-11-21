"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="notfound">
      <div>
        <div className="big">500</div>
        <h1 style={{ fontSize: 28, marginTop: 12 }}>Something broke on our side.</h1>
        <p className="muted" style={{ marginTop: 10, maxWidth: 440, marginInline: "auto" }}>
          The page hit an unexpected error. Try again — if it keeps happening, the team would like to know.
        </p>
        <div className="row" style={{ justifyContent: "center", marginTop: 24 }}>
          <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <Link href="/" className="btn btn-ghost">Back home</Link>
        </div>
      </div>
    </div>
  );
}
