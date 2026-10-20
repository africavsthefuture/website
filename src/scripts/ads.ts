// Pluggable ad loader. Two exchanges, one adapter each. Only bundled when
// site.ads.enabled is true. Waits for IAB TCF consent (window.__tcfapi) if a
// CMP is present, then lazy-fills each reserved slot as it nears the viewport.
type Exchange = { id: string; adapter: "gpt" | "generic"; publisherId?: string | null; networkCode?: string | null; scriptSrc?: string | null };
type Slot = HTMLElement & { dataset: { adSlot: string; adKind: string; adSizes: string } };
const cfg = (window as any).AVTF_ADS as { exchanges: Exchange[] };

const load = (src: string) => new Promise<void>((res, rej) => { const s = document.createElement("script"); s.async = true; s.src = src; s.onload = () => res(); s.onerror = rej; document.head.appendChild(s); });

const adapters: Record<string, (ex: Exchange, slot: Slot) => Promise<void>> = {
  // Google Publisher Tag (Ad Manager). AdSense would use its own snippet instead.
  async gpt(ex, slot) {
    if (!ex.networkCode) return;
    const w = window as any; w.googletag = w.googletag || { cmd: [] };
    if (!w.__gptLoaded) { w.__gptLoaded = load("https://securepubads.g.doubleclick.net/tag/js/gpt.js"); }
    await w.__gptLoaded;
    w.googletag.cmd.push(() => {
      const box = slot.querySelector(".ad-box")!;
      w.googletag.defineSlot(`/${ex.networkCode}/${slot.dataset.adSlot}`, JSON.parse(slot.dataset.adSizes), box.id).addService(w.googletag.pubads());
      w.googletag.enableServices(); w.googletag.display(box.id);
    });
  },
  // Placeholder for exchange B: load its tag and hand it the slot element.
  async generic(ex, slot) {
    if (!ex.scriptSrc) return;
    await load(ex.scriptSrc);
    slot.dispatchEvent(new CustomEvent("avtf:ad-ready", { detail: { exchange: ex.id }, bubbles: true }));
  },
};

function withConsent(cb: (ok: boolean) => void) {
  const tcf = (window as any).__tcfapi;
  if (typeof tcf !== "function") return cb(false); // no CMP configured → do not request personalised ads
  tcf("addEventListener", 2, (data: any, ok: boolean) => {
    if (ok && (data.eventStatus === "tcloaded" || data.eventStatus === "useractioncomplete")) cb(!!data.purpose?.consents?.[1]);
  });
}

withConsent((consented) => {
  if (!consented) return; // TODO(CMP): decide on non-personalised fallback once exchanges are chosen
  const slots = document.querySelectorAll<Slot>("[data-ad-slot]");
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    const slot = e.target as Slot;
    const ex = cfg.exchanges[[...slots].indexOf(slot) % cfg.exchanges.length]; // simple alternation between the two exchanges
    adapters[ex.adapter]?.(ex, slot).catch(() => {});
  }), { rootMargin: "200px" });
  slots.forEach((s) => io.observe(s));
});
