// Per-episode corrections applied by scripts/fetch-data.mjs (keyed by SoundCloud slug).
// number: the episode number shown on the site; also rewrites the leading number in the title.
export const episodeOverrides = {
  // User rule (19 Nov 2026): Vendors vs Economics (released 12 Nov 2026) is episode 002,
  // whatever number its SoundCloud title carries.
  "vendors-vs-economics": { number: 2 },
};
