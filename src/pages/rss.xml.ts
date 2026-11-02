import type { APIRoute } from "astro";
import { site } from "../site.config.mjs";
import { articles, keyPointsFor, describe, lastmodOf } from "../lib/content";
// RSS 2.0 feed of the site's articles (full text), linked from every page's <head>.
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s = "") => `<![CDATA[${String(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
// Inline article images use root-relative URLs; feed readers need absolute ones.
const absolutise = (html = "") => html.replace(/(src|srcset|href)="\//g, `$1="${site.url}/`).replace(/, \/essay-img\//g, `, ${site.url}/essay-img/`);
export const GET: APIRoute = () => {
  const latest = articles.map(lastmodOf).sort().at(-1) ?? new Date().toISOString();
  const items = articles.map((a) => {
    const url = `${site.url}/articles/${a.slug}`;
    const kp = keyPointsFor(a);
    const brief = `<p><strong>In brief:</strong> ${esc(kp.summary)}</p>`;
    return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(a.published).toUTCString()}</pubDate>
      <dc:creator>${esc(a.author || site.name)}</dc:creator>
${a.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
      <description>${esc(describe(a, 300))}</description>
      <content:encoded>${cdata(brief + absolutise(a.body || `<p>${esc(a.excerpt)}</p>`) + `<p>Originally published at <a href="${url}">${esc(site.name)}</a>.</p>`)}</content:encoded>
      <enclosure url="${site.url}/og/articles/${a.slug}.jpg" length="0" type="image/jpeg" />
    </item>`;
  }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(site.name)}: articles</title>
    <link>${site.url}/articles</link>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc(site.supportLine)}</description>
    <language>${site.lang.toLowerCase()}</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <image><url>${site.url}${site.logoPath}</url><title>${esc(site.name)}: articles</title><link>${site.url}/articles</link></image>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
};
