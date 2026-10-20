import type { APIRoute } from "astro";
import { site, liveChannels } from "../site.config.mjs";
import { articles, episodes, products, productPath, displayName, price, fmtDate, platformLabel } from "../lib/content";
import { faq } from "../lib/faq";
// llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI answer engines.
export const GET: APIRoute = () => {
  const L: string[] = [];
  L.push(`# ${site.name}`, "", `> ${site.description}`, "", `Tagline: ${site.tagline}`, "");
  L.push("Africa vs The Future is not Pan-African. It argues for aligned and enlightened self-interest (AESIFAN) between African nations. Short name: AvtF. Every essay is published in full on this site (the canonical home) and also on Medium and Substack. The Community podcast is free on SoundCloud, and an optional Thought Leaders paid edition is on Substack.", "");
  L.push("## Key pages", `- [Home](${site.url}/)`, `- [Articles](${site.url}/articles)`, `- [Podcast](${site.url}/podcast)`, `- [About](${site.url}/about)`, `- [${site.briefing.title} (free guide, ${site.briefing.status === "live" ? "available" : "coming soon"})](${site.url}${site.briefing.path})`, "");
  L.push("## Articles (full text on this site; also on Medium/Substack)");
  articles.forEach((a) => L.push(`- [${a.title}](${site.url}/articles/${a.slug}): ${fmtDate(a.published)}, by ${a.author}. Also on ${platformLabel(a.platform)}: ${a.url}.${a.subtitle ? " " + a.subtitle : ""}`));
  L.push("", "## Podcast");
  episodes.forEach((e) => L.push(`- [${e.title}](${e.url}): SoundCloud, ${fmtDate(e.published)}${e.duration ? `, ${e.duration}` : ""}.`));
  if (site.features.store && products.length) {
    L.push("", "## Store (Gumroad)", `- [Store](${site.url}/store)`);
    products.forEach((p) => L.push(`- [${displayName(p)}](${site.url}${productPath(p)}): ${price(p.price_cents, p.currency)}`));
  }
  L.push("", "## FAQ");
  faq.forEach((f) => L.push(`### ${f.q}`, f.a, ""));
  L.push("## Channels");
  liveChannels().forEach((c) => L.push(`- ${c.label}: ${c.url}`));
  return new Response(L.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
};
