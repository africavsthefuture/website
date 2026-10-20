// ─────────────────────────────────────────────────────────────────────────────
// Africa vs The Future: single source of truth for site-wide settings.
// All channel URLs below were taken from the live site footer (Oct 2026).
// ─────────────────────────────────────────────────────────────────────────────
export const site = {
  name: "Africa vs The Future",
  shortName: "AvtF",
  url: "https://www.africavsthefuture.xyz",
  tagline: "African ownership of narrative next",
  // Meta/OG description from the Marketing brief (minus the "Home:" suffix, which is for off-site bios).
  description:
    "A critical, progressive look at the often-ignored challenges facing Africa's future, and the alternative view.",
  // Positioning lines supplied by the user (verbatim).
  supportLine: "Taking a critical and progressive look at the underlying challenges facing the African future.",
  welcome: "Welcome to Africa vs The Future. Our goal is to help inspire traction and real world action in dealing with the often ignored underlying challenges facing Africa in the 21st century.",
  signupNote: "Free essays and podcast episodes. Unsubscribe anytime.",

  // Lead magnet. status "coming-soon" until the guide is published; then set "live"
  // (and add deliveryUrl) and the hero/offer copy switches to "Get the free Briefing".
  briefing: {
    title: "The Hidden Architecture Briefing",
    subtitle: "5 often-ignored challenges facing Africa's future, and the alternative view",
    status: "coming-soon",
    path: "/briefing",
  },
  locale: "en_GB",
  lang: "en-GB",
  logoPath: "/brand/logo-512.png", // Community portrait mark

  // ── Feature flags ─────────────────────────────────────────────────────────
  // store: renders /store, product pages, the Store nav link, Gumroad channel
  //        link and store sections. The Gumroad fetch keeps running so the data
  //        is ready when this is switched back on.
  // miniBooks: mini-books are not ready, so they stay hidden even when the store is on.
  features: { store: false, miniBooks: false },

  // Covers: true = use each essay's own feed artwork where it passed screening
  // (src/data/image-policy.mjs, with crops applied). Rejected/unscreened images
  // fall back to the branded generated cover.
  covers: { remote: true },

  substack: {
    home: "https://africavsfuture.substack.com/",
    subscribe: "https://africavsfuture.substack.com/subscribe",
    // Substack's public free-signup endpoint used by its own embed form.
    // The native <form> posts here and opens in a new tab: no JS or iframe needed.
    formAction: "https://africavsfuture.substack.com/api/v1/free?nojs=true",
  },
  medium: { profile: "https://medium.com/@africavsfuture" },
  bluesky: { handle: "africavsthefuture.bsky.social" },
  gumroad: { store: "https://africavsthefuture.gumroad.com/" },

  feeds: {
    medium: "https://medium.com/feed/@africavsfuture",
    substack: "https://africavsfuture.substack.com/feed",
    youtube: "https://www.youtube.com/feeds/videos.xml?channel_id=UCZjupHs3lxk4RRnsL-XiGhQ",
    soundcloud: "https://feeds.soundcloud.com/users/soundcloud:users:1693113218/sounds.rss",
  },

  // Channel list. Order sets the order in the footer and channel grid.
  // `url: null` hides the channel everywhere (no broken links).
  channels: [
    { id: "substack", label: "Substack", url: "https://africavsfuture.substack.com/", tier: "community", verb: "Subscribe free" },
    { id: "medium", label: "Medium", url: "https://medium.com/@africavsfuture", tier: "community", verb: "Follow" },
    { id: "soundcloud", label: "SoundCloud", url: "https://soundcloud.com/africa-vs-the-future-podcast", tier: "community", verb: "Listen" },
    { id: "youtube", label: "YouTube", url: "https://www.youtube.com/@africavsthefuture", tier: "social", verb: "Watch" },
    { id: "bluesky", label: "Bluesky", url: "https://bsky.app/profile/africavsthefuture.bsky.social", tier: "social", verb: "Follow" },
    // Mastodon profile (set 19 Oct 2026). Link uses rel="me" for verification;
    // user must also add https://www.africavsthefuture.xyz as a profile website field.
    { id: "mastodon", label: "Mastodon", url: "https://mastodon.social/@africavsthefuture", tier: "social", verb: "Follow", rel: "me" },
    { id: "x", label: "X", url: "https://x.com/AfricaVTFuture", tier: "social", verb: "Follow" },
    { id: "instagram", label: "Instagram", url: "https://www.instagram.com/africavsthefuture/", tier: "social", verb: "Follow" },
    { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/@africavsfuture", tier: "social", verb: "Follow" },
    { id: "gumroad", label: "Gumroad", url: "https://africavsthefuture.gumroad.com/", tier: "thought-leaders", verb: "Shop", requires: "store" },
  ],

  // ── Analytics (privacy-friendly; off until set) ──────────────────────────
  // TODO(ANALYTICS): pick a cookieless tool and fill in, e.g.
  //   { provider: "plausible", domain: "africavsthefuture.xyz", src: "https://plausible.io/js/script.outbound-links.js" }
  analytics: { provider: null, domain: null, src: null },

  // ── UTM defaults applied to every outbound channel / CTA link ────────────
  utm: { source: "avtf_site", medium: "referral" },

  // ── Ads: two exchanges, pluggable (see src/ads/adapters.js) ──────────────
  // TODO(ADS): the exchanges are not chosen yet. Set enabled:true and fill
  // ids once approved. ads.txt is generated from `adsTxt` below.
  ads: {
    enabled: false,
    // Prototype only: draw the empty reserved boxes so the layout can be reviewed. Set false to hide until enabled.
    showPlaceholders: true,
    exchanges: [
      { id: "exchangeA", adapter: "gpt", label: "Google Ad Manager / AdSense (placeholder)", publisherId: null, networkCode: null },
      { id: "exchangeB", adapter: "generic", label: "Second exchange (placeholder)", publisherId: null, scriptSrc: null },
    ],
    // Lines copied verbatim into /ads.txt. Placeholders until the exchanges approve the site.
    adsTxt: [
      "# ads.txt for www.africavsthefuture.xyz",
      "# TODO(ADS): replace the placeholder lines below with the exact lines each exchange provides.",
      "# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0",
      "# <second-exchange-domain>, <publisher-account-id>, DIRECT, <certification-authority-id>",
    ],
  },

  // ── Consent (IAB TCF v2.2 hook; placeholder CMP) ─────────────────────────
  // TODO(CMP): plug in a Google-certified, TCF v2.2 CMP before enabling ads for UK/EEA.
  consent: { cmp: null },
};

// Append UTM params to an outbound URL.
export function utm(url, campaign = "site", content) {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set("utm_source", site.utm.source);
  u.searchParams.set("utm_medium", site.utm.medium);
  u.searchParams.set("utm_campaign", campaign);
  if (content) u.searchParams.set("utm_content", content);
  return u.toString();
}

export const liveChannels = () => site.channels.filter((c) => c.url && (!c.requires || site.features[c.requires]));
