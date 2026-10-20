import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

function initNav() {
  const t = document.querySelector<HTMLButtonElement>(".nav-toggle");
  const n = document.getElementById("site-nav");
  if (!t || !n) return;
  t.onclick = () => {
    const open = t.getAttribute("aria-expanded") !== "true";
    t.setAttribute("aria-expanded", String(open));
    t.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    n.classList.toggle("open", open);
    document.body.classList.toggle("nav-open", open);
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && n.classList.contains("open")) t.click();
  });
}

function initSticky() {
  const bar = document.querySelector("[data-sticky-sub]");
  const forms = document.querySelectorAll("form[data-subscribe]");
  if (!bar || !forms.length || !("IntersectionObserver" in window)) return;
  const vis = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target)));
    bar.classList.toggle("is-hidden", vis.size > 0);
  });
  forms.forEach((f) => io.observe(f));
}

function initHeroSplit() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const h1 = document.querySelector<HTMLElement>("[data-split-h1]");
  if (!h1 || reduce) return;
  gsap.registerPlugin(SplitText);
  const split = SplitText.create(h1, { type: "words,chars", aria: "auto" });
  gsap.from(split.chars, { opacity: 0, y: 18, stagger: 0.018, duration: 0.45, ease: "power2.out" });
}

// Carry landing-page UTMs into the Substack signup fields so website-originated
// signups keep their source. First landing URL/referrer persist for the session.
function initSignupAttribution() {
  try {
    const here = location.href;
    if (!sessionStorage.getItem("avtf_first_url")) {
      sessionStorage.setItem("avtf_first_url", here);
      sessionStorage.setItem("avtf_first_ref", document.referrer || "");
    }
    const first = sessionStorage.getItem("avtf_first_url") || here;
    const ref = sessionStorage.getItem("avtf_first_ref") || "";
    document.querySelectorAll<HTMLInputElement>("[data-first-url]").forEach((i) => (i.value = first));
    document.querySelectorAll<HTMLInputElement>("[data-first-ref]").forEach((i) => (i.value = ref));
    document.querySelectorAll<HTMLInputElement>("[data-current-url]").forEach((i) => (i.value = here));
  } catch { /* storage blocked: static defaults stay */ }
}

function boot() {
  initSignupAttribution();
  initNav();
  initSticky();
  initHeroSplit();
}

boot();
document.addEventListener("astro:page-load", boot);
