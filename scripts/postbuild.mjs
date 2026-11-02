// After `astro build`: serve /sitemap.xml as an exact copy of the sitemap index
// (Firebase serves dist/ as-is, so this gives /sitemap.xml a 200 with the same content).
import fs from "node:fs/promises";
await fs.copyFile("dist/sitemap-index.xml", "dist/sitemap.xml");
const n = ((await fs.readFile("dist/sitemap-0.xml", "utf8")).match(/<loc>/g) || []).length;
console.log(`[postbuild] dist/sitemap.xml written (copy of sitemap-index.xml); ${n} URLs in sitemap-0.xml`);
