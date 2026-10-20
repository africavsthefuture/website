import type { APIRoute } from "astro";
import { site } from "../site.config.mjs";
export const GET: APIRoute = () => new Response(site.ads.adsTxt.join("\n") + "\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
