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
// Remote (third-party) covers only when explicitly enabled; otherwise undefined → generated cover is used.
export const img = (file?: string | null) => (file && site.covers.remote ? remote[`../assets/remote/${file}`]?.default : undefined);
export const coverImg = (key: string) => covers[`../assets/covers/${key}.png`]?.default;

export type Article = {
  platform: "medium" | "substack"; slug: string; title: string; url: string; author: string;
  published: string; updated?: string | null; tags: string[]; subtitle?: string; excerpt: string; body?: string; words?: number;
  image?: string | null; imageSrc?: string | null;
};

const tidy = (a: Article): Article => {
  // Medium sometimes repeats the title as the first line of the body.
  const t = a.title.replace(/…$/, "");
  let ex = a.excerpt.startsWith(t) ? a.excerpt.slice(t.length).replace(/^[\s…:—-]+/, "") : a.excerpt;
  return { ...a, excerpt: ex };
};

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
