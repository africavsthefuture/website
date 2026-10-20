// Direction A HUD covers: teal ground + art gold. No maps/continents.
export const TOPICS = [
  [/copper/i, "Copper", "contour"],
  [/beneficiation|value addition|resource|mineral/i, "Industrial policy", "columns"],
  [/military|defen[cs]e|security/i, "Defence", "radar"],
  [/\bEVs?\b|electric vehicle/i, "EVs", "waves"],
  [/algorithm|\bAI\b|english|language|lingua/i, "AI & language", "matrix"],
  [/AESIFAN|self-interest|realism|strategy/i, "Strategy", "orbits"],
];
export function topicOf(text = "") {
  for (const [re, label, motif] of TOPICS) if (re.test(text)) return { label, motif };
  return { label: "Signal", motif: "grid" };
}
function rng(seedStr) {
  let h = 2166136261;
  for (const c of String(seedStr)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
const G = "#E09D3E", C = "#A8B0AE", T = "#2A7266", BG = "#0F1923", P = "#F5EFE2";
const f = (n) => Math.round(n * 10) / 10;
function motif(kind, W, H, r) {
  const o = [];
  if (kind === "contour") {
    for (let i = 0; i < 16; i++) {
      const y0 = H * 0.15 + i * (H * 0.05), amp = 20 + r() * 60, ph = r() * 6.28, fr = 1.5 + r() * 2;
      let d = `M0 ${f(y0)}`;
      for (let x = 0; x <= W; x += W / 40) d += ` L${f(x)} ${f(y0 + Math.sin(x / W * 6.28 * fr + ph) * amp * Math.sin(x / W * 3.14))}`;
      o.push(`<path d="${d}" fill="none" stroke="${i % 5 === 0 ? G : T}" stroke-opacity="${i % 5 === 0 ? 0.95 : 0.35}" stroke-width="${i % 5 === 0 ? 2.5 : 1.2}"/>`);
    }
  } else if (kind === "columns") {
    const n = 28, bw = W / n;
    for (let i = 0; i < n; i++) {
      const h = H * (0.12 + r() * 0.62) * (0.4 + i / n);
      o.push(`<rect x="${f(i * bw + bw * 0.2)}" y="${f(H - h)}" width="${f(bw * 0.6)}" height="${f(h)}" fill="${i === n - 4 ? G : T}" fill-opacity="${i === n - 4 ? 0.95 : 0.2 + r() * 0.25}"/>`);
    }
    o.push(`<line x1="0" y1="${f(H * 0.32)}" x2="${W}" y2="${f(H * 0.32)}" stroke="${G}" stroke-dasharray="6 10" stroke-opacity=".7"/>`);
  } else if (kind === "radar") {
    const cx = W * 0.68, cy = H * 0.55, R = Math.min(W, H) * 0.62;
    for (let i = 1; i <= 6; i++) o.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * i / 6)}" fill="none" stroke="${T}" stroke-opacity="${0.25 + i * 0.05}"/>`);
    o.push(`<path d="M${f(cx)} ${f(cy)} L${f(cx + R)} ${f(cy)} A${f(R)} ${f(R)} 0 0 0 ${f(cx + R * Math.cos(-0.7))} ${f(cy + R * Math.sin(-0.7))} Z" fill="${G}" fill-opacity=".18"/>`);
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = R * (0.2 + r() * 0.75); o.push(`<rect x="${f(cx + Math.cos(a) * d - 5)}" y="${f(cy + Math.sin(a) * d - 5)}" width="10" height="10" fill="${i < 2 ? G : C}" fill-opacity="${i < 2 ? 1 : 0.5}" transform="rotate(45 ${f(cx + Math.cos(a) * d)} ${f(cy + Math.sin(a) * d)})"/>`); }
  } else if (kind === "waves") {
    for (let i = 0; i < 22; i++) {
      const y0 = H * 0.2 + i * H * 0.03, ph = i * 0.25;
      let d = `M0 ${f(y0)}`;
      for (let x = 0; x <= W; x += W / 60) { const s = Math.sin(x / W * 9 + ph); d += ` L${f(x)} ${f(y0 + (s > 0.6 ? 40 : s < -0.6 ? -40 : 0) * (0.3 + i / 30))}`; }
      o.push(`<path d="${d}" fill="none" stroke="${i === 11 ? G : T}" stroke-opacity="${i === 11 ? 1 : 0.28}" stroke-width="${i === 11 ? 3 : 1.4}" stroke-linejoin="round"/>`);
    }
  } else if (kind === "matrix") {
    const s = 34;
    for (let y = s; y < H; y += s) for (let x = s; x < W; x += s) {
      const v = r();
      if (v > 0.965) o.push(`<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="${G}"/>`);
      else o.push(`<circle cx="${x}" cy="${y}" r="${v > 0.8 ? 2.6 : 1.4}" fill="${T}" fill-opacity="${v > 0.8 ? 0.6 : 0.25}"/>`);
    }
    let d = `M0 ${f(H * 0.62)}`; for (let x = 0; x <= W; x += s) d += ` L${x} ${f(H * 0.62 + (r() - 0.5) * H * 0.3)}`;
    o.push(`<path d="${d}" fill="none" stroke="${G}" stroke-width="2.5"/>`);
  } else if (kind === "orbits") {
    const cx = W * 0.62, cy = H * 0.5;
    for (let i = 0; i < 7; i++) {
      const rx = W * (0.12 + i * 0.07), ry = H * (0.08 + i * 0.05), rot = -18 + r() * 10;
      o.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${i === 3 ? G : T}" stroke-opacity="${i === 3 ? 0.95 : 0.3}" stroke-width="${i === 3 ? 2.5 : 1.2}" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>`);
      const a = r() * 6.28; o.push(`<circle cx="${f(cx + Math.cos(a) * rx)}" cy="${f(cy + Math.sin(a) * ry)}" r="${i === 3 ? 9 : 4}" fill="${i === 3 ? G : C}" fill-opacity="${i === 3 ? 1 : 0.6}" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>`);
    }
  } else {
    for (let x = 0; x <= W; x += 50) o.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${T}" stroke-opacity=".18"/>`);
    for (let y = 0; y <= H; y += 50) o.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${T}" stroke-opacity=".18"/>`);
    for (let i = 0; i < 6; i++) o.push(`<rect x="${Math.floor(r() * W / 50) * 50}" y="${Math.floor(r() * H / 50) * 50}" width="50" height="50" fill="${G}" fill-opacity="${0.2 + r() * 0.5}"/>`);
  }
  return o.join("");
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function coverSvg({ seed, text = "", W = 1200, H = 675, label = "", index, title }) {
  const { label: lab0, motif: kind } = topicOf(text);
  const lab = label === "" ? "" : (label || lab0);
  const r = rng(seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#g)" opacity=".55"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${T}" stop-opacity=".35"/><stop offset="100%" stop-color="${BG}" stop-opacity="0"/></linearGradient></defs>
  ${motif(kind, W, H, r)}
  ${lab ? `<text x="${W * 0.05}" y="${H * 0.12}" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="${H * 0.042}" letter-spacing="${H * 0.008}" fill="${G}">${esc(String(lab).toUpperCase())}</text>` : ""}
  ${index != null ? `<text x="${W * 0.05}" y="${H * 0.92}" font-family="IBM Plex Mono, monospace" font-size="${H * 0.06}" fill="${P}" fill-opacity=".5">#${esc(String(index).padStart(2,"0"))}</text>` : ""}
  ${title ? `<text x="${W * 0.05}" y="${H * 0.88}" font-family="Outfit, sans-serif" font-weight="800" font-size="${Math.min(H * 0.08, 42)}" fill="${P}">${esc(title)}</text>` : ""}
</svg>`;
}

export function ogSvg({ seed, text = "", headline = "African ownership of narrative next", kicker = "Africa vs The Future" }) {
  const W = 1200, H = 630, r = rng(seed);
  const { motif: kind } = topicOf(text || headline);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g opacity=".55">${motif(kind, W, H, r)}</g>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#og)" />
  <defs><linearGradient id="og" x1="0" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="${BG}" stop-opacity=".15"/><stop offset="100%" stop-color="${BG}" stop-opacity=".92"/></linearGradient></defs>
  <text x="64" y="90" font-family="IBM Plex Mono, monospace" font-size="18" letter-spacing="3" fill="${T}">${esc(kicker.toUpperCase())}</text>
  ${ogLines(headline, 64, 200, 52, 1040).map((ln, i) => `<text x="64" y="${200 + i * 62}" font-family="Outfit, sans-serif" font-weight="900" font-size="52" fill="${i === 1 ? G : P}">${esc(ln)}</text>`).join("")}
  <rect x="64" y="540" width="48" height="6" fill="${G}"/>
  <text x="128" y="548" font-family="IBM Plex Mono, monospace" font-size="16" fill="${C}" dominant-baseline="middle">AFRICA VS THE FUTURE</text>
</svg>`;
}
function ogLines(text, _x, _y, size, maxW) {
  const words = String(text).split(/\s+/);
  const lines = []; let cur = "";
  const approx = (s) => s.length * size * 0.52;
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (approx(t) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export function markSvg(size = 512) {
  // Typographic VS pill only — Community portrait is used as the real mark elsewhere.
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${s*0.12}" fill="${BG}"/>
  <rect x="${s*0.18}" y="${s*0.32}" width="${s*0.64}" height="${s*0.36}" rx="${s*0.06}" fill="${G}" transform="skewX(-8)" transform-origin="${s/2} ${s/2}"/>
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Outfit, sans-serif" font-weight="900" font-size="${s*0.28}" fill="${BG}">VS</text>
</svg>`;
}
