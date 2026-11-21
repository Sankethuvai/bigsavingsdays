import type { MetadataRoute } from "next";
import { publicBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl() ?? "https://bigsavingsdays.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/*", "/about", "/pricing", "/docs", "/status", "/changelog", "/terms", "/privacy", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard", "/dashboard/*", "/admin", "/admin/*", "/api", "/api/*", "/login", "/signup"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Google-Extended", "Applebot"],
        allow: ["/", "/p/*", "/about", "/pricing", "/docs", "/llms.txt", "/llms-full.txt"],
        disallow: ["/dashboard/*", "/admin/*", "/api/*"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
