// SEO/AEO audit of the built site (dist/). Run after `npm run build`: npm run audit
// Checks titles, descriptions, H1/heading order, canonical, hreflang, OG/Twitter
// images, image alt/size, internal links, JSON-LD parse + required fields, sitemap coverage.
import fs from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const DIST = path.resolve("dist");
const SITE = "https://www.africavsthefuture.xyz";
const files = [];
async function walk(d) { for (const e of await fs.readdir(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? await walk(p) : p.endsWith(".html") && files.push(p); } }
await walk(DIST);
const urlOf = (f) => { let r = "/" + path.relative(DIST, f).replace(/\.html$/, "").replace(/(^|\/)index$/, ""); return r === "/" ? "/" : r.replace(/\/$/, ""); };
const exists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const resolveLocal = async (u) => {
  const p = u.split(/[?#]/)[0];
  if (p === "/" || p === "") return exists(path.join(DIST, "index.html"));
  return (await exists(path.join(DIST, p + ".html"))) || (await exists(path.join(DIST, p))) || (await exists(path.join(DIST, p, "index.html")));
};
const problems = []; const P = (u, m) => problems.push(`${u}: ${m}`);
const titles = new Map(), descs = new Map(); const linkCount = {};
const sitemapXml = await fs.readFile(path.join(DIST, "sitemap-0.xml"), "utf8").catch(() => "");
const inSitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const req = {
  Article: ["headline", "datePublished", "dateModified", "author", "image", "publisher", "mainEntityOfPage"],
  BlogPosting: ["headline", "datePublished", "dateModified", "author", "image", "publisher", "mainEntityOfPage"],
  BreadcrumbList: ["itemListElement"], Organization: ["name", "url", "logo"], WebSite: ["name", "url"],
  PodcastSeries: ["name", "url"], PodcastEpisode: ["name", "url", "datePublished", "partOfSeries"], FAQPage: ["mainEntity"],
};
for (const f of files.sort()) {
  const u = urlOf(f); const $ = load(await fs.readFile(f, "utf8"));
  const noindex = /noindex/.test($('meta[name="robots"]').attr("content") || "");
  const redirect = $('meta[http-equiv="refresh"]').length > 0;
  if (redirect) { if (inSitemap.has(SITE + u)) P(u, "redirect page in sitemap"); continue; }
  const t = $("head > title").text(); const d = $('meta[name="description"]').attr("content") || "";
  if (!noindex) { titles.set(t, [...(titles.get(t) || []), u]); descs.set(d, [...(descs.get(d) || []), u]); }
  if (t.length < 25 || t.length > 65) P(u, `title length ${t.length}: "${t}"`);
  if (d.length < 70 || d.length > 160) P(u, `description length ${d.length}`);
  const h1 = $("h1").length; if (h1 !== 1) P(u, `${h1} H1s`);
  let prev = 0; $("h1,h2,h3,h4,h5,h6").each((_, el) => { const l = +el.tagName[1]; if (prev && l > prev + 1) P(u, `heading jump h${prev}→h${l} ("${$(el).text().trim().slice(0, 40)}")`); prev = l; });
  const canon = $('link[rel="canonical"]').attr("href");
  if (!noindex) { if (!canon) P(u, "no canonical"); else if (canon !== SITE + (u === "/" ? "/" : u)) P(u, `canonical mismatch ${canon}`); }
  if (!noindex && !$('link[rel="alternate"][hreflang="en"]').length) P(u, "no hreflang=en");
  if (!$('html').attr("lang")) P(u, "no html lang");
  for (const k of ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[property="og:image:alt"]', 'meta[name="twitter:image:alt"]']) if (!$(k).attr("content")) P(u, `missing ${k}`);
  const og = $('meta[property="og:image"]').attr("content") || "";
  if (og.startsWith(SITE) && !(await exists(path.join(DIST, og.slice(SITE.length))))) P(u, `og:image file missing ${og}`);
  $("img").each((_, el) => { const a = $(el).attr("alt"); if (a === undefined) P(u, `img without alt ${$(el).attr("src")}`); if (!$(el).attr("width") || !$(el).attr("height")) P(u, `img without width/height ${$(el).attr("src")}`); });
  const hrefs = new Set();
  $("a[href]").each((_, el) => { const h = $(el).attr("href"); if (h.startsWith("/") && !h.startsWith("//")) hrefs.add(h); else if (h.startsWith(SITE)) hrefs.add(h.slice(SITE.length) || "/"); });
  for (const h of hrefs) { if (!(await resolveLocal(h))) P(u, `BROKEN internal link ${h}`); const k = h.split(/[?#]/)[0] || "/"; linkCount[k] = (linkCount[k] || 0) + 1; }
  $('link[rel="alternate"], link[rel="sitemap"]').each((_, el) => { const h = $(el).attr("href"); if (h?.startsWith("/") && !h.startsWith("//")) hrefs.add(h); });
  const blocks = $('script[type="application/ld+json"]');
  if (!blocks.length) P(u, "no JSON-LD");
  blocks.each((_, el) => {
    let j; try { j = JSON.parse($(el).text()); } catch (e) { return P(u, `JSON-LD parse error ${e.message}`); }
    const nodes = (Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j]);
    for (const n of nodes) { for (const k of req[n["@type"]] || []) if (n[k] === undefined || n[k] === null || n[k] === "") P(u, `JSON-LD ${n["@type"]} missing ${k}`); }
  });
  if (!noindex && !inSitemap.has(SITE + (u === "/" ? "/" : u))) P(u, "indexable page NOT in sitemap");
  if (noindex && inSitemap.has(SITE + u)) P(u, "noindex page IN sitemap");
}
for (const [t, us] of titles) if (us.length > 1) P(us.join(", "), `duplicate title "${t}"`);
for (const [d, us] of descs) if (us.length > 1) P(us.join(", "), `duplicate description`);
for (const loc of inSitemap) if (!(await resolveLocal(loc.slice(SITE.length) || "/"))) P(loc, "sitemap URL has no page");
const orphan = files.map(urlOf).filter((u) => !linkCount[u] && u !== "/" && u !== "/404" && u !== "/thought-leaders");
if (orphan.length) P("site", `pages with no internal links: ${orphan.join(", ")}`);
console.log(`Audited ${files.length} HTML files, ${inSitemap.size} sitemap URLs.`);
console.log(problems.length ? problems.map((p) => " - " + p).join("\n") : "No problems found.");
process.exitCode = problems.some((p) => /BROKEN|parse error/.test(p)) ? 1 : 0;
