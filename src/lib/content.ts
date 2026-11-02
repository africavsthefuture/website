import type { ImageMetadata } from "astro";
import medium from "../data/medium.json";
import substack from "../data/substack.json";
import youtube from "../data/youtube.json";
import soundcloud from "../data/soundcloud.json";
import bluesky from "../data/bluesky.json";
import gumroad from "../data/gumroad.json";
import report from "../data/build-report.json";

const remote = import.meta.glob<{ default: ImageMetadata }>("../assets/remote/*", { eager: true });
const covers = import.meta.glob<{ default: ImageMetadata }>("../assets/covers/*", { eager: true });
import { site } from "../site.config.mjs";
import { keyPoints } from "../data/key-points.mjs";
// Remote (third-party) covers only when explicitly enabled; otherwise undefined → generated cover is used.
export const img = (file?: string | null) => (file && site.covers.remote ? remote[`../assets/remote/${file}`]?.default : undefined);
export const coverImg = (key: string) => covers[`../assets/covers/${key}.png`]?.default;

export type Article = {
  platform: "medium" | "substack"; slug: string; title: string; url: string; author: string;
  published: string; updated?: string | null; tags: string[]; subtitle?: string; excerpt: string; body?: string; words?: number;
  image?: string | null; imageSrc?: string | null;
};

// Essay bodies arrive with h2/h3/h4 depending on the platform. The page H1 is the
// title, so shift body headings until the top level is h2 (no h1→h3 jumps).
export function normalizeHeadings(html = "") {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
  if (!levels.length) return html;
  const shift = Math.min(...levels) - 2;
  if (!shift) return html;
  return html.replace(/<(\/?)h([1-6])(?=[\s>])/g, (_, slash, n) => `<${slash}h${Math.min(6, Math.max(2, +n - shift))}`);
}

const tidy = (a: Article): Article => {
  // Medium sometimes repeats the title as the first line of the body.
  const t = a.title.replace(/…$/, "");
  let ex = a.excerpt.startsWith(t) ? a.excerpt.slice(t.length).replace(/^[\s…:—-]+/, "") : a.excerpt;
  let body = a.body || "";
  // Drop a leading heading that only repeats the title.
  const firstH = body.match(/^\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/);
  if (firstH && plain(firstH[1]) === plain(a.title)) body = body.slice(firstH[0].length);
  return { ...a, excerpt: ex, body: normalizeHeadings(body) };
};

// ── Plain-text helpers ─────────────────────────────────────────────────────
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", mdash: "—", ndash: "–", hellip: "…" };
export const decodeEntities = (s = "") => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
// Inline tags (strong/em/a…) vanish without a gap; block tags become a space.
export const plain = (html = "") => decodeEntities(String(html)
  .replace(/<\/?(strong|b|em|i|a|code|sup|sub|span)(\s[^>]*)?>/gi, "")
  .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
// Normalise quotes/dashes/whitespace so verbatim checks are robust to typography.
const norm = (s: string) => s.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();

export const articles: Article[] = [...(medium as Article[]), ...(substack as Article[])]
  .map(tidy)
  .sort((a, b) => +new Date(b.published) - +new Date(a.published));
export const articleSlug = (a: Article) => a.slug;

export const episodes = (soundcloud as any).episodes as any[];
export const show = (soundcloud as any).show;
export const videos = youtube as any[];
export const posts = bluesky as any[];
export const buildReport = report as any;

export type Product = {
  id: string; permalink: string; name: string; price_cents: number; currency: string; url: string;
  description: string; summary?: string; kind: "mini-book" | "podcast" | "bundle"; issue: number | null;
  slug: string; image?: string | null; thumbnail?: string;
};
const allProducts = gumroad as Product[];
// Products that may be shown, respecting feature flags (store off → none).
export const products = site.features.store ? allProducts.filter((p) => site.features.miniBooks || p.kind !== "mini-book") : [];
export const productPath = (p: Product) =>
  p.kind === "mini-book" ? `/store/mini-books/${p.slug}` : p.kind === "podcast" ? `/store/podcasts/${p.slug}` : `/store/bundles/${p.slug}`;
export const displayName = (p: Product) =>
  p.kind === "mini-book" ? `Mini-book · Issue ${p.issue}` : p.kind === "podcast"
    ? p.name.replace(/^Africa vs The Future\s*-\s*Thought Leaders Podcast Series\s*-\s*/i, "").replace(/\\$/, "").trim()
    : p.name.replace(/^Africa vs The Future\s*-\s*/i, "").trim();
// Gumroad descriptions are often fragments (e.g. Issue 1 reads "This second issue of our Mini book series covers").
// TODO(GUMROAD-COPY): write full descriptions in Gumroad. Until then only descriptions of 12+ words are shown.
export const usableDescription = (p: Product) => (p.description && p.description.split(" ").length >= 12 ? p.description : "");
export const price = (cents: number, cur = "GBP") =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: cur }).format(cents / 100);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
export const platformLabel = (p: string) => ({ medium: "Medium", substack: "Substack", soundcloud: "SoundCloud", youtube: "YouTube" } as any)[p] ?? p;

// ── Answer-first summary + key points (verbatim from the essay) ───────────
const sentences = (t: string) => (t.match(/[^.!?]+(?:[.!?]+["”’)]*(?=\s|$)|$)/g) || []).map((x) => x.trim()).filter(Boolean);
export function keyPointsFor(a: Article): { summary: string; points: string[]; curated: boolean } {
  const text = norm(plain(a.body || a.excerpt));
  const ok = (q: string) => {
    const found = text.includes(norm(q));
    if (!found) console.warn(`[key-points] dropped (not verbatim in "${a.slug}"): ${q.slice(0, 80)}`);
    return found;
  };
  const kp = (keyPoints as any)[a.slug];
  if (kp) {
    const summary = (kp.summary as string[]).filter(ok).join(" ");
    const points = (kp.points as string[]).filter(ok);
    if (summary) return { summary, points, curated: true };
  }
  // Fallback: the essay's own subtitle, else its opening two sentences.
  const first = plain((a.body || "").match(/<p>[\s\S]*?<\/p>/)?.[0] || a.excerpt);
  return { summary: a.subtitle || sentences(first).slice(0, 2).join(" "), points: [], curated: false };
}

// Meta description: subtitle + summary, trimmed to ~155 chars on a word boundary.
export function describe(a: Article, max = 155) {
  const { summary } = keyPointsFor(a);
  let d = [a.subtitle && !/[.!?]$/.test(a.subtitle) ? a.subtitle + "." : a.subtitle, summary].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (d.length < 70) d = `${d} ${a.excerpt}`.trim();
  return clip(d, max);
}
// Trim to `max` chars: prefer a whole-sentence cut (if it keeps ≥70 chars), else a word cut + "…".
export function clip(t: string, max = 155) {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const m = [...cut.matchAll(/[.!?]["”’)]?(?=\s)/g)].at(-1);
  if (m && m.index! + 1 >= 70) return cut.slice(0, m.index! + m[0].length);
  return cut.slice(0, max - 1).replace(/\s+\S*$/, "").replace(/[,;:—–-]$/, "") + "…";
}

// Related essays: shared topic first, then shared title/tag words, then recency.
const STOP = new Set("the a an and or of to for in on is it its why what how with from by as at africa africas african nations s".split(" "));
const toks = (a: Article) => new Set(`${a.title} ${a.tags.join(" ")}`.toLowerCase().replace(/[’']/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
export function relatedTo(a: Article, topicOf: (t: string) => { label: string }, n = 3) {
  const topic = (x: Article) => topicOf(`${x.title} ${x.tags.join(" ")}`).label;
  const ta = toks(a), tp = topic(a);
  return articles.filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, s: (topic(x) === tp ? 3 : 0) + [...toks(x)].filter((w) => ta.has(w)).length }))
    .sort((p, q) => q.s - p.s || +new Date(q.x.published) - +new Date(p.x.published))
    .slice(0, n).map((r) => r.x);
}
export const lastmodOf = (a: Article) => a.updated || a.published;
export const episodePath = (e: any) => `/podcast/${e.slug}`;
