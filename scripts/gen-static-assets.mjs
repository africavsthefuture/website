import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { coverSvg, ogSvg } from "../src/lib/cover.mjs";
import { site } from "../src/site.config.mjs";

const community = "src/assets/brand/community.png";
const tl = "src/assets/brand/thought-leaders.png";
await fs.mkdir("public/brand", { recursive: true });
await fs.mkdir("public/og/articles", { recursive: true });
await fs.mkdir("src/assets/covers", { recursive: true });

// Primary mark = Community portrait (NOT the coin/map badge)
await sharp(community).resize(512, 512).png({ compressionLevel: 9 }).toFile("public/brand/logo-512.png");
await sharp(community).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(community).resize(48, 48).png().toFile("public/favicon.png");
await sharp(community).resize(64, 64).png().toFile("public/brand/mark-64.png");
// Favicon SVG: simple teal/gold square referencing brand (raster favicon.png is primary)
await fs.writeFile("public/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0F1923"/><rect x="10" y="22" width="44" height="20" rx="4" fill="#E09D3E" transform="skewX(-8)" transform-origin="32 32"/><text x="32" y="36" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="14" font-weight="900" fill="#0F1923">VS</text></svg>`);
// Thought Leaders mark for tier UI (public copy)
await sharp(tl).resize(256, 256).png().toFile("public/brand/thought-leaders-256.png");

// ── Art-directed brand portraits ────────────────────────────────────────────
// Community portrait: a yellow globe fragment sits top-right (x>78%, y<42%).
// It is masked to ink with a radial gradient so no globe/continent reads.
const INK = "#0F1923";
const globeMask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
  <defs><radialGradient id="g" cx="1010" cy="170" r="360" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${INK}" stop-opacity="1"/><stop offset=".62" stop-color="${INK}" stop-opacity=".96"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></radialGradient></defs>
  <rect width="1000" height="1000" fill="url(#g)"/></svg>`);
await sharp(community).composite([{ input: globeMask }]).jpeg({ quality: 90, mozjpeg: true }).toFile("src/assets/brand/community-hero.jpg");
// Thought Leaders portrait: a world map fills the top-left; keep x 36–100% only.
await sharp(tl).extract({ left: 360, top: 0, width: 640, height: 1000 }).jpeg({ quality: 90, mozjpeg: true }).toFile("src/assets/brand/tl-portrait.jpg");

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const lines = (text, size, maxW, max = 4) => {
  const out = []; let cur = "";
  for (const w of String(text).split(/\s+/)) { const t = cur ? cur + " " + w : w; if (t.length * size * 0.53 > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, "") + "…"; }
  return out;
};

// Default OG: masked Community portrait right, tagline left.
const heroBuf = await sharp("src/assets/brand/community-hero.jpg").resize(700, 630, { fit: "cover", position: "left" }).toBuffer();
const ogDefault = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="l" x1="0" x2="1"><stop offset=".38" stop-color="${INK}"/><stop offset=".62" stop-color="${INK}" stop-opacity=".55"/><stop offset="1" stop-color="${INK}" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#l)"/>
  <text x="72" y="170" font-family="IBM Plex Mono" font-weight="600" font-size="20" letter-spacing="4" fill="#3F8E7C">AFRICA VS THE FUTURE</text>
  <text x="72" y="270" font-family="Outfit" font-weight="900" font-size="66" fill="#F5EFE2">African ownership</text>
  <text x="72" y="345" font-family="Outfit" font-weight="900" font-size="66" fill="#F5EFE2">of narrative <tspan fill="#E09D3E">next</tspan></text>
  <rect x="72" y="400" width="64" height="6" fill="#E09D3E"/>
  <text x="72" y="455" font-family="Inter" font-size="22" fill="#C9CFCC">A critical, progressive look at the often-ignored</text>
  <text x="72" y="487" font-family="Inter" font-size="22" fill="#C9CFCC">challenges facing Africa's future.</text>
</svg>`;
await sharp({ create: { width: 1200, height: 630, channels: 3, background: INK } })
  .composite([{ input: heroBuf, left: 500, top: 0 }, { input: Buffer.from(ogDefault) }])
  .jpeg({ quality: 85, mozjpeg: true }).toFile("public/og/default.jpg");

const read = async (f) => JSON.parse(await fs.readFile(`src/data/${f}.json`, "utf8"));
const articles = [...(await read("medium")), ...(await read("substack"))];
const sc = await read("soundcloud");
const gum = site.features.store ? (await read("gumroad")).filter((p) => site.features.miniBooks || p.kind !== "mini-book") : [];
for (const f of await fs.readdir("src/assets/covers")) if (f.startsWith("product-")) await fs.rm(`src/assets/covers/${f}`);

const jobs = [];
// Branded fallback cover (used only where the essay's own art was rejected):
// generated motif + teal-washed Thought Leaders portrait + topic kicker.
const tlWash = await sharp("src/assets/brand/tl-portrait.jpg").resize(460, 675, { fit: "cover", position: "top" })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="460" height="675"><defs><linearGradient id="w" x1="0" x2="1"><stop offset="0" stop-color="${INK}"/><stop offset=".45" stop-color="#2A7266" stop-opacity=".35"/><stop offset="1" stop-color="#2A7266" stop-opacity=".15"/></linearGradient></defs><rect width="460" height="675" fill="url(#w)"/></svg>`) }]).toBuffer();
const { topicOf } = await import("../src/lib/cover.mjs");
async function fallbackCover(a, text) {
  const bg = await sharp(Buffer.from(coverSvg({ seed: a.slug, text, label: "" }))).png().toBuffer();
  const topic = topicOf(text).label.toUpperCase();
  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
    <rect x="0" y="0" width="1200" height="675" fill="none" stroke="#E09D3E" stroke-opacity=".35" stroke-width="2"/>
    <rect x="56" y="56" width="${topic.length * 14 + 150}" height="40" rx="6" fill="${INK}" fill-opacity=".8" stroke="#3F8E7C"/>
    <text x="76" y="83" font-family="IBM Plex Mono" font-weight="600" font-size="18" letter-spacing="3" fill="#E09D3E">AvtF · ${esc(topic)}</text>
    <rect x="56" y="580" width="56" height="6" fill="#E09D3E"/>
  </svg>`;
  return sharp(bg).composite([{ input: tlWash, left: 740, top: 0 }, { input: Buffer.from(overlay) }]).png({ compressionLevel: 9 }).toFile(`src/assets/covers/article-${a.slug}.png`);
}
async function articleOg(a, text) {
  const coverFile = a.image ? `src/assets/remote/${a.image}` : `src/assets/covers/article-${a.slug}.png`;
  const art = await sharp(coverFile).resize(1200, 630, { fit: "cover", position: "centre" }).modulate({ saturation: 0.9 }).toBuffer();
  const L = lines(a.title, 54, 860, 4);
  const y0 = 630 - 120 - (L.length - 1) * 62;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".25"/><stop offset=".45" stop-color="${INK}" stop-opacity=".72"/><stop offset="1" stop-color="${INK}" stop-opacity=".97"/></linearGradient>
    <linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".7"/><stop offset=".75" stop-color="${INK}" stop-opacity="0"/></linearGradient></defs>
    <rect width="1200" height="630" fill="url(#b)"/><rect width="1200" height="630" fill="url(#s)"/>
    <rect x="0" y="0" width="1200" height="8" fill="#2A7266"/>
    <text x="64" y="${y0 - 66}" font-family="IBM Plex Mono" font-weight="600" font-size="20" letter-spacing="4" fill="#E09D3E">AFRICA VS THE FUTURE · ${esc(topicOf(text).label.toUpperCase())}</text>
    ${L.map((ln, i) => `<text x="64" y="${y0 + i * 62}" font-family="Outfit" font-weight="900" font-size="54" fill="#F5EFE2">${esc(ln)}</text>`).join("")}
    <text x="64" y="590" font-family="IBM Plex Mono" font-size="18" fill="#C9CFCC">africavsthefuture.xyz</text>
  </svg>`;
  return sharp(art).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 84, mozjpeg: true }).toFile(`public/og/articles/${a.slug}.jpg`);
}
for (const a of articles) {
  const text = `${a.title} ${(a.tags || []).join(" ")}`;
  await fallbackCover(a, text);
  jobs.push(articleOg(a, text));
}
for (const [i, e] of (sc.episodes || []).entries())
  jobs.push(sharp(Buffer.from(coverSvg({ seed: e.slug, text: `${e.title} ${e.excerpt}`, W: 1000, H: 1000, label: "Podcast", index: (sc.episodes.length - i) }))).png().toFile(`src/assets/covers/episode-${e.slug}.png`));
for (const p of gum)
  jobs.push(sharp(Buffer.from(coverSvg({ seed: p.slug, text: p.name, W: 1000, H: 1000, label: p.kind === "podcast" ? "Thought Leaders · Podcast" : "Thought Leaders", index: p.issue ?? undefined }))).png().toFile(`src/assets/covers/product-${p.slug}.png`));
jobs.push(sharp(Buffer.from(coverSvg({ seed: "about", text: "strategy", W: 1000, H: 1000, label: "Africa vs The Future" }))).png().toFile("src/assets/covers/about.png"));
await Promise.all(jobs);
console.log(`[assets] community mark, favicons, ${articles.length} article covers + OG, ${sc.episodes?.length ?? 0} episode, ${gum.length} product`);
