// Build-time content fetcher. Runs before `astro build`.
// Each source is fetched with a timeout. On success the result is written to
// src/data/<source>.json AND src/data/cache/<source>.json. On failure (or with
// OFFLINE=1) the last good cache is used, so a build never ships an empty page.
// Remote images are downloaded into src/assets/remote/ so Astro can turn them
// into responsive AVIF/WebP with fixed dimensions.
import { XMLParser } from "fast-xml-parser";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { site } from "../src/site.config.mjs";
import sanitizeHtml from "sanitize-html";
import sharp from "sharp";
import { policyFor, usable, coverOverride } from "../src/data/image-policy.mjs";
import { episodeOverrides } from "../src/data/episode-overrides.mjs";
const PUB_IMG = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "public/essay-img");

// Full article body for on-site reading. Inline images/figures/embeds are removed on
// purpose: feed artwork is third-party and some of it uses continent/map imagery,
// which the brand rules out. Text, headings, lists, quotes, links and tables stay.
function cleanBody(html = "") {
  let out = sanitizeHtml(String(html), {
    allowedTags: ["p", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "strong", "b", "em", "i", "a", "br", "hr", "code", "pre", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    exclusiveFilter: (f) => ["p", "li", "h2", "h3", "h4", "blockquote"].includes(f.tag) && !f.text.trim(),
    transformTags: {
      h1: "h2",
      a: (tag, attribs) => ({ tagName: "a", attribs: { href: attribs.href || "", rel: "noopener", ...(/^https?:/.test(attribs.href || "") ? { target: "_blank" } : {}) } }),
    },
    nonTextTags: ["style", "script", "textarea", "option", "noscript", "figure", "figcaption", "picture", "iframe", "svg", "button", "form"],
  });
  // Drop Medium's "originally published" tracker line and Substack share/subscribe chrome.
  out = out.replace(/<p>\s*<a[^>]*>\s*(Subscribe now|Share|Leave a comment)\s*<\/a>\s*<\/p>/gi, "");
  out = out.replace(/<a href="https:\/\/medium\.com\/_\/stat[^"]*"[^>]*><\/a>/gi, "");
  // Growth phase: no sales CTAs or platform boilerplate inside on-site articles.
  out = out.replace(/<p>(?:(?!<\/p>)[\s\S])*?(gumroad\.com|Thanks for reading|Subscribe for free to receive new posts)(?:(?!<\/p>)[\s\S])*?<\/p>/gi, "");
  out = out.replace(/<p>(\s|<br\s*\/?>)*-{3,}(\s|<br\s*\/?>)*<\/p>/gi, "");
  out = out.replace(/(<br\s*\/?>\s*){2,}/gi, "<br />");
  return out.trim();
}
const wordCount = (h) => strip(h).split(" ").filter(Boolean).length;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATA = path.join(ROOT, "src/data");
const CACHE = path.join(DATA, "cache");
const IMG = path.join(ROOT, "src/assets/remote");
const OFFLINE = process.env.OFFLINE === "1";
const UA = "Mozilla/5.0 (compatible; AvtF-site-builder/1.0; +https://www.africavsthefuture.xyz)";
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", cdataPropName: false });

// One retry on network errors/timeouts (feeds occasionally stall).
async function get(url, opts = {}) {
  try { return await get1(url, opts); }
  catch (e) { if (/^4\d\d /.test(e.message)) throw e; await new Promise((r) => setTimeout(r, 2000)); return get1(url, opts); }
}
async function get1(url, { timeout = 12000, type = "text" } = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: ctl.signal });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return type === "json" ? await r.json() : type === "buf" ? Buffer.from(await r.arrayBuffer()) : await r.text();
  } finally { clearTimeout(t); }
}

const decode = (s = "") => String(s)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const strip = (h = "") => decode(String(h).replace(/<figcaption[\s\S]*?<\/figcaption>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const words = (s, n) => { const w = s.split(" "); return w.length > n ? w.slice(0, n).join(" ") + "…" : s; };
const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80).replace(/-$/, "");
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x && typeof x === "object" ? x["#text"] ?? "" : x ?? "");

// Screened image pipeline: only images approved in src/data/image-policy.mjs are
// downloaded; the approved crop is applied, then Astro (covers) or sharp (inline)
// produces AVIF/WebP. Raw downloads are cached so OFFLINE builds still work.
async function rawImage(url) {
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  const rawDir = path.join(IMG, "..", "remote-raw");
  await fs.mkdir(rawDir, { recursive: true });
  const f = path.join(rawDir, hash);
  try { return await fs.readFile(f); } catch {}
  if (OFFLINE) return null;
  try { const buf = await get(url, { type: "buf", timeout: 20000 }); await fs.writeFile(f, buf); return buf; }
  catch (e) { console.warn("  image skipped:", url.slice(0, 80), e.message); return null; }
}
async function cropped(url) {
  const pol = policyFor(url);
  if (!usable(pol)) return null;
  const buf = await rawImage(url);
  if (!buf) return null;
  let im = sharp(buf);
  if (pol.crop) {
    const m = await im.metadata();
    const [l, t, w, h] = pol.crop;
    im = sharp(buf).extract({ left: Math.round(l * m.width), top: Math.round(t * m.height), width: Math.round(w * m.width), height: Math.round(h * m.height) });
  }
  return im;
}
async function saveImage(url, name) {
  if (!url || !name) return null;
  const im = await cropped(url);
  if (!im) return null;
  await fs.mkdir(IMG, { recursive: true });
  const file = `${name}.jpg`;
  await im.jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(IMG, file));
  return file;
}
// Store products: download the real Gumroad cover as-is (no policy screen, no crop),
// capped at 1600px wide; Astro then makes AVIF/WebP at fixed sizes.
async function saveProductCover(url, name) {
  if (!url) return null;
  const buf = await rawImage(url);
  if (!buf) return null;
  await fs.mkdir(IMG, { recursive: true });
  const file = `${name}.jpg`;
  await sharp(buf).flatten({ background: "#0F1923" }).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(IMG, file));
  return file;
}
const pickCover = (slug, urls) => {
  const o = coverOverride[slug];
  return (o && urls.find((u) => u.includes(o))) || urls[0];
};
async function inlineImages(html, slug, coverUrl, title) {
  // Replace screened inline images with optimised local <picture>; drop everything else.
  const coverPol = policyFor(coverUrl || "");
  let n = 0; const out = {};
  const toks = [];
  const handle = async (src, alt) => {
    const pol = policyFor(src);
    if (!usable(pol) || (coverPol && pol.id === coverPol.id)) return "";
    if (toks.some((t) => t.id === pol.id)) return "";
    const im = await cropped(src); if (!im) return "";
    const m = await im.clone().metadata();
    const k = ++n; await fs.mkdir(PUB_IMG, { recursive: true });
    const srcW = pol.crop ? Math.round(m.width * pol.crop[2]) : m.width;
    const srcH = pol.crop ? Math.round(m.height * pol.crop[3]) : m.height;
    const widths = [720, 1280].filter((w) => w <= srcW); if (!widths.length) widths.push(srcW);
    for (const w of widths) {
      await im.clone().resize({ width: w }).avif({ quality: 55 }).toFile(path.join(PUB_IMG, `${slug}-${k}-${w}.avif`));
      await im.clone().resize({ width: w }).webp({ quality: 78 }).toFile(path.join(PUB_IMG, `${slug}-${k}-${w}.webp`));
    }
    const W = widths[widths.length - 1], H = Math.round(srcH * W / srcW);
    const set = (ext) => widths.map((w) => `/essay-img/${slug}-${k}-${w}.${ext} ${w}w`).join(", ");
    const a = (alt || `Illustration from “${title}”`).replace(/"/g, "&quot;");
    toks.push({ id: pol.id, k, html: `<figure class="essay-fig"><picture><source type="image/avif" srcset="${set("avif")}" sizes="(min-width: 1000px) 640px, 100vw"><img src="/essay-img/${slug}-${k}-${W}.webp" srcset="${set("webp")}" sizes="(min-width: 1000px) 640px, 100vw" width="${W}" height="${H}" alt="${a}" loading="lazy" decoding="async"></picture></figure>` });
    return `<p>[[AVTFIMG${k}]]</p>`;
  };
  const re = /<figure[\s\S]*?<\/figure>|<img[^>]*>/gi;
  const parts = []; let last = 0, m;
  while ((m = re.exec(html))) {
    parts.push(html.slice(last, m.index));
    const src = (m[0].match(/<img[^>]+src="([^"]+)"/) || [])[1];
    const alt = (m[0].match(/<img[^>]+alt="([^"]*)"/) || [])[1];
    parts.push(src ? await handle(src.replace(/&amp;/g, "&"), alt) : "");
    last = re.lastIndex;
  }
  parts.push(html.slice(last));
  return { html: parts.join(""), toks };
}
const restoreImages = (body, toks) => toks.reduce((b, t) => b.replace(new RegExp(`<p>\\s*\\[\\[AVTFIMG${t.k}\\]\\]\\s*</p>`), t.html), body);

// ---------- sources ----------
async function medium() {
  const feed = xml.parse(await get(site.feeds.medium));
  const items = arr(feed.rss.channel.item);
  const out = [];
  for (const i of items) {
    const html = i["content:encoded"] || "";
    const link = String(txt(i.link)).split("?")[0];
    const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((u) => !u.includes("/_/stat"));
    const slug = link.split("/").pop().replace(/-[0-9a-f]{10,14}$/, "");
    const img = pickCover(slug, imgs);
    // Medium truncates long titles in the feed ("…"). The full title is the
    // article's first heading, so take it from there (and drop the duplicate heading).
    let title = decode(txt(i.title)).trim();
    const firstH = html.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/);
    const firstHText = firstH ? strip(firstH[1]) : "";
    if (title.endsWith("…") && firstHText.startsWith(title.slice(0, -1).trim())) title = firstHText;
    const htmlNoDup = firstH && firstHText === title ? html.replace(firstH[0], "") : html;
    const inl = await inlineImages(htmlNoDup, slug, img, title);
    out.push({
      platform: "medium", slug, title, url: link,
      author: decode(txt(i["dc:creator"])) || "Africa vs The Future",
      published: new Date(txt(i.pubDate)).toISOString(),
      updated: i["atom:updated"] ? new Date(txt(i["atom:updated"])).toISOString() : null,
      tags: arr(i.category).map((c) => decode(txt(c))),
      excerpt: words(strip(html), 70),
      body: restoreImages(cleanBody(inl.html), inl.toks), words: wordCount(html),
      image: await saveImage(img, `article-${slug}`), imageSrc: img || null,
    });
  }
  return out;
}

async function substack() {
  const feed = xml.parse(await get(site.feeds.substack));
  const out = [];
  for (const i of arr(feed.rss.channel.item)) {
    const link = String(txt(i.link)).split("?")[0];
    const html = i["content:encoded"] || "";
    const sslug = link.split("/p/")[1] || slugify(txt(i.title));
    const imgs = [i.enclosure?.["@_url"], ...[...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, "&"))].filter(Boolean);
    const img = pickCover(sslug, imgs);
    const inl = await inlineImages(html, sslug, img, decode(txt(i.title)).trim());
    const body = strip(html);
    out.push({
      platform: "substack", slug: link.split("/p/")[1] || slugify(txt(i.title)), title: decode(txt(i.title)).trim(), url: link,
      author: decode(txt(i["dc:creator"])) || "Africa vs The Future",
      published: new Date(txt(i.pubDate)).toISOString(), updated: null, tags: [],
      subtitle: decode(txt(i.description)).trim(),
      excerpt: words(body, 70),
      body: restoreImages(cleanBody(inl.html), inl.toks), words: body.split(" ").filter(Boolean).length,
      image: await saveImage(img, `article-${sslug}`), imageSrc: img || null,
    });
  }
  return out;
}

async function youtube() {
  const feed = xml.parse(await get(site.feeds.youtube));
  const out = [];
  for (const e of arr(feed.feed.entry)) {
    const g = e["media:group"] || {};
    const thumb = g["media:thumbnail"]?.["@_url"];
    out.push({
      platform: "youtube", id: e["yt:videoId"], title: decode(txt(e.title)),
      url: arr(e.link)[0]?.["@_href"], published: new Date(e.published).toISOString(),
      excerpt: words(decode(txt(g["media:description"])).replace(/\s+/g, " ").trim(), 40),
      image: await saveImage(thumb), imageSrc: thumb || null,
    });
  }
  return out;
}

// SoundCloud: the public RSS feed lists every public track, so new uploads appear
// automatically. Episode numbers come from the title ("001 …", "… - 001"), unless
// src/data/episode-overrides.mjs sets one for that slug.
async function soundcloud() {
  const feed = xml.parse(await get(site.feeds.soundcloud, { timeout: 20000 }));
  const ch = feed.rss.channel;
  const out = [];
  for (const i of arr(ch.item)) {
    const img = i["itunes:image"]?.["@_href"];
    const slug = String(txt(i.link)).split("/").pop();
    let title = decode(txt(i.title)).replace(/\s+/g, " ").trim();
    const m = title.match(/^(\d{1,3})\b/) || title.match(/-\s*(\d{3})\b/);
    const ov = episodeOverrides[slug] || {};
    const number = ov.number ?? (m ? +m[1] : null);
    if (ov.number != null && m) title = title.replace(m[1], String(ov.number).padStart(3, "0"));
    out.push({
      platform: "soundcloud", slug, number, title,
      url: String(txt(i.link)), published: new Date(txt(i.pubDate)).toISOString(),
      duration: txt(i["itunes:duration"]) || null,
      audio: i.enclosure?.["@_url"] || null,
      excerpt: words(strip(txt(i.description) || txt(i["itunes:summary"])), 60),
      image: await saveImage(img, `episode-${slug}`), imageSrc: img || null,
    });
  }
  out.sort((a, b) => +new Date(b.published) - +new Date(a.published));
  return { show: { title: decode(txt(ch.title)), description: strip(txt(ch.description)), url: txt(ch.link) }, episodes: out };
}

async function bluesky() {
  const actor = site.bluesky.handle;
  const j = await get(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=20&filter=posts_no_replies`, { type: "json" });
  return j.feed
    .filter((f) => !f.reason && f.post.author.handle === actor)
    .slice(0, 6)
    .map((f) => ({
      text: f.post.record.text, created: f.post.record.createdAt,
      url: `https://bsky.app/profile/${actor}/post/${f.post.uri.split("/").pop()}`,
      likes: f.post.likeCount ?? 0, reposts: f.post.repostCount ?? 0, replies: f.post.replyCount ?? 0,
    }));
}

// Gumroad: public storefront + each product page (both embed JSON in data-page).
// No API token needed. Prices come from the product page: plain products use
// price_cents; tiered memberships use their tiers' recurrence prices.
const GUM = () => site.gumroad.store.replace(/\/$/, "");
const pageJson = (html) => JSON.parse(decode(html.match(/data-page="([^"]+)"/)[1]));
const cleanName = (n = "") => n.replace(/\s+/g, " ").replace(/[\\"”]+\s*$/, "").trim();
const paras = (h = "") => (String(h).match(/<p>[\s\S]*?<\/p>/gi) || []).map(strip).filter(Boolean);
async function gumroad() {
  const page = pageJson(await get(site.gumroad.store, { timeout: 20000 }));
  const found = new Map();
  const walk = (o) => {
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === "object") {
      if ("price_cents" in o && o.permalink && o.name) found.set(o.permalink, o);
      Object.values(o).forEach(walk);
    }
  };
  walk(page.props);
  const products = [];
  for (const p of found.values()) {
    const pp = pageJson(await get(`${GUM()}/l/${p.permalink}`, { timeout: 20000 })).props.product || {};
    const currency = (pp.currency_code || p.currency_code || "gbp").toUpperCase();
    let price_cents = pp.price_cents ?? p.price_cents, recurrence = null, tiers = [];
    if (pp.is_tiered_membership || pp.is_recurring_billing) {
      recurrence = pp.recurrences?.default || p.recurrence || "monthly";
      tiers = (pp.options || []).map((o) => ({ name: cleanName(o.name), price_cents: o.recurrence_price_values?.[recurrence]?.price_cents ?? null, pwyw: !!o.is_pwyw }))
        .filter((t) => t.price_cents != null);
      if (tiers.length) price_cents = Math.min(...tiers.map((t) => t.price_cents));
    }
    const covers = pp.covers || [];
    const main = covers.find((c) => c.id === pp.main_cover_id) || covers[0];
    // Product image = the product's own main Gumroad cover (first cover if no main is set,
    // thumbnail as a last resort). Product covers are the seller's real artwork, so the
    // site-design image policy (no maps) does not apply and no crop is made.
    const coverUrl = main?.original_url || main?.url || covers[0]?.original_url || pp.thumbnail_url || p.thumbnail_url || null;
    products.push({
      id: p.id, permalink: p.permalink, name: cleanName(pp.name || p.name),
      price_cents, currency, recurrence, tiers, pwyw: !!(pp.is_pay_what_you_want || p.is_pay_what_you_want),
      url: pp.long_url || `${GUM()}/l/${p.permalink}`,
      thumbnail: pp.thumbnail_url || p.thumbnail_url, coverUrl,
      description: strip(pp.description_html || ""), paragraphs: paras(pp.description_html), summary: pp.summary || "",
      attributes: (pp.attributes || []).map((x) => ({ name: x.name, value: x.value })),
      refund: pp.refund_policy?.title || null,
      native_type: pp.native_type || p.native_type, source: "storefront",
    });
  }
  for (const p of products) {
    const m = p.name.match(/Issue\s+(\d+)/i), e = p.name.match(/Episode\s+(\d+)/i);
    p.kind = /podcast/i.test(p.name) ? "podcast" : p.native_type === "membership" || p.recurrence ? "membership" : m ? "mini-book" : "bundle";
    p.issue = m ? +m[1] : e ? +e[1] : null;
    p.slug = p.kind === "mini-book" ? `issue-${p.issue}` : p.kind === "podcast" ? `episode-${p.issue}` : slugify(p.name.replace(/^Africa vs The Future\s*-\s*/i, "")) || p.permalink;
    p.image = await saveProductCover(p.coverUrl, `product-${p.slug}`);
    p.imageSrc = p.image ? p.coverUrl : null;
    delete p.coverUrl;
  }
  const order = { "mini-book": 0, podcast: 1, membership: 2, bundle: 3 };
  return products.sort((a, b) => order[a.kind] - order[b.kind] || (a.issue ?? 0) - (b.issue ?? 0));
}

// ---------- runner ----------
const sources = { medium, substack, youtube, soundcloud, bluesky, gumroad };
await fs.mkdir(CACHE, { recursive: true }); await fs.mkdir(IMG, { recursive: true });
// With generated covers, remove previously downloaded third-party covers so
// none of them (some contain map imagery) end up in the build output.
if (!site.covers?.remote) for (const f of await fs.readdir(IMG)) await fs.rm(path.join(IMG, f));
const report = {};
for (const [name, fn] of Object.entries(sources)) {
  const cacheFile = path.join(CACHE, `${name}.json`);
  let data, status;
  if (name === "youtube" && !site.features?.youtube) {
    // features.youtube=false: no fetch; ship an empty list and leave the cache untouched.
    await fs.writeFile(path.join(DATA, `${name}.json`), "[]");
    report[name] = "skipped (features.youtube=false)";
    console.log(`[fetch] ${name.padEnd(10)} ${report[name]}`);
    continue;
  }
  try {
    if (OFFLINE) throw new Error("OFFLINE=1");
    data = await fn();
    // YouTube may legitimately have no public videos in its feed: an empty list is real data.
    const empty = name !== "youtube" && (Array.isArray(data) ? data.length === 0 : !data);
    if (empty) throw new Error("empty result");
    await fs.writeFile(cacheFile, JSON.stringify({ fetchedAt: new Date().toISOString(), data }, null, 1));
    status = `live (${Array.isArray(data) ? data.length : (data.episodes?.length ?? "ok")})`;
  } catch (e) {
    try {
      const c = JSON.parse(await fs.readFile(cacheFile, "utf8"));
      data = c.data; status = `CACHE from ${c.fetchedAt} (${e.message})`;
    } catch { data = name === "soundcloud" ? { show: null, episodes: [] } : []; status = `EMPTY (${e.message}; no cache)`; }
  }
  await fs.writeFile(path.join(DATA, `${name}.json`), JSON.stringify(data, null, 1));
  report[name] = status;
  console.log(`[fetch] ${name.padEnd(10)} ${status}`);
}
await fs.writeFile(path.join(DATA, "build-report.json"), JSON.stringify({ builtAt: new Date().toISOString(), report }, null, 1));
