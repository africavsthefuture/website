import type { APIRoute } from "astro";
import { site, liveChannels } from "../site.config.mjs";
import { articles, episodes, fmtDate, platformLabel, keyPointsFor, episodePath, lastmodOf } from "../lib/content";
import { toMarkdown, demote } from "../lib/markdown";
// llms-full.txt: the complete text of every article as clean markdown, for AI answer engines.
export const GET: APIRoute = () => {
  const L: string[] = [];
  L.push(`# ${site.name}: full text of every article`, "", `> ${site.supportLine}`, "",
    `Source: ${site.url}. ${articles.length} articles, newest first. Each article is published in full at its canonical URL on this site and also on Medium or Substack. Short name: ${site.shortName}. Tagline: "${site.tagline}". Index: ${site.url}/llms.txt`, "");
  for (const a of articles) {
    const kp = keyPointsFor(a);
    const url = `${site.url}/articles/${a.slug}`;
    L.push("---", "", `## ${a.title}`, "");
    if (a.subtitle) L.push(`*${a.subtitle}*`, "");
    L.push(`- URL: ${url}`, `- Published: ${fmtDate(a.published)} (${a.published.slice(0, 10)})`,
      ...(lastmodOf(a).slice(0, 10) !== a.published.slice(0, 10) ? [`- Updated: ${lastmodOf(a).slice(0, 10)}`] : []),
      `- Author: ${a.author || site.name}`, `- Also on ${platformLabel(a.platform)}: ${a.url}`,
      ...(a.tags.length ? [`- Tags: ${a.tags.join(", ")}`] : []), "");
    L.push("### In brief", "", kp.summary, "");
    if (kp.points.length) L.push("Key points (quoted from the article):", "", ...kp.points.map((p) => `- ${p}`), "");
    L.push("### Full text", "", demote(toMarkdown(a.body || a.excerpt), 2), "");
  }
  L.push("---", "", "## Podcast episodes", "");
  episodes.forEach((e) => L.push(`- [${e.title}](${site.url}${episodePath(e)}) (${fmtDate(e.published)}${e.duration ? `, ${e.duration}` : ""}): ${e.excerpt}`));
  L.push("", "## Official channels", ...liveChannels().map((c) => `- ${c.label}: ${c.url}`), "");
  return new Response(L.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
};
