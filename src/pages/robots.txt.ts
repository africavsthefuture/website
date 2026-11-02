import type { APIRoute } from "astro";
import { site } from "../site.config.mjs";
// Search engines and AI answer engines are explicitly welcome.
const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "xAI-Bot", "Bingbot", "CCBot", "meta-externalagent", "DuckAssistBot", "MistralAI-User"];
export const GET: APIRoute = () => new Response(
  [
    "# robots.txt for Africa vs The Future",
    "User-agent: *", "Allow: /", "",
    "# AI answer engines: allowed",
    ...aiBots.flatMap((b) => [`User-agent: ${b}`, "Allow: /", ""]),
    "# Plain-text guides for AI answer engines:",
    `# ${site.url}/llms.txt`,
    `# ${site.url}/llms-full.txt`, "",
    `Sitemap: ${site.url}/sitemap.xml`,
    `Sitemap: ${site.url}/sitemap-index.xml`, "",
  ].join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
