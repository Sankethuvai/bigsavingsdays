"use client";

import { useState } from "react";
import { Check, Copy } from "./icons";

export function CopyButton({ text, label = "Copy", className = "btn btn-primary btn-sm" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }
  return (
    <button type="button" className={className} onClick={copy}>
      {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}
