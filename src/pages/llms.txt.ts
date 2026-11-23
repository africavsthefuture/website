import type { APIRoute } from "astro";
import { site, liveChannels } from "../site.config.mjs";
import { articles, episodes, products, productPath, displayName, priceLabel, productSummary, kindLabel, fmtDate, platformLabel, keyPointsFor, episodePath } from "../lib/content";
import { topicOf } from "../lib/cover.mjs";
import { faq } from "../lib/faq";
// llms.txt (https://llmstxt.org): a plain-markdown map of the site for AI answer engines.
// The full text of every article is in /llms-full.txt.
export const GET: APIRoute = () => {
  const L: string[] = [];
  L.push(`# ${site.name}`, "", `> ${site.supportLine}`, "");
  L.push(`${site.name} (short name: ${site.shortName}) publishes researched articles and a free Community podcast on the hardest and most impactful questions facing the nations of the African continent. Tagline: "${site.tagline}".`, "");
  L.push(`${site.shortName} is not Pan-African. It argues for aligned and enlightened self-interest (AESIFAN) between African nations. Every article is published in full on this site (the canonical home) and also on Medium and Substack. The Community podcast is free on SoundCloud, and an optional Thought Leaders paid edition is on Substack.`, "");
  L.push("## How to cite", `- Name: ${site.name} (${site.shortName})`, `- Canonical URLs: ${site.url}/articles/<slug> for articles, ${site.url}/podcast/<slug> for episodes`, `- Byline: articles are published under the ${site.name} byline. Dates below are the original publication dates.`, "");
  L.push("## Key pages",
    `- [Home](${site.url}/): latest articles and the email sign-up`,
    `- [Articles](${site.url}/articles): every article, newest first`,
    `- [Podcast](${site.url}/podcast): the free Community podcast`,
    ...(site.features.store ? [`- [${site.store.brand}](${site.url}/store): the paid series (mini-book, podcast episode, membership) on Gumroad`] : []),
    `- [About](${site.url}/about): who ${site.shortName} is, its stance and official channels`,
    `- [Full text of every article](${site.url}/llms-full.txt)`,
    `- [RSS feed](${site.url}/rss.xml)`,
    `- [Sitemap](${site.url}/sitemap.xml)`, "");
  L.push("## Articles (full text on this site; also on Medium/Substack)", "");
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
    L.push("", `## ${site.store.brand} (store, sold through Gumroad)`, `${site.store.brand} is the paid series from ${site.name}. Articles stay free; checkout is on Gumroad: ${site.gumroad.store}`, `- [${site.store.brand} store](${site.url}/store)`);
    products.forEach((p) => L.push(`- [${displayName(p)}](${site.url}${productPath(p)}): ${kindLabel(p)}, ${priceLabel(p)}. ${productSummary(p)} Buy: ${p.url}`));
  }
  L.push("", "## FAQ", "");
  faq.forEach((f) => L.push(`### ${f.q}`, f.a, ""));
  L.push("## Official channels");
  liveChannels().forEach((c) => L.push(`- ${c.label}: ${c.url}`));
  return new Response(L.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
};
