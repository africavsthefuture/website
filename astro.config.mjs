import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.africavsthefuture.xyz",
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "always" },
  compressHTML: true,
  redirects: { "/thought-leaders": "/#subscribe" },
  integrations: [sitemap({ filter: (p) => !p.includes("/404") && !p.includes("thought-leaders") })],
  image: { responsiveStyles: false },
  vite: { plugins: [tailwindcss()] },
  prefetch: { prefetchAll: true },
});
