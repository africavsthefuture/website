// Image screening policy (reviewed by eye, 19 Oct 2026; contact sheet at
// /workspace/avtf-design/image-audit.png). Any feed image NOT listed here is
// treated as unscreened and is never shown: covers fall back to the branded
// generated cover, and inline images are dropped. Brand rule: no continent
// maps, globes or Africa clichés.
//
// id: a stable substring of the image URL. crop: [left, top, width, height] as
// fractions of the source image, applied before optimisation.
export const imagePolicy = [
  { id: "1*FJPL_RgzQGeWQcROcLwTIA", verdict: "ok", note: "Value addition: mine-to-factory illustration, no map" },
  { id: "1*1rmvCrSTKiUhznBG-oAaZA", verdict: "ok", note: "Ownership: aerospace manufacturing hall, no map" },
  { id: "1*uAf1uHf1oOFNRaYCL3bv_g", verdict: "reject", note: "AESIFAN: central emblem is an Africa continent outline; side panels too narrow to crop to 16:9" },
  { id: "1*VvIXho96oTr6CED813bBXw", verdict: "ok-crop", crop: [0, 0, 1, 0.94], note: "Goat Herder: crop bottom 6% removes Medium watermark. Flag: rural savanna scene, but it is the article's literal subject" },
  { id: "1*bca1egRWVpyBmHODB9g7dw", verdict: "ok", note: "Translation Lag infographic (Goat Herder inline), no map" },
  { id: "!YscF!", verdict: "ok-crop", crop: [0, 0, 0.645, 1], note: "Copper: keep left 64.5%, removes the Africa-map hologram at top right" },
  { id: "!n6ez!", verdict: "ok-crop", crop: [0, 0, 0.74, 1], note: "Military: keep left 74%, removes the continent emblem on the gate and truck" },
  { id: "!9_Vp!", verdict: "skip", note: "EV: Substack enclosure is the brand Community portrait (used as the site hero), so not repeated as a cover" },
  { id: "!S87B!", verdict: "ok", note: "EV inline 'If language is infrastructure' control centre, no map; used as the EV cover" },
  { id: "!x_dE!", verdict: "ok", note: "Translation Lag infographic (EV inline), no map" },
  { id: "artworks-iN3oLimeUXL5svGb", verdict: "ok", note: "Podcast ep. 001 art: blue circuit mask, no map" },
  { id: "artworks-k7qG8VEw8dIapy5w", verdict: "ok", note: "Podcast ep. 002 Vendors vs Economics: market vs city scene with microphones, no map (screened 19 Nov 2026)" },
  // Gumroad product images (screened 19 Nov 2026).
  { id: "4rkb4ixl56lv1mirlt24tpqtvyyq", verdict: "reject", note: "Issue 1 square thumbnail: two Africa continent maps" },
  { id: "d2w5af62olt8d4c4fo0a5vlql81s", verdict: "reject", note: "Issue 1 main cover: large Africa continent map" },
  { id: "wpl9o86fxcc6jzaq7d5e17yddclj", verdict: "ok", note: "Issue 1 second cover: inside-pages spread, 'Referenced. Short. Actionable.', no map" },
  { id: "zn1m1k03n55nkw2iq682xjv55d2t", verdict: "reject", note: "Podcast Episode 1 cover: gold Africa map behind the title" },
  { id: "9pwqedninb3z8bi17cbcz6l9z85t", verdict: "ok", note: "Podcast Episode 1 thumbnail: Thought Leaders portrait (same art as the site's TL portrait)" },
  { id: "cxi0qliy7ghwina64d6vmulyoqp6", verdict: "ok-crop", crop: [0, 0, 1, 0.95], note: "Thought Leaders Series thumbnail: AI profile head against a city, no continent map; crop removes a white strip at the bottom" },
  { id: "vv37942wbj9r9n2r52qmi1yqubbc", verdict: "reject", note: "Thought Leaders Series wide cover: world-map globe in the centre" },
];
// Article → which screened image is its cover, when the feed's own cover isn't usable.
export const coverOverride = { "china-built-the-worlds-best-evs-then": "!S87B!" };
export const policyFor = (url = "") => imagePolicy.find((p) => url.includes(p.id));
export const usable = (p) => p && (p.verdict === "ok" || p.verdict === "ok-crop");
