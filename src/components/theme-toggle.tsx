"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "./icons";

export function ThemeToggle({ className = "theme-toggle" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("velo-theme", next);
      document.cookie = `velo-theme=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" className={className} onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
      {theme === "dark" ? <Sun width={17} height={17} /> : <Moon width={17} height={17} />}
    </button>
  );
}
