// Ping IndexNow (Bing, Yandex, Seznam, Naver…) with every URL in the live sitemap.
// Run after a deploy: npm run indexnow   (DRY=1 to print without sending)
import { site } from "../src/site.config.mjs";
const key = site.indexNowKey;
const host = new URL(site.url).host;
const keyLocation = `${site.url}/${key}.txt`;
const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.text(); };
// Confirm the key file is live first, otherwise IndexNow rejects the submission.
const live = (await get(keyLocation)).trim();
if (live !== key) throw new Error(`Key file at ${keyLocation} does not match the configured key`);
const index = await get(`${site.url}/sitemap-index.xml`);
const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const urlList = [];
for (const m of maps) urlList.push(...[...(await get(m)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]));
console.log(`[indexnow] ${urlList.length} URLs from ${maps.length} sitemap(s)`);
if (process.env.DRY === "1") { console.log(urlList.join("\n")); process.exit(0); }
const r = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
console.log(`[indexnow] api.indexnow.org responded ${r.status} ${r.statusText}`, (await r.text()).slice(0, 300));
if (![200, 202].includes(r.status)) process.exitCode = 1;
