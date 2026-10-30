// Illustrated props for background presets. Every prop: sculpted path, shade plane, highlight, contact shadow.
import { H, W, rng, f, P, R, C, E, L, G, poly, glow, shadow, lin, fillLin, clip, rrect, ell, blob, scallopLine, form } from "./kit.mjs";

const SH = "#1a1020";

/* ---------- sky ---------- */
export const stars = (seed, x0, y0, x1, y1, n) => {
  const r = rng(seed); let s = "";
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), k = r();
    if (k > 0.92) s += glow(x, y, 16, 16, "#fff6d0", 0.35) + P(`M${f(x)} ${f(y - 8)} Q${f(x + 1)} ${f(y - 1)} ${f(x + 8)} ${f(y)} Q${f(x + 1)} ${f(y + 1)} ${f(x)} ${f(y + 8)} Q${f(x - 1)} ${f(y + 1)} ${f(x - 8)} ${f(y)} Q${f(x - 1)} ${f(y - 1)} ${f(x)} ${f(y - 8)} Z`, "#fff6d0", 0.95);
    else s += C(x, y, 1.4 + r() * 2, "#fff6d0", 0.35 + r() * 0.5);
  }
  return s;
};
export const moon = (cx, cy, r) =>
  glow(cx, cy, r * 5, r * 5, "#fff3c4", 0.14) + glow(cx, cy, r * 2.2, r * 2.2, "#fff3c4", 0.24) + C(cx, cy, r, "#fff3c4") +
  clip(ell(cx, cy, r, r),
    P(`M${cx + r * 0.2} ${cy - r * 1.1} C${cx + r} ${cy - r * 0.6} ${cx + r} ${cy + r * 0.7} ${cx + r * 0.1} ${cy + r * 1.1} L${cx + r * 1.4} ${cy + r * 1.4} L${cx + r * 1.4} ${cy - r * 1.4} Z`, "#e8d7a0", 0.6) +
    P(blob(cx - r * 0.3, cy - r * 0.2, r * 0.22, r * 0.18, 3, 7, 0.15), "#ead9a0") + P(blob(cx + r * 0.35, cy + r * 0.38, r * 0.15, r * 0.12, 4, 7, 0.15), "#ead9a0") +
    P(blob(cx + r * 0.25, cy - r * 0.45, r * 0.1, r * 0.08, 5, 6, 0.15), "#ead9a0") + P(blob(cx - r * 0.4, cy + r * 0.45, r * 0.08, r * 0.07, 6, 6, 0.15), "#ead9a0") +
    P(`M${cx - r * 0.7} ${cy - r * 0.3} C${cx - r * 0.6} ${cy - r * 0.7} ${cx - r * 0.3} ${cy - r * 0.85} ${cx} ${cy - r * 0.88} C${cx - r * 0.35} ${cy - r * 0.7} ${cx - r * 0.55} ${cy - r * 0.5} ${cx - r * 0.7} ${cy - r * 0.3} Z`, "#fffbe6", 0.8));
export const cloud = (cx, cy, w, seed, c, op = 1, lit = "#ffffff") => {
  const r = rng(seed), n = 4 + Math.floor(r() * 2);
  let d = `M${f(cx - w / 2)} ${f(cy)}`;
  const bumps = [];
  for (let i = 0; i < n; i++) { const t = (i + 1) / (n + 1); bumps.push([cx - w / 2 + w * t, cy - w * (0.08 + Math.sin(t * Math.PI) * 0.14 * (0.7 + r() * 0.6))]); }
  let px = cx - w / 2;
  for (const [bx, by] of bumps) { const nx = bx + w / (n + 1) / 2; d += ` C${f(px)} ${f(by)} ${f(nx)} ${f(by)} ${f(nx)} ${f(cy - w * 0.02)}`; px = nx; }
  d += ` C${f(cx + w / 2 + w * 0.04)} ${f(cy - w * 0.04)} ${f(cx + w / 2 + w * 0.02)} ${f(cy + w * 0.03)} ${f(cx + w / 2 - w * 0.04)} ${f(cy + w * 0.03)} L${f(cx - w / 2 + w * 0.04)} ${f(cy + w * 0.03)} C${f(cx - w / 2 - w * 0.02)} ${f(cy + w * 0.03)} ${f(cx - w / 2 - w * 0.02)} ${f(cy)} ${f(cx - w / 2)} ${f(cy)} Z`;
  return `<g opacity="${op}">` + P(d, c) + clip(d, P(`M${f(cx - w)} ${f(cy - w * 0.005)} L${f(cx + w)} ${f(cy - w * 0.005)} L${f(cx + w)} ${f(cy + w)} L${f(cx - w)} ${f(cy + w)} Z`, SH, 0.18) + G(-w * 0.03, w * 0.025, 0, P(d, lit, 0.0)) + G(0, w * 0.02, 0, P(d, SH, 0)) + P(d, lit, 0) +
    bumps.map(([bx, by]) => E(bx - w * 0.03, by + w * 0.035, w * 0.06, w * 0.02, lit, 0.22)).join("")) + `</g>`;
};

/* ---------- plants ---------- */
export const leaf = (x, y, len, wid, rot, c, cs, vein) => {
  const d = `M0 0 C${f(wid * 0.7)} ${f(-len * 0.2)} ${f(wid * 0.6)} ${f(-len * 0.75)} 0 ${f(-len)} C${f(-wid * 0.6)} ${f(-len * 0.75)} ${f(-wid * 0.7)} ${f(-len * 0.2)} 0 0 Z`;
  const half = `M0 0 C${f(wid * 0.7)} ${f(-len * 0.2)} ${f(wid * 0.6)} ${f(-len * 0.75)} 0 ${f(-len)} Q${f(wid * 0.08)} ${f(-len * 0.5)} 0 0 Z`;
  return G(x, y, rot, P(d, c) + P(half, cs) + (vein ? L(`M0 ${f(-len * 0.08)} Q${f(wid * 0.06)} ${f(-len * 0.5)} 0 ${f(-len * 0.9)}`, vein, Math.max(1.5, wid * 0.06), 0.5) : ""));
};
export const pot = (x, base, w, h, c = "#d9763a", rim = "#e8915a") => {
  const t = base - h;
  const body = `M${f(x - w * 0.46)} ${f(t + h * 0.16)} L${f(x + w * 0.46)} ${f(t + h * 0.16)} L${f(x + w * 0.36)} ${f(base - h * 0.06)} Q${f(x + w * 0.34)} ${f(base)} ${f(x + w * 0.26)} ${f(base)} L${f(x - w * 0.26)} ${f(base)} Q${f(x - w * 0.34)} ${f(base)} ${f(x - w * 0.36)} ${f(base - h * 0.06)} Z`;
  return shadow(x, base, w * 0.7, h * 0.12, 0.35) + form(body, c, `M${f(x + w * 0.12)} ${f(t)} L${f(x + w)} ${f(t)} L${f(x + w)} ${f(base)} L${f(x + w * 0.04)} ${f(base)} Z`, null, 0.22, `M${f(x - w * 0.4)} ${f(t)} L${f(x - w * 0.3)} ${f(t)} L${f(x - w * 0.22)} ${f(base)} L${f(x - w * 0.32)} ${f(base)} Z`) +
    P(rrect(x - w / 2, t, w, h * 0.2, Math.min(8, h * 0.08)), rim) + R(x - w / 2 + 4, t + 3, w * 0.5, 4, "#ffffff", 0.3, 2) + R(x - w / 2, t + h * 0.17, w, h * 0.04, SH, 0.18);
};
export const plant = (x, base, s, seed, kind = "leafy", potC = "#d9763a", potRim = "#e8915a") => {
  const r = rng(seed), ph = 90 * s, pw = 100 * s, top = base - ph;
  let leaves = "";
  const n = kind === "tall" ? 9 : 11;
  const order = [...Array(n).keys()].sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));
  for (const i of order) {
    const t = i / (n - 1) - 0.5, rot = t * (kind === "tall" ? 70 : 120) + (r() - 0.5) * 12;
    const len = (kind === "tall" ? 220 : 150) * s * (1 - Math.abs(t) * 0.5) * (0.85 + r() * 0.3), wid = (kind === "tall" ? 46 : 70) * s * (0.85 + r() * 0.3);
    const shade = Math.abs(t) > 0.3 ? ["#2f6e4a", "#245a3c"] : ["#4f9b5a", "#3a7f4a"];
    leaves += leaf(x + t * pw * 0.3, top + 8 * s, len, wid, rot, shade[0], shade[1], "#7cc07a");
  }
  return leaves + pot(x, base, pw, ph, potC, potRim) + E(x, top + 6 * s, pw * 0.4, 7 * s, "#4a3226");
};
export const tree = (x, base, s, seed, cDark, cMid, cLight, trunk = "#2a2638") => {
  const r = rng(seed);
  let b = shadow(x, base + 4, 120 * s, 16 * s, 0.35);
  b += form(`M${x - 13 * s} ${base} C${x - 8 * s} ${base - 60 * s} ${x - 10 * s} ${base - 110 * s} ${x - 4 * s} ${base - 160 * s} L${x + 6 * s} ${base - 160 * s} C${x + 9 * s} ${base - 110 * s} ${x + 9 * s} ${base - 60 * s} ${x + 15 * s} ${base} Z`, trunk, `M${x + 2 * s} ${base - 200 * s} L${x + 40 * s} ${base - 200 * s} L${x + 40 * s} ${base} L${x + 4 * s} ${base} Z`, null, 0.25);
  b += L(`M${x} ${base - 120 * s} Q${x + 20 * s} ${base - 150 * s} ${x + 40 * s} ${base - 170 * s} M${x - 2 * s} ${base - 140 * s} Q${x - 24 * s} ${base - 160 * s} ${x - 44 * s} ${base - 180 * s}`, trunk, 7 * s);
  const cy = base - 215 * s;
  b += P(blob(x + 8 * s, cy + 6 * s, 116 * s, 98 * s, seed, 11, 0.32), cDark);
  b += P(blob(x - 14 * s, cy - 10 * s, 92 * s, 78 * s, seed + 1, 10, 0.3), cMid);
  b += P(blob(x - 38 * s, cy - 38 * s, 50 * s, 38 * s, seed + 2, 8, 0.3), cLight);
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 50; b += P(blob(x + Math.cos(a) * d * s, cy + Math.sin(a) * d * 0.8 * s, 16 * s, 11 * s, seed + 9 + i, 6, 0.3), r() > 0.5 ? cDark : cLight, 0.55); }
  return b;
};
export const hedge = (x0, x1, top, base, seed, c = "#2c4a3e", cl = "#3b6150", cd = "#22392f") => {
  const r = rng(seed), h = base - top;
  let b = shadow((x0 + x1) / 2, base, (x1 - x0) * 0.55, 14, 0.3) + R(x0, top + h * 0.35, x1 - x0, h * 0.65, c);
  for (let x = x0 + h * 0.3; x < x1 - h * 0.2; x += h * (0.5 + r() * 0.3)) b += P(blob(x, top + h * 0.4, h * 0.42, h * 0.4, seed + Math.round(x), 8, 0.25), c);
  for (let x = x0 + h * 0.3; x < x1 - h * 0.2; x += h * (0.6 + r() * 0.3)) b += P(blob(x - h * 0.08, top + h * 0.3, h * 0.22, h * 0.16, seed + 7 + Math.round(x), 7, 0.25), cl, 0.9);
  return b + R(x0, base - h * 0.25, x1 - x0, h * 0.25, cd, 0.7);
};

/* ---------- town ---------- */
export const houseWindow = (x, y, w, h, lit, seed, trim = "#e9dcc0", curtain = "#c8574b") => {
  const r = rng(seed);
  let b = lit ? glow(x + w / 2, y + h / 2, w * 1.3, h * 1.2, "#ffcf7a", 0.3) : "";
  b += R(x - 8, y - 8, w + 16, h + 16, trim, null, 3);
  if (lit) {
    b += fillLin(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, [[0, "#ffe6a8"], [1, "#f2a85a"]]);
    b += P(`M${x} ${y} C${x + w * 0.22} ${y + h * 0.3} ${x + w * 0.14} ${y + h * 0.7} ${x + w * 0.24} ${y + h} L${x} ${y + h} Z`, curtain, 0.9);
    b += P(`M${x + w} ${y} C${x + w * 0.78} ${y + h * 0.3} ${x + w * 0.86} ${y + h * 0.7} ${x + w * 0.76} ${y + h} L${x + w} ${y + h} Z`, curtain, 0.9);
    if (r() > 0.5) b += P(blob(x + w * 0.52, y + h * 0.82, w * 0.12, h * 0.16, seed, 7, 0.2), "#3f7f4a", 0.75);
  } else {
    b += R(x, y, w, h, "#2c3866") + P(`M${x + w * 0.1} ${y + h} L${x + w * 0.62} ${y} L${x + w * 0.8} ${y} L${x + w * 0.28} ${y + h} Z`, "#6a7fb8", 0.3);
  }
  b += R(x + w / 2 - 3, y, 6, h, trim) + R(x, y + h * 0.45 - 3, w, 6, trim) + R(x, y, w, 5, SH, 0.25);
  b += R(x - 14, y + h + 6, w + 28, 10, trim, null, 2) + R(x - 14, y + h + 15, w + 28, 4, SH, 0.22);
  return b;
};
export const townHouse = (x, base, fw, sw, h, seed, wall, roof, lit, trim = "#d4cde0") => {
  const r = rng(seed), top = base - h, peak = top - fw * 0.42;
  let b = "";
  const side = poly([[x + fw, top], [x + fw + sw, top], [x + fw + sw, base], [x + fw, base]]);
  b += P(side, wall) + P(side, SH, 0.26);
  const roofSide = poly([[x + fw / 2, peak], [x + fw / 2 + sw, peak], [x + fw + sw + 16, top + 6], [x + fw + 16, top + 6]]);
  b += P(roofSide, roof) + clip(roofSide, [1, 2, 3, 4, 5, 6].map((k) => { const t = k / 7; return L(`M${f(x + fw / 2 + (fw / 2 + 16) * t - 10)} ${f(peak + (top + 6 - peak) * t)} L${f(x + fw / 2 + sw + (fw / 2 + 16) * t + 10)} ${f(peak + (top + 6 - peak) * t)}`, SH, 3, 0.2); }).join("") +
    R(x + fw / 2, peak, sw + fw, 8, "#ffffff", 0.14));
  const front = poly([[x, top], [x + fw / 2, peak], [x + fw, top], [x + fw, base], [x, base]]);
  b += P(front, wall) + clip(front, [...Array(Math.ceil(h / 22) + 8).keys()].map((k) => R(x, peak + 20 + k * 22, fw, 2, SH, 0.07)).join("") + P(poly([[x + fw * 0.86, peak], [x + fw, top], [x + fw, base], [x + fw * 0.86, base]]), SH, 0.08) + R(x, base - 30, fw, 30, SH, 0.12));
  b += P(poly([[x - 16, top + 8], [x + fw / 2, peak - 12], [x + fw + 16, top + 8], [x + fw + 4, top + 14], [x + fw / 2, peak + 4], [x - 4, top + 14]]), trim) + P(poly([[x + fw / 2, peak - 12], [x + fw + 16, top + 8], [x + fw + 4, top + 14], [x + fw / 2, peak + 4]]), SH, 0.15);
  if (r() > 0.3) { const cx = x + fw / 2 + sw * 0.55, cy = peak + (top - peak) * 0.25; b += R(cx, cy - 50, 34, 70, "#7a5060") + R(cx + 22, cy - 50, 12, 70, SH, 0.2) + R(cx - 5, cy - 58, 44, 11, "#64404e", null, 2) + R(cx - 5, cy - 58, 44, 3, "#ffffff", 0.18); }
  const ww = fw * 0.32, wh = Math.min(h * 0.3, 92);
  b += houseWindow(x + fw / 2 - ww / 2, top + h * 0.12, ww, wh, r() < lit, seed + 3, trim);
  if (h > 210) b += houseWindow(x + fw * 0.14, top + h * 0.56, ww * 0.85, wh * 0.85, r() < lit, seed + 4, trim);
  if (h > 210) { const dx = x + fw * 0.62, dw = fw * 0.24, dh = h * 0.36; b += R(dx - 8, base - dh - 8, dw + 16, dh + 8, trim, null, 4) + P(rrect(dx, base - dh, dw, dh, Math.min(dw / 2, 14)), "#6b3f3f") + R(dx + dw * 0.75, base - dh, dw * 0.25, dh, SH, 0.2) + C(dx + dw * 0.2, base - dh * 0.45, 4, "#e9c46a") + glow(dx + dw / 2, base - dh - 20, 40, 30, "#ffcf7a", 0.4) + C(dx + dw / 2, base - dh - 18, 6, "#ffe6a8"); }
  if (sw > 50) b += houseWindow(x + fw + sw * 0.3, top + h * 0.3, sw * 0.4, wh * 0.8, r() < lit * 0.6, seed + 5, trim);
  return b;
};
export const skyBlock = (x, base, w, h, seed, c) => {
  const r = rng(seed);
  let b = R(x, base - h, w, h + 400, c) + R(x + w * 0.74, base - h, w * 0.26, h + 400, SH, 0.16);
  b += R(x - 6, base - h - 8, w + 12, 10, c, null, 2) + R(x - 6, base - h + 2, w + 12, 3, SH, 0.2);
  if (r() > 0.5) b += R(x + w * 0.2, base - h - 40, 34, 32, c) + P(poly([[x + w * 0.2 - 4, base - h - 40], [x + w * 0.2 + 17, base - h - 56], [x + w * 0.2 + 38, base - h - 40]]), c);
  else b += L(`M${x + w * 0.66} ${base - h - 8} L${x + w * 0.66} ${base - h - 70} M${x + w * 0.6} ${base - h - 50} L${x + w * 0.72} ${base - h - 50}`, c, 4) + C(x + w * 0.66, base - h - 72, 4, "#ff8a6a", 0.9);
  for (let wy = base - h + 22; wy < base + 200; wy += 30)
    for (let wx = x + 14; wx < x + w - 22; wx += 26) { const k = r(); b += k > 0.86 ? glow(wx + 6, wy + 8, 16, 16, "#f2c46a", 0.25) + R(wx, wy, 13, 17, "#f2c46a", 0.8, 2) : R(wx, wy, 13, 17, "#6a7cb4", 0.3, 2); }
  return b;
};
export const streetLamp = (x, base, h = 230, c = "#22284a") => {
  const t = base - h;
  return glow(x, t + 30, 190, 190, "#ffd27a", 0.32) + glow(x, base + 6, 150, 26, "#ffd27a", 0.35) + shadow(x, base + 4, 30, 6, 0.4) +
    P(`M${x - 18} ${base} Q${x - 16} ${base - 22} ${x - 6} ${base - 30} L${x - 4} ${t + 40} L${x + 4} ${t + 40} L${x + 6} ${base - 30} Q${x + 16} ${base - 22} ${x + 18} ${base} Z`, c) + R(x + 1, t + 40, 3, h - 70, "#ffffff", 0.12) +
    P(`M${x - 22} ${t + 40} L${x + 22} ${t + 40} L${x + 14} ${t + 30} L${x - 14} ${t + 30} Z`, c) +
    fillLin(`M${x - 16} ${t + 30} L${x + 16} ${t + 30} L${x + 20} ${t - 6} L${x - 20} ${t - 6} Z`, [[0, "#fff4c8"], [1, "#ffd27a"]]) + R(x - 1.5, t - 6, 3, 36, c, 0.6) +
    P(`M${x - 28} ${t - 6} L${x + 28} ${t - 6} Q${x + 14} ${t - 24} ${x} ${t - 30} Q${x - 14} ${t - 24} ${x - 28} ${t - 6} Z`, c) + C(x, t - 32, 5, c);
};
export const fence = (x0, x1, base, h, c = "#cfc8de", step = 30) => {
  let b = shadow((x0 + x1) / 2, base, (x1 - x0) * 0.55, 10, 0.25);
  b += R(x0, base - h * 0.75, x1 - x0, 9, c) + R(x0, base - h * 0.3, x1 - x0, 9, c) + R(x0, base - h * 0.75 + 7, x1 - x0, 3, SH, 0.2) + R(x0, base - h * 0.3 + 7, x1 - x0, 3, SH, 0.2);
  for (let x = x0 + 6; x < x1 - 10; x += step) b += P(`M${x} ${base} L${x} ${base - h + 10} L${x + 8} ${base - h} L${x + 16} ${base - h + 10} L${x + 16} ${base} Z`, c) + R(x + 11, base - h + 8, 5, h - 8, SH, 0.16);
  return b;
};
export const sittingCat = (x, base, s, c = "#1c1f38", eye = "#ffd25a") =>
  P(`M${x - 22 * s} ${base} C${x - 26 * s} ${base - 30 * s} ${x - 18 * s} ${base - 52 * s} ${x - 10 * s} ${base - 58 * s} L${x - 14 * s} ${base - 76 * s} L${x - 4 * s} ${base - 66 * s} C${x} ${base - 68 * s} ${x + 4 * s} ${base - 68 * s} ${x + 8 * s} ${base - 66 * s} L${x + 16 * s} ${base - 76 * s} L${x + 14 * s} ${base - 56 * s} C${x + 22 * s} ${base - 48 * s} ${x + 26 * s} ${base - 26 * s} ${x + 22 * s} ${base} Z`, c) +
  L(`M${x + 20 * s} ${base - 4 * s} C${x + 44 * s} ${base} ${x + 46 * s} ${base + 26 * s} ${x + 36 * s} ${base + 40 * s}`, c, 6 * s) + E(x - 5 * s, base - 54 * s, 3 * s, 2.2 * s, eye) + E(x + 7 * s, base - 54 * s, 3 * s, 2.2 * s, eye);

/* ---------- interior surfaces ---------- */
export const wallpaper = (y0, y1, base, motif, seed, step = 120) => {
  let b = R(0, y0, W, y1 - y0, base);
  for (let x = 0; x < W; x += step) b += R(x + step * 0.43, y0, step * 0.14, y1 - y0, motif, 0.3);
  for (let y = y0 + 40; y < y1 - 30; y += step * 0.92) for (let x = 0; x < W + step; x += step) {
    const cx = x + (Math.round((y - y0) / (step * 0.92)) % 2 ? 0 : step / 2), cy = y;
    b += P(`M${f(cx)} ${f(cy - 13)} C${f(cx + 9)} ${f(cy - 4)} ${f(cx + 9)} ${f(cy + 4)} ${f(cx)} ${f(cy + 13)} C${f(cx - 9)} ${f(cy + 4)} ${f(cx - 9)} ${f(cy - 4)} ${f(cx)} ${f(cy - 13)} Z`, motif, 0.55) + C(cx, cy - 22, 2.5, motif, 0.5) + C(cx, cy + 22, 2.5, motif, 0.5);
  }
  return b;
};
export const skirting = (y, h, c, x0 = 0, x1 = W) => R(x0, y, x1 - x0, h, c) + R(x0, y, x1 - x0, 6, "#ffffff", 0.35) + R(x0, y + 10, x1 - x0, 3, SH, 0.12) + R(x0, y + h - 6, x1 - x0, 6, SH, 0.22);
export const planks = (y0, y1, c, cLine, cHi, seed) => {
  const r = rng(seed);
  let b = R(0, y0, W, y1 - y0, c), y = y0, k = 0;
  while (y < y1) {
    const hgt = 46 + k * 9;
    b += R(0, y, W, 3, cLine) + R(0, y + 3, W, 2, cHi, 0.45);
    let x = -r() * 300;
    while (x < W) {
      const w = 320 + r() * 280;
      if (r() > 0.55) b += R(x, y + 3, w, hgt - 3, r() > 0.5 ? cHi : cLine, 0.12);
      b += R(x + w, y, 3, hgt, cLine);
      if (r() > 0.35) b += L(`M${f(x + 30 + r() * 60)} ${f(y + hgt * 0.45)} C${f(x + w * 0.35)} ${f(y + hgt * 0.25)} ${f(x + w * 0.6)} ${f(y + hgt * 0.7)} ${f(x + w - 30)} ${f(y + hgt * 0.5)}`, cLine, 2, 0.4);
      if (r() > 0.85) b += E(x + w * (0.3 + r() * 0.4), y + hgt * 0.5, 7, 4, cLine, 0.6);
      x += w;
    }
    y += hgt; k++;
  }
  return b;
};
export const floorShade = (y0, y1 = H, top = 0.26, bottom = 0.14) => fillLin(`M0 ${y0} L${W} ${y0} L${W} ${y1} L0 ${y1} Z`, [[0, SH, top], [0.3, SH, 0], [1, SH, bottom]]);

/* ---------- windows, curtains, frames ---------- */
export const nightView = (x, y, w, h, seed) => {
  let s = fillLin(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, [[0, "#1c2750"], [1, "#4a5f98"]]) + stars(seed, x + 10, y + 10, x + w - 10, y + h * 0.6, Math.round(w * h / 8000)) + moon(x + w * 0.76, y + h * 0.24, Math.min(w, h) * 0.085);
  s += P(scallopLine(x - 10, x + w + 10, y + h * 0.7, seed + 1, 70, 18, y + h), "#2a3a68");
  const r = rng(seed + 2); let rx = x - 10;
  while (rx < x + w) {
    const rw = 60 + r() * 70, rh = 36 + r() * 50, by = y + h;
    s += P(poly([[rx, by], [rx, by - rh], [rx + rw / 2, by - rh - rw * 0.4], [rx + rw, by - rh], [rx + rw, by]]), "#1a2242") + P(poly([[rx + rw / 2, by - rh - rw * 0.4], [rx + rw, by - rh], [rx + rw, by], [rx + rw / 2, by]]), "#000000", 0.15);
    if (r() > 0.4) s += glow(rx + rw * 0.4, by - rh + 26, 22, 22, "#f2c46a", 0.4) + R(rx + rw * 0.32, by - rh + 16, 14, 18, "#f2c46a", 0.9, 2);
    rx += rw + 4;
  }
  return clip(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, s);
};
export const windowFrame = (x, y, w, h, frame = "#f1e2c6", bar = 14) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${frame}" stroke-width="${bar + 4}"/>` + R(x + w / 2 - bar / 2, y, bar, h, frame) + R(x, y + h * 0.5 - bar / 2, w, bar, frame);
  s += R(x + w / 2 + bar / 2, y + 9, 4, h - 18, SH, 0.15) + R(x + 9, y + h * 0.5 + bar / 2, w - 18, 4, SH, 0.15) + R(x + 9, y + 9, w - 18, 7, SH, 0.28) + R(x + 9, y + 9, 7, h - 18, SH, 0.16);
  s += P(`M${x + 30} ${y + h * 0.5 - 20} L${x + w * 0.22} ${y + 20} L${x + w * 0.3} ${y + 20} L${x + 44} ${y + h * 0.5 - 20} Z`, "#ffffff", 0.12) + P(`M${x + w * 0.56} ${y + h - 20} L${x + w * 0.72} ${y + h * 0.5 + 20} L${x + w * 0.76} ${y + h * 0.5 + 20} L${x + w * 0.6} ${y + h - 20} Z`, "#ffffff", 0.1);
  return s;
};
export const curtain = (x0, x1, y0, y1, c, left, seed, tieC = "#e3b23c") => {
  const w = x1 - x0, tie = y0 + (y1 - y0) * 0.6;
  const inner = left ? x1 : x0, outer = left ? x0 : x1, s = left ? 1 : -1;
  const d = `M${outer} ${y0} L${inner} ${y0} C${inner - s * w * 0.1} ${y0 + (tie - y0) * 0.5} ${inner - s * w * 0.42} ${tie - 40} ${inner - s * w * 0.52} ${tie} C${inner - s * w * 0.36} ${tie + 60} ${inner - s * w * 0.04} ${y1 - 60} ${inner + s * w * 0.06} ${y1} Q${outer + s * w * 0.5} ${y1 + 16} ${outer} ${y1} Z`;
  const fold = (t, op) => P(`M${outer + s * w * t} ${y0} C${outer + s * w * (t + 0.03)} ${tie - 80} ${outer + s * w * (t - 0.08)} ${tie - 10} ${outer + s * w * (t - 0.05)} ${tie + 10} C${outer + s * w * (t + 0.06)} ${tie + 100} ${outer + s * w * (t + 0.08)} ${y1 - 40} ${outer + s * w * (t + 0.12)} ${y1 + 10} L${outer + s * w * (t + 0.2)} ${y1 + 10} C${outer + s * w * (t + 0.15)} ${y1 - 60} ${outer + s * w * (t + 0.12)} ${tie + 80} ${outer + s * w * (t + 0.04)} ${tie + 14} C${outer + s * w * (t + 0.04)} ${tie - 60} ${outer + s * w * (t + 0.1)} ${tie - 140} ${outer + s * w * (t + 0.1)} ${y0} Z`, SH, op);
  let b = shadow(outer + s * w * 0.3, y1 + 8, w * 0.5, 10, 0.25) + P(d, c);
  b += clip(d, fold(0.18, 0.18) + fold(0.42, 0.2) + fold(0.66, 0.16) + P(`M${outer} ${y0} L${outer + s * w * 0.1} ${y0} L${outer + s * w * 0.1} ${y1 + 20} L${outer} ${y1 + 20} Z`, SH, 0.15) +
    L(`M${outer + s * w * 0.32} ${y0 + 20} C${outer + s * w * 0.3} ${tie - 120} ${outer + s * w * 0.26} ${tie - 40} ${outer + s * w * 0.3} ${tie - 10}`, "#ffffff", 7, 0.16) + L(`M${outer + s * w * 0.56} ${y0 + 20} C${outer + s * w * 0.56} ${tie - 120} ${outer + s * w * 0.5} ${tie - 40} ${outer + s * w * 0.52} ${tie - 10}`, "#ffffff", 5, 0.12) +
    R(Math.min(outer, inner) - 10, y0, w + 20, 16, SH, 0.2));
  b += P(`M${outer} ${tie - 16} C${inner - s * w * 0.36} ${tie - 24} ${inner - s * w * 0.48} ${tie - 10} ${inner - s * w * 0.48} ${tie + 4} C${inner - s * w * 0.48} ${tie + 18} ${outer} ${tie + 16} ${outer} ${tie + 16} Z`, tieC) + P(`M${outer} ${tie + 6} C${inner - s * w * 0.4} ${tie + 8} ${inner - s * w * 0.48} ${tie + 6} ${inner - s * w * 0.48} ${tie + 4} C${inner - s * w * 0.48} ${tie + 18} ${outer} ${tie + 16} ${outer} ${tie + 16} Z`, SH, 0.2);
  return b;
};
export const curtainRod = (x0, x1, y, c = "#8a5a34") => R(x0, y - 9, x1 - x0, 18, c, null, 9) + R(x0 + 10, y - 7, x1 - x0 - 20, 4, "#ffffff", 0.3, 2) + R(x0, y + 5, x1 - x0, 4, SH, 0.2) +
  [x0, x1].map((x) => P(ell(x, y, 18, 18), c) + P(ell(x - 5, y - 5, 6, 6), "#ffffff", 0.3)).join("") + [x0 + 60, x1 - 60].map((x) => R(x - 6, y - 30, 12, 26, c, null, 3)).join("");
export const frameArt = (x, y, w, h, inner, wood = "#a8703f", mat = "#fbf6ea") =>
  R(x + 8, y + 12, w, h, SH, 0.18, 4) + R(x, y, w, h, wood, null, 4) + R(x + 4, y + 4, w - 8, 5, "#ffffff", 0.25) + R(x + 14, y + 14, w - 28, h - 28, mat) + clip(`M${x + 26} ${y + 26} L${x + w - 26} ${y + 26} L${x + w - 26} ${y + h - 26} L${x + 26} ${y + h - 26} Z`, inner) +
  R(x + 14, y + 14, w - 28, 5, SH, 0.12) + P(poly([[x + w - 14, y + 14], [x + w, y], [x + w, y + h], [x, y + h], [x + 14, y + h - 14], [x + w - 14, y + h - 14]]), SH, 0.16) + P(`M${x + 26} ${y + h * 0.7} L${x + w * 0.5} ${y + 26} L${x + w * 0.62} ${y + 26} L${x + 26} ${y + h * 0.9} Z`, "#ffffff", 0.12);
export const landscapeArt = (x, y, w, h) =>
  fillLin(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`, [[0, "#bfe3f2"], [1, "#fde9c4"]]) + C(x + w * 0.74, y + h * 0.28, h * 0.11, "#f2b84a") +
  P(`M${x} ${y + h * 0.72} L${x + w * 0.3} ${y + h * 0.36} L${x + w * 0.46} ${y + h * 0.56} L${x + w * 0.66} ${y + h * 0.3} L${x + w} ${y + h * 0.7} L${x + w} ${y + h} L${x} ${y + h} Z`, "#6aa37a") +
  P(`M${x + w * 0.3} ${y + h * 0.36} L${x + w * 0.46} ${y + h * 0.56} L${x + w * 0.4} ${y + h} L${x + w * 0.18} ${y + h} Z`, SH, 0.12) + P(`M${x + w * 0.66} ${y + h * 0.3} L${x + w} ${y + h * 0.7} L${x + w} ${y + h} L${x + w * 0.7} ${y + h} Z`, SH, 0.14) +
  P(`M${x + w * 0.66} ${y + h * 0.3} L${x + w * 0.72} ${y + h * 0.38} L${x + w * 0.66} ${y + h * 0.36} L${x + w * 0.61} ${y + h * 0.37} Z`, "#ffffff", 0.9) +
  P(scallopLine(x, x + w, y + h * 0.82, 7, 50, 10, y + h), "#4f8a5c");

/* ---------- furniture ---------- */
export const books = (x, y, w, seed, cols = ["#c8574b", "#3f7fc8", "#e3b23c", "#4f9b5a", "#e08a3a", "#7a5bb5", "#3a8f98"]) => {
  const r = rng(seed);
  let s = "", bx = x;
  while (bx < x + w - 30) {
    const bw = 20 + r() * 18, bh = 70 + r() * 42, c = cols[Math.floor(r() * cols.length)];
    if (r() > 0.86 && bx < x + w - 90) {
      s += P(poly([[bx, y], [bx + 20, y - bh * 0.96], [bx + 20 + bw, y - bh * 0.96 + 7], [bx + bw + 2, y]]), c) + P(poly([[bx + bw - 6, y], [bx + 14 + bw, y - bh * 0.96 + 6], [bx + 20 + bw, y - bh * 0.96 + 7], [bx + bw + 2, y]]), SH, 0.22);
      bx += bw + 24; continue;
    }
    s += P(rrect(bx, y - bh, bw, bh, 3), c) + R(bx + bw - 6, y - bh, 6, bh, SH, 0.2) + R(bx + 3, y - bh + 12, bw - 9, 5, "#ffffff", 0.4) + R(bx + 3, y - 22, bw - 9, 4, "#ffffff", 0.28) + R(bx + 2, y - bh, bw - 4, 3, "#ffffff", 0.35);
    bx += bw + 2;
  }
  return s;
};
export const shelf = (x, y, w, wood, seed, extra = "") => books(x + 12, y, w - 24, seed) + extra + shadow(x + w / 2, y + 34, w * 0.55, 20, 0.3) + R(x, y, w, 18, wood, null, 3) + R(x, y + 13, w, 5, SH, 0.22) + R(x, y, w, 4, "#ffffff", 0.25) +
  P(`M${x + 30} ${y + 18} L${x + 44} ${y + 18} Q${x + 44} ${y + 40} ${x + 34} ${y + 52} L${x + 30} ${y + 52} Z`, wood) + P(`M${x + w - 44} ${y + 18} L${x + w - 30} ${y + 18} L${x + w - 30} ${y + 52} L${x + w - 34} ${y + 52} Q${x + w - 44} ${y + 40} ${x + w - 44} ${y + 18} Z`, wood);
export const nightstand = (x, base, w, h, wood = "#a8703f") => {
  const t = base - h;
  return shadow(x + w / 2, base, w * 0.75, 14, 0.4) +
    R(x + 10, base - 30, 12, 30, wood) + R(x + w - 22, base - 30, 12, 30, wood) + R(x + w - 16, base - 30, 6, 30, SH, 0.25) +
    form(rrect(x, t + 12, w, h - 40, 6), wood, `M${x + w * 0.84} ${t} L${x + w + 4} ${t} L${x + w + 4} ${base} L${x + w * 0.84} ${base} Z`, null, 0.2) +
    P(rrect(x - 10, t, w + 20, 18, 5), wood) + R(x - 10, t, w + 20, 5, "#ffffff", 0.28, 3) + R(x - 10, t + 14, w + 20, 4, SH, 0.22) +
    P(rrect(x + 14, t + 34, w - 28, (h - 70) * 0.45, 5), SH, 0.12) + P(rrect(x + 14, t + 38 + (h - 70) * 0.5, w - 28, (h - 70) * 0.45, 5), SH, 0.12) +
    R(x + 14, t + 34, w - 28, 3, "#ffffff", 0.2) + R(x + 14, t + 38 + (h - 70) * 0.5, w - 28, 3, "#ffffff", 0.2) +
    C(x + w / 2, t + 34 + (h - 70) * 0.22, 6, "#e3b23c") + C(x + w / 2, t + 38 + (h - 70) * 0.72, 6, "#e3b23c");
};
export const tableLamp = (x, base, s, on = true, shadeC = "#f2c98a", body = "#3f8f8e") => {
  const st = base - 120 * s;
  let b = on ? glow(x, st - 30 * s, 300 * s, 260 * s, "#ffdc96", 0.32) + glow(x, base + 2, 120 * s, 20 * s, "#ffdc96", 0.4) : "";
  b += shadow(x, base, 50 * s, 7 * s, 0.4);
  b += form(`M${x - 10 * s} ${base} C${x - 46 * s} ${base - 6 * s} ${x - 44 * s} ${base - 64 * s} ${x - 18 * s} ${base - 78 * s} C${x - 8 * s} ${base - 84 * s} ${x - 8 * s} ${base - 92 * s} ${x - 6 * s} ${st} L${x + 6 * s} ${st} C${x + 8 * s} ${base - 92 * s} ${x + 8 * s} ${base - 84 * s} ${x + 18 * s} ${base - 78 * s} C${x + 44 * s} ${base - 64 * s} ${x + 46 * s} ${base - 6 * s} ${x + 10 * s} ${base} Z`, body,
    `M${x + 12 * s} ${st} L${x + 60 * s} ${st} L${x + 60 * s} ${base} L${x + 14 * s} ${base} Z`, null, 0.25, `M${x - 30 * s} ${base - 64 * s} L${x - 22 * s} ${base - 70 * s} L${x - 26 * s} ${base - 20 * s} L${x - 32 * s} ${base - 24 * s} Z`);
  const shade = `M${x - 34 * s} ${st - 84 * s} L${x + 34 * s} ${st - 84 * s} L${x + 62 * s} ${st - 4 * s} Q${x} ${st + 8 * s} ${x - 62 * s} ${st - 4 * s} Z`;
  b += (on ? E(x, st - 2 * s, 56 * s, 9 * s, "#fff6d8") : "") + form(shade, shadeC, `M${x + 12 * s} ${st - 90 * s} L${x + 70 * s} ${st - 90 * s} L${x + 70 * s} ${st + 10 * s} L${x + 26 * s} ${st + 10 * s} Z`, null, on ? 0.12 : 0.22) +
    (on ? clip(shade, glow(x - 6 * s, st - 30 * s, 50 * s, 50 * s, "#fffbe6", 0.6)) : "") + R(x - 34 * s, st - 86 * s, 68 * s, 5 * s, "#ffffff", 0.3, 2);
  return b;
};
export const bed = (x0, x1, headTop, mattTop, base, o = {}) => {
  const wood = o.wood || "#8a5a34", sheet = o.sheet || "#f6f1e6", blanket = o.blanket || "#3f8ee6", blanketD = o.blanketD || "#2f72c4", pillowC = o.pillow || "#ffffff";
  const hx1 = x0 + 90, mb = mattTop + 90, rail = mb + 34;
  let b = shadow((x0 + x1) / 2 + 40, base + 4, (x1 - x0) * 0.6, 22, 0.45);
  b += R(hx1 + 30, rail, 14, base - rail, wood) + R(x1 - 50, rail, 14, base - rail, wood);
  b += form(rrect(hx1 - 20, mb - 6, x1 - hx1 + 40, rail - mb + 12, 8), wood, `M${hx1 - 30} ${mb + 18} L${x1 + 30} ${mb + 18} L${x1 + 30} ${rail + 20} L${hx1 - 30} ${rail + 20} Z`, null, 0.25);
  b += R(hx1 - 20, mb - 2, x1 - hx1 + 40, 4, "#ffffff", 0.2);
  const head = `M${x0} ${base} L${x0} ${headTop + 40} C${x0} ${headTop + 6} ${x0 + 20} ${headTop - 6} ${x0 + 45} ${headTop - 6} C${x0 + 72} ${headTop - 6} ${hx1} ${headTop + 8} ${hx1} ${headTop + 40} L${hx1} ${base} L${hx1 - 22} ${base} L${hx1 - 22} ${rail + 30} L${x0 + 22} ${rail + 30} L${x0 + 22} ${base} Z`;
  b += form(head, wood, `M${x0 + 58} ${headTop - 20} L${hx1 + 10} ${headTop - 20} L${hx1 + 10} ${base} L${x0 + 58} ${base} Z`, null, 0.2, `M${x0 + 6} ${headTop + 30} L${x0 + 14} ${headTop + 16} L${x0 + 14} ${rail} L${x0 + 6} ${rail} Z`);
  b += P(rrect(x0 + 18, headTop + 34, hx1 - x0 - 36, rail - headTop - 60, 12), SH, 0.14) + R(x0 + 18, headTop + 34, hx1 - x0 - 36, 4, "#ffffff", 0.2);
  b += form(rrect(hx1, mattTop, x1 - hx1 + 20, mb - mattTop, 14), sheet, `M${hx1} ${mattTop + (mb - mattTop) * 0.6} L${x1 + 30} ${mattTop + (mb - mattTop) * 0.6} L${x1 + 30} ${mb} L${hx1} ${mb} Z`, null, 0.12);
  b += L(`M${hx1 + 10} ${mattTop + 16} L${x1 + 20} ${mattTop + 16}`, "#ffffff", 3, 0.7);
  const px = hx1 + 8, pw = 230;
  const pil = `M${px + 10} ${mattTop + 4} C${px - 6} ${mattTop - 30} ${px + 4} ${mattTop - 80} ${px + 30} ${mattTop - 84} C${px + 90} ${mattTop - 94} ${px + 170} ${mattTop - 92} ${px + pw - 14} ${mattTop - 76} C${px + pw + 8} ${mattTop - 60} ${px + pw + 6} ${mattTop - 14} ${px + pw - 10} ${mattTop + 4} C${px + 160} ${mattTop + 12} ${px + 70} ${mattTop + 12} ${px + 10} ${mattTop + 4} Z`;
  b += form(pil, pillowC, `M${px - 10} ${mattTop - 30} C${px + 80} ${mattTop - 10} ${px + 160} ${mattTop - 14} ${px + pw + 20} ${mattTop - 36} L${px + pw + 20} ${mattTop + 20} L${px - 10} ${mattTop + 20} Z`, null, 0.1) +
    L(`M${px + 40} ${mattTop - 70} C${px + 60} ${mattTop - 52} ${px + 54} ${mattTop - 30} ${px + 70} ${mattTop - 14} M${px + 150} ${mattTop - 76} C${px + 140} ${mattTop - 56} ${px + 150} ${mattTop - 40} ${px + 140} ${mattTop - 20}`, SH, 3, 0.08) + E(px + 70, mattTop - 64, 40, 8, "#ffffff", 0.0);
  const bx = px + pw - 40, hang = rail + 34;
  const blk = `M${bx} ${mattTop + 6} C${bx + 30} ${mattTop - 14} ${bx + 80} ${mattTop - 16} ${bx + 140} ${mattTop - 10} L${x1 + 40} ${mattTop - 6} L${x1 + 40} ${hang} C${x1 - 60} ${hang + 10} ${x1 - 140} ${hang - 6} ${x1 - 220} ${hang + 4} C${x1 - 300} ${hang + 12} ${bx + 80} ${hang - 2} ${bx + 20} ${hang + 6} C${bx - 4} ${hang - 40} ${bx - 14} ${mb - 20} ${bx - 6} ${mattTop + 40} C${bx - 4} ${mattTop + 22} ${bx - 4} ${mattTop + 12} ${bx} ${mattTop + 6} Z`;
  let pat = "";
  for (let gx = bx - 40; gx < x1 + 60; gx += 70) pat += L(`M${gx} ${mattTop - 20} L${gx + 30} ${hang + 20}`, "#ffffff", 2, 0.14);
  for (let gy = mattTop + 30; gy < hang + 20; gy += 60) pat += L(`M${bx - 20} ${gy} L${x1 + 60} ${gy + 6}`, "#ffffff", 2, 0.14);
  b += P(blk, blanket) + clip(blk, pat + P(`M${bx - 40} ${mb - 10} C${bx + 200} ${mb + 6} ${x1 - 100} ${mb - 2} ${x1 + 60} ${mb - 8} L${x1 + 60} ${hang + 40} L${bx - 40} ${hang + 40} Z`, blanketD, 0.85) +
    P(`M${bx - 20} ${mattTop - 30} L${bx + 14} ${mattTop - 30} C${bx + 4} ${mattTop + 40} ${bx + 20} ${mb} ${bx + 34} ${hang + 30} L${bx - 20} ${hang + 30} Z`, SH, 0.18) +
    L(`M${bx + 160} ${mb + 4} C${bx + 170} ${mb + 30} ${bx + 160} ${hang - 20} ${bx + 176} ${hang + 6} M${x1 - 160} ${mb} C${x1 - 150} ${mb + 30} ${x1 - 164} ${hang - 20} ${x1 - 150} ${hang + 4}`, SH, 7, 0.16) +
    L(`M${bx + 30} ${mattTop + 2} C${bx + 140} ${mattTop - 12} ${x1 - 100} ${mattTop - 6} ${x1 + 40} ${mattTop - 2}`, "#ffffff", 7, 0.3));
  b += P(`M${bx - 10} ${mattTop + 10} C${bx + 30} ${mattTop - 6} ${bx + 80} ${mattTop - 8} ${bx + 140} ${mattTop - 4} L${bx + 150} ${mattTop + 26} C${bx + 90} ${mattTop + 22} ${bx + 30} ${mattTop + 24} ${bx - 6} ${mattTop + 38} Z`, sheet) + L(`M${bx - 6} ${mattTop + 34} C${bx + 30} ${mattTop + 22} ${bx + 90} ${mattTop + 20} ${bx + 150} ${mattTop + 24}`, SH, 3, 0.12);
  return b;
};
export const braidedRug = (cx, cy, rx, ry, cols = ["#c96a5a", "#f1d9a8", "#5f9ea0", "#e3b23c", "#f1d9a8", "#8a6a9a"]) => {
  let b = shadow(cx, cy + ry * 0.12, rx * 1.08, ry * 1.2, 0.35);
  cols.forEach((c, i) => { const k = 1 - i / cols.length; b += E(cx, cy, rx * k, ry * k, c); b += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * k - 3)}" ry="${f(ry * k - 2)}" fill="none" stroke="${SH}" stroke-width="2" stroke-dasharray="6 8" opacity="0.18"/>`; });
  return b + clip(ell(cx, cy, rx, ry), E(cx, cy - ry * 0.55, rx * 0.9, ry * 0.6, "#ffffff", 0.08) + E(cx, cy + ry * 0.9, rx * 1.1, ry * 0.5, SH, 0.12));
};
export const wallClock = (x, y, r, rim = "#3f6f8e") =>
  shadow(x + 8, y + 10, r * 1.15, r * 1.15, 0.25) + C(x, y, r, rim) + C(x, y, r * 0.84, "#fbf6ea") + clip(ell(x, y, r * 0.84, r * 0.84), C(x + r * 0.22, y + r * 0.22, r * 0.84, SH, 0.07)) +
  [...Array(12).keys()].map((i) => { const a = (i / 12) * Math.PI * 2; return C(x + Math.cos(a) * r * 0.68, y + Math.sin(a) * r * 0.68, i % 3 ? r * 0.025 : r * 0.05, "#3a3348"); }).join("") +
  L(`M${x} ${y} L${f(x + r * 0.3)} ${f(y - r * 0.32)} M${x} ${y} L${f(x - r * 0.06)} ${f(y - r * 0.56)}`, "#3a3348", r * 0.07) + L(`M${f(x - r * 0.16)} ${f(y + r * 0.16)} L${f(x + r * 0.5)} ${f(y - r * 0.5)}`, "#d8463a", r * 0.03) + C(x, y, r * 0.07, "#3a3348") +
  P(`M${x - r * 0.88} ${y - r * 0.1} A${r} ${r} 0 0 1 ${x - r * 0.1} ${y - r * 0.92} A${r * 0.92} ${r * 0.92} 0 0 0 ${x - r * 0.88} ${y - r * 0.1} Z`, "#ffffff", 0.3);
export const fairyLights = (pts, n, seed, cols = ["#ffd56a", "#ff9a7a", "#9fe0ff", "#c6f08a"]) => {
  const r = rng(seed);
  let wire = "", bulbs = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], sag = Math.abs(bx - ax) * 0.12;
    wire += `M${ax} ${ay} Q${(ax + bx) / 2} ${(ay + by) / 2 + sag * 2} ${bx} ${by} `;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t + sag * 2 * 2 * t * (1 - t) * 1, c = cols[Math.floor(r() * cols.length)];
      bulbs += glow(x, y + 12, 26, 26, c, 0.45) + R(x - 3, y - 2, 6, 7, "#3a3348", null, 2) + P(`M${x} ${y + 4} C${x + 7} ${y + 8} ${x + 6} ${y + 20} ${x} ${y + 22} C${x - 6} ${y + 20} ${x - 7} ${y + 8} ${x} ${y + 4} Z`, c) + C(x - 2, y + 11, 2, "#ffffff", 0.7);
    }
  }
  return L(wire, "#3a3348", 2.5, 0.8) + bulbs;
};
export const corkboard = (x, y, w, h, seed) => {
  const r = rng(seed);
  let b = R(x + 8, y + 10, w, h, SH, 0.2, 6) + R(x, y, w, h, "#a8703f", null, 6) + R(x + 12, y + 12, w - 24, h - 24, "#c99a68");
  let dots = ""; for (let i = 0; i < w * h / 600; i++) dots += C(x + 14 + r() * (w - 28), y + 14 + r() * (h - 28), 1.4, "#a8784a", 0.6);
  b += dots + R(x + 12, y + 12, w - 24, 5, SH, 0.15) + R(x + 4, y + 4, w - 8, 4, "#ffffff", 0.25);
  const notes = [["#fff3a6", 0.12, 0.14, 0.32, 0.36], ["#ffc4c4", 0.5, 0.12, 0.3, 0.32], ["#bfe6ff", 0.2, 0.56, 0.34, 0.32], ["#ffffff", 0.6, 0.5, 0.28, 0.38]];
  for (const [c, u, v, nw, nh] of notes) {
    const nx = x + w * u, ny = y + h * v, ww = w * nw, hh = h * nh, rot = (r() - 0.5) * 10;
    b += G(nx + ww / 2, ny + hh / 2, rot, R(-ww / 2 + 4, -hh / 2 + 6, ww, hh, SH, 0.18) + R(-ww / 2, -hh / 2, ww, hh, c) + (c === "#ffffff" ? R(-ww / 2 + 8, -hh / 2 + 8, ww - 16, hh * 0.62, "#7fb6c9") + C(-ww / 2 + ww * 0.7, -hh / 2 + hh * 0.22, hh * 0.08, "#f2c230") + P(`M${-ww / 2 + 8} ${-hh / 2 + 8 + hh * 0.62} L${-ww / 2 + ww * 0.4} ${-hh / 2 + hh * 0.32} L${ww / 2 - 8} ${-hh / 2 + 8 + hh * 0.62} Z`, "#4f8a5c") : L(`M${-ww / 2 + 10} ${-hh / 2 + hh * 0.38} L${ww / 2 - 12} ${-hh / 2 + hh * 0.38} M${-ww / 2 + 10} ${-hh / 2 + hh * 0.58} L${ww / 2 - 22} ${-hh / 2 + hh * 0.58} M${-ww / 2 + 10} ${-hh / 2 + hh * 0.78} L${ww / 2 - 30} ${-hh / 2 + hh * 0.78}`, "#6a5a6a", 3, 0.5)) + C(0, -hh / 2 + 8, 6, ["#d8463a", "#3f7fc8", "#4f9b5a"][Math.floor(r() * 3)]) + C(-2, -hh / 2 + 6, 2, "#ffffff", 0.6));
  }
  return b;
};
export const deskLamp = (x, base, s, c = "#e86a5c", flip = false) => {
  const k = flip ? -1 : 1, X = (v) => x + v * s * k, Y = (v) => base - v * s;
  return glow(X(150), base + 4, 220 * s, 40 * s, "#ffe2a0", 0.4) + shadow(x, base, 60 * s, 8 * s, 0.4) +
    P(`M${X(-48)} ${base} Q${X(-48)} ${Y(18)} ${X(0)} ${Y(20)} Q${X(48)} ${Y(18)} ${X(48)} ${base} Z`, c) + P(`M${X(14)} ${Y(20)} Q${X(48)} ${Y(18)} ${X(48)} ${base} L${X(14)} ${base} Z`, SH, 0.2) +
    L(`M${X(0)} ${Y(18)} L${X(-30)} ${Y(150)} L${X(70)} ${Y(230)}`, c, 12 * s) + L(`M${X(-2)} ${Y(18)} L${X(-32)} ${Y(150)}`, "#ffffff", 3 * s, 0.3) + C(X(-30), Y(150), 11 * s, "#3a3348") + C(X(0), Y(18), 9 * s, "#3a3348") +
    G(X(70), Y(230), flip ? 38 : -38, P(`M${-24 * s} ${-14 * s} L${24 * s} ${-14 * s} L${48 * s} ${46 * s} Q0 ${58 * s} ${-48 * s} ${46 * s} Z`, c) + P(`M${8 * s} ${-14 * s} L${24 * s} ${-14 * s} L${48 * s} ${46 * s} L${18 * s} ${52 * s} Z`, SH, 0.2) + E(0, 48 * s, 44 * s, 8 * s, "#fff6d8") + C(0, -18 * s, 10 * s, "#3a3348"));
};
export const mug = (x, base, s, c = "#f4f1ea", band = "#d8463a", steam = true) =>
  shadow(x, base, 44 * s, 6 * s, 0.4) + L(`M${x + 30 * s} ${base - 64 * s} C${x + 58 * s} ${base - 64 * s} ${x + 58 * s} ${base - 24 * s} ${x + 30 * s} ${base - 24 * s}`, c, 9 * s) +
  form(`M${x - 34 * s} ${base - 80 * s} L${x + 34 * s} ${base - 80 * s} L${x + 32 * s} ${base - 8 * s} Q${x + 30 * s} ${base} ${x + 22 * s} ${base} L${x - 22 * s} ${base} Q${x - 30 * s} ${base} ${x - 32 * s} ${base - 8 * s} Z`, c, `M${x + 12 * s} ${base - 90 * s} L${x + 40 * s} ${base - 90 * s} L${x + 40 * s} ${base} L${x + 12 * s} ${base} Z`, null, 0.16) +
  R(x - 33 * s, base - 54 * s, 66 * s, 16 * s, band) + E(x, base - 80 * s, 34 * s, 7 * s, "#5a3a2a") + E(x, base - 80 * s, 34 * s, 7 * s, c, 0) +
  (steam ? L(`M${x - 8 * s} ${base - 96 * s} C${x - 20 * s} ${base - 116 * s} ${x + 4 * s} ${base - 130 * s} ${x - 8 * s} ${base - 152 * s} M${x + 12 * s} ${base - 100 * s} C${x} ${base - 118 * s} ${x + 24 * s} ${base - 132 * s} ${x + 12 * s} ${base - 150 * s}`, "#ffffff", 5 * s, 0.35) : "");
export const bookStack = (x, base, seed, n = 3, cols = ["#3f7fc8", "#e3b23c", "#c8574b", "#4f9b5a"]) => {
  const r = rng(seed); let b = shadow(x + 80, base, 110, 8, 0.4), y = base;
  for (let i = 0; i < n; i++) { const w = 150 + r() * 40, h = 24 + r() * 10, ox = (r() - 0.5) * 24, c = cols[i % cols.length]; b += P(rrect(x + ox, y - h, w, h, 4), c) + R(x + ox + 6, y - h + 4, w - 12, h - 10, "#fbf6ea") + R(x + ox, y - h, 10, h, c) + R(x + ox, y - 6, w, 6, SH, 0.18) + R(x + ox + 2, y - h, w - 4, 3, "#ffffff", 0.35); y -= h; }
  return b;
};
export const sconce = (x, y, s, c = "#c9a052") =>
  glow(x, y - 20 * s, 120 * s, 180 * s, "#fff1c9", 0.35) + R(x - 10 * s, y + 16 * s, 20 * s, 30 * s, c, null, 4) +
  P(`M${x - 26 * s} ${y + 18 * s} L${x + 26 * s} ${y + 18 * s} L${x + 18 * s} ${y - 30 * s} L${x - 18 * s} ${y - 30 * s} Z`, "#fff4d6") + P(`M${x + 4 * s} ${y + 18 * s} L${x + 26 * s} ${y + 18 * s} L${x + 18 * s} ${y - 30 * s} L${x + 2 * s} ${y - 30 * s} Z`, "#f2d49a", 0.6);
export const coatRack = (x, y, w, wood = "#8a5a34", coat = "#4f7fa8", scarf = "#d8463a") =>
  R(x + 6, y + 8, w, 26, SH, 0.18, 6) + R(x, y, w, 26, wood, null, 6) + R(x, y, w, 5, "#ffffff", 0.25, 3) +
  [0.18, 0.5, 0.82].map((t) => L(`M${x + w * t} ${y + 14} L${x + w * t} ${y + 40} Q${x + w * t} ${y + 52} ${x + w * t + 14} ${y + 46}`, "#c9a052", 6)).join("") +
  form(`M${x + w * 0.18} ${y + 36} C${x + w * 0.18 - 40} ${y + 40} ${x + w * 0.18 - 66} ${y + 70} ${x + w * 0.18 - 70} ${y + 140} L${x + w * 0.18 - 78} ${y + 330} Q${x + w * 0.18} ${y + 346} ${x + w * 0.18 + 76} ${y + 330} L${x + w * 0.18 + 70} ${y + 140} C${x + w * 0.18 + 66} ${y + 70} ${x + w * 0.18 + 40} ${y + 40} ${x + w * 0.18} ${y + 36} Z`, coat,
    `M${x + w * 0.18 + 20} ${y + 30} L${x + w * 0.18 + 90} ${y + 30} L${x + w * 0.18 + 90} ${y + 360} L${x + w * 0.18 + 30} ${y + 360} Z`, null, 0.22) +
  L(`M${x + w * 0.18 - 26} ${y + 50} L${x + w * 0.18} ${y + 120} L${x + w * 0.18 + 26} ${y + 50} M${x + w * 0.18} ${y + 120} L${x + w * 0.18 + 4} ${y + 320}`, SH, 4, 0.2) + C(x + w * 0.18 + 12, y + 170, 5, "#e3b23c") + C(x + w * 0.18 + 12, y + 230, 5, "#e3b23c") +
  P(`M${x + w * 0.5 - 30} ${y + 40} Q${x + w * 0.5} ${y + 56} ${x + w * 0.5 + 30} ${y + 40} L${x + w * 0.5 + 24} ${y + 220} L${x + w * 0.5 + 4} ${y + 226} L${x + w * 0.5 + 8} ${y + 70} L${x + w * 0.5 - 8} ${y + 70} L${x + w * 0.5 - 12} ${y + 250} L${x + w * 0.5 - 32} ${y + 244} Z`, scarf) +
  [y + 210, y + 236].map((yy) => L(`M${x + w * 0.5 - 30} ${yy} L${x + w * 0.5 - 12} ${yy + 4}`, "#ffffff", 3, 0.4)).join("") + R(x + w * 0.5 + 6, y + 70, 18, 150, SH, 0.15) +
  P(`M${x + w * 0.82} ${y + 46} C${x + w * 0.82 + 30} ${y + 40} ${x + w * 0.82 + 40} ${y + 70} ${x + w * 0.82 + 20} ${y + 96} L${x + w * 0.82 - 20} ${y + 96} C${x + w * 0.82 - 40} ${y + 70} ${x + w * 0.82 - 30} ${y + 40} ${x + w * 0.82} ${y + 46} Z`, "#e3b23c") + E(x + w * 0.82, y + 96, 40, 9, "#c99a2e");
export const lightSwitch = (x, y) => R(x + 4, y + 6, 44, 70, SH, 0.18, 6) + R(x, y, 44, 70, "#fbf6ea", null, 6) + R(x + 14, y + 18, 16, 34, "#e9e2d2", null, 4) + R(x + 14, y + 18, 16, 14, "#ffffff", null, 4) + R(x + 36, y + 2, 6, 66, SH, 0.08);
