"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { randomId } from "@/lib/crypto";
import { requireUser } from "@/lib/auth";
import { normalizeUrl, slugify, isValidSlug } from "@/lib/utils";
import { isUniqueViolation } from "@/lib/links";

export async function createPageAction(formData: FormData) {
  const user = await requireUser("/dashboard/pages");
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  let slug = slugify(String(formData.get("slug") ?? ""));
  if (!slug) slug = `page-${randomId(3)}`;
  if (!isValidSlug(slug) || slug.length < 2) redirect("/dashboard/pages?error=slug");

  const db = getDb();
  if (db.prepare("SELECT 1 FROM pages WHERE slug = ?").get(slug)) redirect("/dashboard/pages?error=taken");
  if (!title) redirect("/dashboard/pages?error=title");

  try {
    db.prepare(
      `INSERT INTO pages (id, user_id, slug, title, bio, theme, avatar_color, created_at)
       VALUES (?, ?, ?, ?, ?, 'light', ?, ?)`
    ).run(randomId(8), user.id, slug, title, bio, user.avatar_color, Date.now());
  } catch (error) {
    // The unique index is the source of truth when two requests race for one slug.
    if (isUniqueViolation(error)) redirect("/dashboard/pages?error=taken");
    throw error;
  }

  revalidatePath("/dashboard/pages");
}

export async function updatePageAction(formData: FormData) {
  const user = await requireUser("/dashboard/pages");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  const theme = String(formData.get("theme") ?? "light") === "dark" ? "dark" : "light";
  if (!title) redirect("/dashboard/pages?error=title");
  getDb().prepare("UPDATE pages SET title = ?, bio = ?, theme = ? WHERE id = ? AND user_id = ?").run(title, bio, theme, id, user.id);
  revalidatePath("/dashboard/pages");
}

export async function addPageLinkAction(formData: FormData) {
  const user = await requireUser("/dashboard/pages");
  const pageId = String(formData.get("pageId") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 48);
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  const db = getDb();
  const page = db.prepare("SELECT 1 FROM pages WHERE id = ? AND user_id = ?").get(pageId, user.id);
  if (!page) redirect("/dashboard/pages?error=notfound");
  if (!label || !url) redirect("/dashboard/pages?error=link");
  const count = (db.prepare("SELECT COUNT(*) AS n FROM page_links WHERE page_id = ?").get(pageId) as { n: number }).n;
  if (count >= 50) redirect("/dashboard/pages?error=cap");
  const max = (db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM page_links WHERE page_id = ?").get(pageId) as { m: number }).m;
  db.prepare("INSERT INTO page_links (id, page_id, label, url, sort_order, clicks) VALUES (?, ?, ?, ?, ?, 0)").run(randomId(8), pageId, label, url, max + 1);
  revalidatePath("/dashboard/pages");
}

export async function deletePageLinkAction(formData: FormData) {
  const user = await requireUser("/dashboard/pages");
  const id = String(formData.get("id") ?? "");
  const pageId = String(formData.get("pageId") ?? "");
  const page = getDb().prepare("SELECT 1 FROM pages WHERE id = ? AND user_id = ?").get(pageId, user.id);
  if (page) getDb().prepare("DELETE FROM page_links WHERE id = ?").run(id);
  revalidatePath("/dashboard/pages");
}

export async function deletePageAction(formData: FormData) {
  const user = await requireUser("/dashboard/pages");
  const id = String(formData.get("id") ?? "");
  getDb().prepare("DELETE FROM pages WHERE id = ? AND user_id = ?").run(id, user.id);
  revalidatePath("/dashboard/pages");
}
