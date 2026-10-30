// SVG drawing primitives for illustrated backgrounds: no outlines, one shade plane + one highlight per form.
export const W = 1920, H = 1080;

export function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const f = (n) => +(+n).toFixed(1);
export const P = (d, fill, op) => `<path d="${d}" fill="${fill}"${op != null ? ` opacity="${op}"` : ""}/>`;
export const R = (x, y, w, h, fill, op, r) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}"${r ? ` rx="${r}"` : ""} fill="${fill}"${op != null ? ` opacity="${op}"` : ""}/>`;
export const C = (cx, cy, r, fill, op) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${op != null ? ` opacity="${op}"` : ""}/>`;
export const E = (cx, cy, rx, ry, fill, op) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${op != null ? ` opacity="${op}"` : ""}/>`;
export const L = (d, c, w, op) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op != null ? ` opacity="${op}"` : ""}/>`;
export const G = (x, y, rot, body, s = 1) => `<g transform="translate(${f(x)} ${f(y)})${rot ? ` rotate(${f(rot)})` : ""}${s !== 1 ? ` scale(${f(s)})` : ""}">${body}</g>`;
export const poly = (pts) => "M" + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L") + " Z";

export const mute = (hex) => {
  const n = parseInt(hex.slice(1), 16), A = [n >> 16, (n >> 8) & 255, n & 255], g = A[0] * 0.3 + A[1] * 0.59 + A[2] * 0.11;
  return "#" + A.map((v) => Math.max(0, Math.min(255, Math.round(v + (g - v) * 0.16 + (236 - v) * 0.05))).toString(16).padStart(2, "0")).join("");
};
export const svg = (body, m = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${m ? body.replace(/(fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"/g, (_, k, c) => `${k}="${mute(c)}"`) : body}</svg>\n`;

let gid = 0;
export const resetIds = (prefix = "") => { gid = 0; idp = prefix; };
let idp = "";
const nid = (k) => `${idp}${k}${gid++}`;

export const glow = (cx, cy, rx, ry, color, op) => {
  const id = nid("g");
  return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${op}"/><stop offset="0.5" stop-color="${color}" stop-opacity="${f(op * 0.45)}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient></defs>${E(cx, cy, rx, ry, `url(#${id})`)}`;
};
export const shadow = (cx, cy, rx, ry, op = 0.3) => glow(cx, cy, rx, ry, "#1a1020", op);
export const lin = (stops, x2 = 0, y2 = 1) => {
  const id = nid("l");
  return [`<defs><linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a == null ? "" : ` stop-opacity="${a}"`}/>`).join("")}</linearGradient></defs>`, `url(#${id})`];
};
export const fillLin = (d, stops, x2 = 0, y2 = 1) => { const [g, u] = lin(stops, x2, y2); return g + P(d, u); };
export const clip = (d, body) => { const id = nid("c"); return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`; };
export const vignette = (op = 0.22) => { const id = nid("v"); return `<defs><radialGradient id="${id}" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="${op}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`; };

export const rrect = (x, y, w, h, r) => `M${f(x + r)} ${f(y)} L${f(x + w - r)} ${f(y)} Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + r)} L${f(x + w)} ${f(y + h - r)} Q${f(x + w)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} L${f(x + r)} ${f(y + h)} Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - r)} L${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Z`;
export const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;

export const blob = (cx, cy, rx, ry, seed, n = 9, amp = 0.22) => {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3, k = 0.86 + r() * 0.2; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const A = pts[i], B = pts[(i + 1) % n], mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, k = 1 + amp * (0.7 + r() * 0.6);
    d += ` Q${f(cx + (mx - cx) * k)} ${f(cy + (my - cy) * k)} ${f(B[0])} ${f(B[1])}`;
  }
  return d + " Z";
};
export const scallopLine = (x0, x1, y, seed, step, amp, bottom = H) => {
  const r = rng(seed);
  let d = `M${x0} ${bottom} L${x0} ${y}`, x = x0;
  while (x < x1) {
    const w = step * (0.6 + r() * 0.8), h = amp * (0.5 + r()), yy = y + (r() - 0.5) * amp * 0.8;
    d += ` Q${f(x + w / 2)} ${f(yy - h)} ${f(x + w)} ${f(yy)}`;
    x += w;
  }
  return d + ` L${f(x)} ${bottom} Z`;
};
// Form = base fill + shade plane on the far side + thin rim highlight on the lit side.
export const form = (d, base, shadeD, light, shadeOp = 0.2, lightD) =>
  P(d, base) + clip(d, (shadeD ? P(shadeD, "#1a1020", shadeOp) : "") + (lightD ? P(lightD, light || "#ffffff", 0.35) : ""));
export const tone = (hex, k) => {
  const n = parseInt(hex.slice(1), 16), A = [n >> 16, (n >> 8) & 255, n & 255], T = k < 0 ? [26, 16, 32] : [255, 255, 255], a = Math.abs(k);
  return "#" + A.map((v, i) => Math.round(v + (T[i] - v) * a).toString(16).padStart(2, "0")).join("");
};
