import { site } from "../site.config.mjs";
import { articles } from "./content";
const aesifan = articles.find((a) => /AESIFAN/i.test(a.title));

// Answers paraphrase inputs/01_branding/business_description.md (media-studio) only.
export const faq = [
  { q: "What is Africa vs The Future?", a: "Africa vs The Future is a media and thought-leadership project. It asks, and tries to answer, the hardest and most impactful questions facing the nations of the African continent, with researched essays and podcasts." },
  { q: "Is Africa vs The Future Pan-African?", a: `No. The project believes in the long, ancient diversity of the continent. It argues for “aligned and enlightened self-interest” between African nations (AESIFAN) rather than Pan-Africanism.${aesifan ? ` See the essay “${aesifan.title}”.` : ""}` },
  { q: "Where can I read or listen for free?", a: "Every essay can be read in full, free, on africavsthefuture.xyz; they are also published on Medium and Substack. The free Community podcast is on SoundCloud. Email sign-up on the site is free and delivers new releases." },
  { q: "Who writes Africa vs The Future?", a: "Essays are published under the Africa vs The Future byline on Medium and Substack." },
];
export const faqJsonLd = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};
export { site };
