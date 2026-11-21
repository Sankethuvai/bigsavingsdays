import type { MetadataRoute } from "next";
import { publicBaseUrl } from "@/lib/env";
import { getDb } from "@/lib/db";
import type { PageRow } from "@/lib/types";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicBaseUrl() ?? "https://bigsavingsdays.com";
  const now = new Date();

  // Core static marketing and developer pages
  const staticRoutes: { path: string; changeFrequency: "daily" | "weekly" | "monthly"; priority: number }[] = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/docs", changeFrequency: "weekly", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.7 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
    { path: "/status", changeFrequency: "daily", priority: 0.6 },
    { path: "/changelog", changeFrequency: "weekly", priority: 0.7 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
    { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  ];

  const sitemapEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Dynamically include public Deals Hub storefronts for indexing
  try {
    const db = getDb();
    const publicPages = db.prepare("SELECT slug, created_at FROM pages").all() as Pick<PageRow, "slug" | "created_at">[];
    for (const page of publicPages) {
      sitemapEntries.push({
        url: `${base}/p/${page.slug}`,
        lastModified: page.created_at ? new Date(page.created_at) : now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch {
    // Graceful fallback if database is not initialized during static generation
  }

  return sitemapEntries;
}
