import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

const SITE = "https://www.africavsthefuture.xyz";
// lastmod for the sitemap comes from the feeds (written by scripts/fetch-data.mjs
// before `astro build`): each article's updated/published date, each episode's date.
const read = (f) => { try { return JSON.parse(fs.readFileSync(new URL(`./src/data/${f}.json`, import.meta.url), "utf8")); } catch { return null; } };
const articles = [...(read("medium") || []), ...(read("substack") || [])];
const eps = read("soundcloud")?.episodes || [];
const lastmod = new Map();
const newest = (dates) => dates.filter(Boolean).sort().at(-1);
for (const a of articles) lastmod.set(`${SITE}/articles/${a.slug}`, a.updated || a.published);
for (const e of eps) lastmod.set(`${SITE}/podcast/${e.slug}`, e.published);
const newestEssay = newest(articles.map((a) => a.updated || a.published));
const newestEp = newest(eps.map((e) => e.published));
lastmod.set(`${SITE}/articles`, newestEssay);
lastmod.set(`${SITE}/podcast`, newestEp);
lastmod.set(`${SITE}/`, newest([newestEssay, newestEp]));
lastmod.set(`${SITE}/privacy`, "2026-10-19T00:00:00.000Z"); // matches the "Last updated" date on the page

export default defineConfig({
  site: SITE,
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "always" },
  compressHTML: true,
  redirects: { "/thought-leaders": "/#subscribe" },
  integrations: [sitemap({
    filter: (p) => !p.includes("/404") && !p.includes("thought-leaders"),
    serialize(item) {
      const url = item.url.replace(/\/$/, "") || item.url;
      const key = url === SITE ? `${SITE}/` : url;
      const lm = lastmod.get(key);
      return { ...item, url: key, ...(lm ? { lastmod: new Date(lm).toISOString() } : {}) };
    },
  })],
  image: { responsiveStyles: false },
  vite: { plugins: [tailwindcss()] },
  prefetch: { prefetchAll: true },
});
