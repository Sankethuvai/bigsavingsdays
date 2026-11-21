"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icons";

export function ThemeRow() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);
  function set(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("bsd-theme", next);
      localStorage.setItem("velo-theme", next);
      document.cookie = `bsd-theme=${next}; path=/; max-age=31536000; samesite=lax`;
      document.cookie = `velo-theme=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* ignore */ }
  }
  return (
    <div className="seg" style={{ width: "100%" }}>
      <button type="button" className={theme === "light" ? "active" : ""} onClick={() => set("light")} style={{ flex: 1, padding: "8px 0" }}><Sun width={13} height={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Light</button>
      <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => set("dark")} style={{ flex: 1, padding: "8px 0" }}><Moon width={13} height={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Dark</button>
    </div>
  );
}
