import { site } from "../site.config.mjs";
import { episodes, show, episodePath } from "./content";

export const toIsoDur = (d?: string | null) => {
  if (!d) return undefined;
  const [h, m, s] = d.split(":").map(Number);
  return `PT${h ? h + "H" : ""}${m ? m + "M" : ""}${s ? s + "S" : ""}`;
};
const sc = site.channels.find((c) => c.id === "soundcloud")!;
export const seriesId = `${site.url}/podcast#series`;
export const seriesName = `${site.name} Community Podcast`;

export function episodeLd(e: any, n?: number) {
  const url = `${site.url}${episodePath(e)}`;
  return {
    "@type": "PodcastEpisode", "@id": `${url}#episode`, name: e.title, url, datePublished: e.published,
    description: e.excerpt, ...(n ? { episodeNumber: n } : {}),
    ...(toIsoDur(e.duration) ? { timeRequired: toIsoDur(e.duration) } : {}),
    image: `${site.url}/og/episodes/${e.slug}.jpg`, inLanguage: site.lang, sameAs: [e.url],
    ...(e.audio ? { associatedMedia: { "@type": "AudioObject", contentUrl: e.audio, encodingFormat: "audio/mpeg", ...(toIsoDur(e.duration) ? { duration: toIsoDur(e.duration) } : {}) } } : {}),
    partOfSeries: { "@type": "PodcastSeries", "@id": seriesId, name: seriesName, url: `${site.url}/podcast` },
    publisher: { "@id": `${site.url}/#org` },
  };
}
export function podcastSeriesLd() {
  return {
    "@context": "https://schema.org", "@type": "PodcastSeries", "@id": seriesId, name: seriesName, url: `${site.url}/podcast`,
    webFeed: site.feeds.soundcloud, sameAs: [sc.url], publisher: { "@id": `${site.url}/#org` }, author: { "@id": `${site.url}/#org` },
    inLanguage: site.lang, image: `${site.url}/og/default.jpg`,
    description: `The free Community podcast from ${site.name}. ${site.supportLine}`,
    hasPart: episodes.map((e, i) => ({ "@id": `${site.url}${episodePath(e)}#episode`, "@type": "PodcastEpisode", name: e.title, url: `${site.url}${episodePath(e)}` })),
  };
}
