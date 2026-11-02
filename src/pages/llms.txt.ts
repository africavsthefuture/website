import type { APIRoute } from "astro";
import { site, liveChannels } from "../site.config.mjs";
import { articles, episodes, products, productPath, displayName, price, fmtDate, platformLabel, keyPointsFor, episodePath } from "../lib/content";
import { topicOf } from "../lib/cover.mjs";
import { faq } from "../lib/faq";
// llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI answer engines.
// The full text of every essay is in /llms-full.txt.
export const GET: APIRoute = () => {
  const L: string[] = [];
  L.push(`# ${site.name}`, "", `> ${site.supportLine}`, "");
  L.push(`${site.name} (short name: ${site.shortName}) publishes researched essays and a free Community podcast on the hardest and most impactful questions facing the nations of the African continent. Tagline: "${site.tagline}".`, "");
  L.push(`${site.shortName} is not Pan-African. It argues for aligned and enlightened self-interest (AESIFAN) between African nations. Every essay is published in full on this site (the canonical home) and also on Medium and Substack. The Community podcast is free on SoundCloud, and an optional Thought Leaders paid edition is on Substack.`, "");
  L.push("## How to cite", `- Name: ${site.name} (${site.shortName})`, `- Canonical URLs: ${site.url}/articles/<slug> for essays, ${site.url}/podcast/<slug> for episodes`, `- Byline: essays are published under the ${site.name} byline. Dates below are the original publication dates.`, "");
  L.push("## Key pages",
    `- [Home](${site.url}/): latest essays and the email sign-up`,
    `- [Articles](${site.url}/articles): every essay, newest first`,
    `- [Podcast](${site.url}/podcast): the free Community podcast`,
    `- [About](${site.url}/about): who ${site.shortName} is, its stance and official channels`,
    `- [${site.briefing.title}](${site.url}${site.briefing.path}): free guide, ${site.briefing.status === "live" ? "available to subscribers" : "coming soon"}`,
    `- [Full text of every essay](${site.url}/llms-full.txt)`,
    `- [RSS feed](${site.url}/rss.xml)`,
    `- [Sitemap](${site.url}/sitemap.xml)`, "");
  L.push("## Essays (full text on this site; also on Medium/Substack)", "");
  articles.forEach((a) => {
    const kp = keyPointsFor(a);
    L.push(`### [${a.title}](${site.url}/articles/${a.slug})`,
      `Published ${fmtDate(a.published)} · ${topicOf(`${a.title} ${a.tags.join(" ")}`).label} · by ${a.author} · also on ${platformLabel(a.platform)}: ${a.url}`,
      ...(a.subtitle ? [`Subtitle: ${a.subtitle}`] : []),
      `In brief: ${kp.summary}`, "");
  });
  L.push("## Podcast episodes", "");
  episodes.forEach((e) => L.push(`- [${e.title}](${site.url}${episodePath(e)}): ${fmtDate(e.published)}${e.duration ? `, ${e.duration}` : ""}. ${e.excerpt} Audio: ${e.url}`));
  if (site.features.store && products.length) {
    L.push("", "## Store (Gumroad)", `- [Store](${site.url}/store)`);
    products.forEach((p) => L.push(`- [${displayName(p)}](${site.url}${productPath(p)}): ${price(p.price_cents, p.currency)}`));
  }
  L.push("", "## FAQ", "");
  faq.forEach((f) => L.push(`### ${f.q}`, f.a, ""));
  L.push("## Official channels");
  liveChannels().forEach((c) => L.push(`- ${c.label}: ${c.url}`));
  return new Response(L.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
};
