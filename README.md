# Africa vs The Future — website prototype (local only)

**Design direction:** Intelligence Briefing (Direction A). Tokens in `src/styles/tokens.css` (OKLCH). Brand marks: Community portrait + typographic wordmark. `#FF9D00` retired in favour of art gold `#E09D3E`. No coin/map badge, no continent imagery.

# Africa vs The Future: website prototype (local only)

This is a static Astro 5 site. Every page is pre-rendered HTML. All feed content is fetched at **build time**, and the browser never calls rss2json or allorigins. This prototype has **not** been deployed and is not wired to Firebase or GitHub.

## Build and run
```bash
cd /workspace/avtf-site
npm install
npm run build          # fetch feeds → generate favicons/OG card → astro build → dist/
npm run build:offline  # same, but uses the cached JSON only (no network)
npm run preview        # serves dist/ at http://127.0.0.1:4321
npm run shots          # re-take screenshots (needs preview running)
npm run build:ads      # rebuild public/js/ads.js from src/scripts/ads.ts
```

## How content flows
`scripts/fetch-data.mjs` fetches these sources, each with a 12 s timeout:
- Medium RSS
- Substack RSS
- YouTube channel feed
- SoundCloud RSS
- Bluesky public API
- Gumroad (public storefront, plus each product page)

On success the data is written to `src/data/<source>.json` and to `src/data/cache/<source>.json`. On failure, or with `OFFLINE=1`, the last good cache is used, so a build never ships an empty page. `src/data/build-report.json` records which sources came from the live feed and which from cache.

**Imagery is generated, not downloaded.** The brand moved away from continent/map imagery, so there are no remote cover images by default (`covers.remote: false`; `src/assets/remote/` is purged on each fetch). `scripts/gen-static-assets.mjs` uses `src/lib/cover.mjs` to draw an abstract gold-on-black motif for each piece, keyed to its topic (Copper→contours, Industrial policy→columns, Defence→radar, EVs→waves, AI & language→matrix, Strategy→orbits, everything else→grid). It writes:
- `src/assets/covers/*.png`: article, episode and about covers. Astro emits AVIF with a WebP fallback.
- `public/og/default.jpg` and `public/og/articles/<slug>.jpg`: 1200×630 social cards carrying the real headline.
- `public/brand/*` and `public/favicon.svg`: the VS mark.

The home hero visual (`src/components/SignalField.astro`) is inline SVG with CSS animation. It makes no image request and stops animating under `prefers-reduced-motion`.

## Feature flags (`src/site.config.mjs`)
| Flag | Default | Effect |
|---|---|---|
| `features.store` | `false` | Controls `/store` and product pages, the Store nav link, the Gumroad channel link, the store/Thought-Leaders product sections, Product/Book JSON-LD, and the Gumroad sections of llms.txt and the privacy page. The Gumroad fetch keeps running, so the data stays ready. |
| `features.miniBooks` | `false` | Mini-books stay hidden even when the store is on. |
| `covers.remote` | `false` | `true` uses the downloaded Medium/Substack/SoundCloud artwork instead of the generated covers. |

**Gumroad:** if `GUMROAD_ACCESS_TOKEN` is set, the fetcher switches to the official API (`/v2/products`). That is the same API `media-studio/scripts/gumroad_publisher.py` uses.

## Pages
- `/`
- `/articles` and `/articles/<slug>`: summary pages with excerpts only. The canonical is the original Medium or Substack post, so these pages are excluded from the sitemap.
- `/podcast`
- `/store/...`: only built when `features.store` is `true` (catch-all route `src/pages/store/[...path].astro`)
- `/about`, `/contact`, `/privacy`
- A real `/404`
- `/thought-leaders` redirects to `/#subscribe` (the Substack subscribe section)
- `/robots.txt`, `/llms.txt`, `/ads.txt`, `/sitemap-index.xml`

## Open placeholders (search the code for `TODO(`)
| Tag | Where | What's needed |
|---|---|---|
| `TODO(MASTODON)` | `src/site.config.mjs` | Mastodon profile URL. While it is `null` the link, `rel="me"` and the `sameAs` entry are all hidden. |
| `TODO(ADS)` | `src/site.config.mjs` (`ads`), `src/scripts/ads.ts` | Choose the two exchanges, add their IDs and set `enabled:true`. Replace the placeholder `ads.txt` lines. Set `showPlaceholders:false` to hide the dashed boxes. |
| `TODO(CMP)` | `src/site.config.mjs` (`consent`), `src/scripts/ads.ts` | A Google-certified IAB TCF v2.2 CMP. The ad loader waits for `__tcfapi` consent. |
| `TODO(ANALYTICS)` | `src/site.config.mjs` (`analytics`) | A cookieless analytics provider. Every outbound link already carries UTM tags. |
| `TODO(GUMROAD-COPY)` | `src/lib/content.ts` | Gumroad descriptions are fragments. Only descriptions of 12 or more words are shown. |
| `TODO(VERIFY)` | `src/components/SubscribeForm.astro` | The native form POSTs to `https://africavsfuture.substack.com/api/v1/free?nojs=true` in a new tab. It has never been submitted; test one real sign-up. A direct `/subscribe` link (with UTM) sits under every form. |
| `TODO(CONTACT)` | `src/pages/contact.astro` | No public contact email is known. |
| `TODO(LEGAL)` | `src/pages/privacy.astro` | Draft policy. Needs the data controller's details and a legal review. |

## Hosting note
`firebase.json.example` shows the fix for the live problems: no SPA catch-all, `cleanUrls`, a real 404, long cache headers on `/_astro/*`, and a 301 from `/thought-leaders(.html)` to `/#subscribe`. Separately, the bare domain `africavsthefuture.xyz` still needs adding as a custom domain in Firebase so it gets its own certificate.
