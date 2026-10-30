// Work, city, industry and lab props in the same illustrated style as props.mjs.
import { W, H, rng, f, P, R, C, E, L, G, poly, glow, shadow, fillLin, clip, rrect, blob, form, tone } from "./kit.mjs";
import { windowFrame } from "./props.mjs";

const SH = "#1a1020";
const box = (x, y, w, h) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const flipG = (x, y, s, flip, body) => `<g transform="translate(${f(x)} ${f(y)}) scale(${f(flip ? -s : s)} ${f(s)})">${body}</g>`;

export const cityRow = (x0, x1, base, hmin, hmax, seed, cols, winC = "#eef7fc", winOp = 0.45, k = 1) => {
  const r = rng(seed);
  let s = "", x = x0;
  while (x < x1) {
    const bw = (50 + r() * 80) * k, bh = hmin + r() * (hmax - hmin), c = cols[Math.floor(r() * cols.length)], top = base - bh;
    s += R(x, top, bw, bh + 2, c) + R(x + bw * 0.72, top, bw * 0.28, bh + 2, SH, 0.1) + R(x, top, bw, 4 * k, "#ffffff", 0.22);
    if (r() < 0.4) s += R(x + bw * 0.3, top - 16 * k, bw * 0.3, 16 * k, c) + R(x + bw * 0.44, top - 40 * k, 3 * k, 24 * k, c);
    for (let wy = top + 14 * k; wy < base - 12 * k; wy += 22 * k) for (let wx = x + 8 * k; wx < x + bw - 14 * k; wx += 16 * k) s += R(wx, wy, 8 * k, 11 * k, winC, winOp * (0.6 + r() * 0.4));
    x += bw + (4 + r() * 10) * k;
  }
  return s;
};

export const dayView = (x, y, w, h, seed) => {
  const k = w / 600, b = box(x, y, w, h);
  let s = fillLin(b, [[0, "#8fc4ea"], [1, "#e2f1fa"]]);
  s += P(blob(x + w * 0.24, y + h * 0.2, 70 * k, 20 * k, seed, 8, 0.4), "#ffffff", 0.85) + P(blob(x + w * 0.72, y + h * 0.13, 54 * k, 15 * k, seed + 3, 8, 0.4), "#ffffff", 0.7);
  s += cityRow(x - 20 * k, x + w, y + h, h * 0.3, h * 0.62, seed + 5, ["#b9d0e4", "#c4d8ea"], "#eef7fc", 0.35, k);
  s += cityRow(x - 10 * k, x + w, y + h, h * 0.16, h * 0.4, seed + 9, ["#88a9c6", "#97b5cf", "#7d9fbe"], "#eef7fc", 0.7, k);
  return clip(b, s);
};

export const blinds = (x, y, w, drop, c = "#f1ece2") => {
  let s = R(x - 12, y - 18, w + 24, 20, tone(c, -0.18), null, 4) + R(x - 12, y - 18, w + 24, 5, "#ffffff", 0.4, 3);
  for (let yy = y; yy < y + drop; yy += 16) s += R(x, yy, w, 13, c) + R(x, yy + 10, w, 3, SH, 0.14) + R(x, yy, w, 2, "#ffffff", 0.5);
  s += R(x, y + drop, w, 12, tone(c, -0.1)) + R(x, y + drop + 9, w, 3, SH, 0.2);
  s += L(`M${x + w * 0.18} ${y} L${x + w * 0.18} ${y + drop + 70}`, tone(c, -0.35), 2) + C(x + w * 0.18, y + drop + 76, 6, tone(c, -0.35));
  return s;
};

export const officeWindow = (x, y, w, h, seed, frame = "#eef1f4", drop = 0.3) =>
  R(x - 16, y - 16, w + 32, h + 32, tone(frame, -0.14), null, 4) + dayView(x, y, w, h, seed) + windowFrame(x, y, w, h, frame, 12) + blinds(x, y, w, h * drop) +
  R(x - 30, y + h + 6, w + 60, 22, frame, null, 4) + R(x - 30, y + h + 6, w + 60, 5, "#ffffff", 0.6) + R(x - 20, y + h + 28, w + 40, 10, SH, 0.16);

export const ceilingPanel = (cx, y, w, floorY = 760) =>
  fillLin(poly([[cx - w * 0.5, y + 10], [cx + w * 0.5, y + 10], [cx + w * 1.1, floorY], [cx - w * 1.1, floorY]]), [[0, "#fff8e0", 0.14], [1, "#fff8e0", 0]]) +
  R(cx - w / 2 - 6, y - 4, w + 12, 18, tone("#dfe4ea", -0.15), null, 3) + R(cx - w / 2, y, w, 12, "#fffbea", null, 2) + R(cx - w / 2, y, w, 4, "#ffffff");

export const monitorFront = (cx, base, w, h, c = "#2b3246", chart = true) => {
  const k = w / 580, x = cx - w / 2, top = base - h - w * 0.12, sx = x + w * 0.04, sy = top + h * 0.05, sw = w * 0.92, sh = h * 0.84;
  let s = glow(cx, top + h / 2, w * 0.9, h * 0.9, "#8fd0ff", 0.2);
  s += shadow(cx, base, w * 0.26, 8 * k, 0.4) + P(poly([[cx - w * 0.05, base - 10 * k], [cx + w * 0.05, base - 10 * k], [cx + w * 0.04, top + h], [cx - w * 0.04, top + h]]), c) + R(cx + w * 0.01, top + h, w * 0.03, base - top - h, SH, 0.25);
  s += P(rrect(cx - w * 0.2, base - 14 * k, w * 0.4, 14 * k, 6 * k), c) + R(cx - w * 0.2, base - 14 * k, w * 0.4, 3 * k, "#ffffff", 0.15);
  s += P(rrect(x, top, w, h, 16 * k), "#1a1f2c") + P(rrect(x + 5 * k, top + 5 * k, w - 10 * k, h - 10 * k, 12 * k), c) + R(x + 10 * k, top + 5 * k, w - 20 * k, 4 * k, "#ffffff", 0.14);
  const scr = box(sx, sy, sw, sh);
  let u = fillLin(scr, [[0, "#c7e8ff"], [1, "#8cc6f4"]]) + R(sx, sy, sw, sh * 0.1, "#7fb6e8");
  u += ["#e86a5c", "#f2c230", "#3fb24f"].map((col, i) => C(sx + sw * (0.04 + i * 0.035), sy + sh * 0.05, sh * 0.022, col)).join("");
  u += R(sx + sw * 0.06, sy + sh * 0.17, sw * 0.46, sh * 0.07, "#ffffff", 0.9, 4) + R(sx + sw * 0.06, sy + sh * 0.29, sw * 0.8, sh * 0.035, "#ffffff", 0.6, 3) + R(sx + sw * 0.06, sy + sh * 0.35, sw * 0.66, sh * 0.035, "#ffffff", 0.6, 3);
  const bx = sx + sw * 0.06, by = sy + sh * 0.45, bw = sw * 0.88, bh = sh * 0.46;
  u += R(bx, by, bw, bh, "#ffffff", 0.55, 6);
  if (chart) {
    const v = [0.15, 0.3, 0.24, 0.46, 0.4, 0.6, 0.55, 0.8], pts = v.map((t, i) => [bx + bw * (0.06 + i * 0.125), by + bh * (0.88 - t * 0.75)]);
    u += P(poly([...pts, [pts[7][0], by + bh * 0.9], [pts[0][0], by + bh * 0.9]]), "#3fb24f", 0.16) + L("M" + pts.map(([a, b2]) => `${f(a)} ${f(b2)}`).join(" L"), "#3fb24f", 5 * k) + pts.map(([a, b2]) => C(a, b2, 5 * k, "#2f9a40")).join("");
  } else {
    u += [0.4, 0.7, 0.5, 0.9, 0.6].map((t, i) => R(bx + bw * (0.08 + i * 0.18), by + bh * (0.9 - t * 0.75), bw * 0.1, bh * t * 0.75, ["#3f7fc8", "#e3b23c"][i % 2], 0.85, 3)).join("");
  }
  u += P(poly([[sx, sy], [sx + sw * 0.3, sy], [sx + sw * 0.1, sy + sh], [sx, sy + sh]]), "#ffffff", 0.1);
  return s + clip(scr, u) + C(cx, top + h - 7 * k, 3 * k, "#7fd0ff");
};

export const officeDesk = (x0, x1, top, base, wood = "#c98b55", metal = "#5a6478") => {
  const w = x1 - x0, th = 28;
  let s = shadow((x0 + x1) / 2, base, w * 0.55, 18, 0.35);
  for (const lx of [x0 + 30, x1 - 58]) s += R(lx, top + th, 28, base - top - th, metal) + R(lx + 18, top + th, 10, base - top - th, SH, 0.22) + R(lx + 3, top + th, 4, base - top - th, "#ffffff", 0.2);
  s += R(x0 + 58, top + th, w - 116, (base - top) * 0.42, tone(metal, -0.18)) + R(x0 + 58, top + th, w - 116, 10, SH, 0.25);
  s += P(rrect(x0, top, w, th, 6), wood) + R(x0 + 4, top, w - 8, 6, "#ffffff", 0.28, 3) + R(x0, top + th - 7, w, 7, SH, 0.2) + R(x0 + 6, top + th, w - 12, 10, SH, 0.16);
  return s;
};

export const officeChair = (cx, base, s, c = "#3a4458") => {
  const d = tone(c, -0.3), m = "#8a93a6";
  let b = shadow(0, 0, 120, 14, 0.4);
  for (const [tx, ty] of [[-96, -14], [96, -14], [-52, -6], [52, -6], [0, -10]]) b += L(`M0 -46 L${tx} ${ty}`, d, 14) + C(tx, ty + 2, 11, "#262b38") + C(tx - 3, ty - 1, 4, "#5a6478");
  b += R(-9, -160, 18, 118, m) + R(2, -160, 7, 118, SH, 0.2) + P(rrect(-18, -64, 36, 22, 8), d);
  b += form(rrect(-108, -196, 216, 46, 22), c, `M-108 -168 L108 -168 L108 -150 L-108 -150 Z`, null, 0.25) + R(-90, -194, 180, 6, "#ffffff", 0.18, 3);
  b += L("M-112 -190 L-120 -250 L-80 -252", d, 14) + L("M112 -190 L120 -250 L80 -252", d, 14);
  b += R(-12, -232, 24, 40, d);
  b += form(rrect(-94, -470, 188, 248, 44), c, `M30 -480 L110 -480 L110 -210 L30 -210 Z`, null, 0.22, `M-80 -440 Q-84 -340 -76 -260 L-66 -260 Q-72 -340 -68 -440 Z`) + P(rrect(-70, -440, 140, 180, 30), SH, 0.08);
  return G(cx, base, 0, b, s);
};

export const whiteboard = (x, y, w, h, kind = "chart") => {
  let s = R(x + 12, y + 14, w, h, SH, 0.14, 8) + P(rrect(x - 12, y - 12, w + 24, h + 24, 8), "#c7ccd6") + R(x - 12, y - 12, w + 24, 4, "#ffffff", 0.6, 3) + R(x - 12, y + h + 8, w + 24, 4, SH, 0.2);
  const b = box(x, y, w, h);
  let u = fillLin(b, [[0, "#ffffff"], [1, "#e9eef4"]]) + P(poly([[x + w * 0.55, y], [x + w * 0.7, y], [x + w * 0.45, y + h], [x + w * 0.3, y + h]]), "#ffffff", 0.7);
  if (kind === "chart") {
    const ox = x + w * 0.1, oy = y + h * 0.84, cw = w * 0.82, ch = h * 0.66;
    u += L(`M${ox} ${oy - ch} L${ox} ${oy} L${ox + cw} ${oy}`, "#3a4458", 5);
    for (let i = 1; i < 4; i++) u += L(`M${ox} ${oy - ch * i / 4} L${ox + cw} ${oy - ch * i / 4}`, "#9aa6b8", 2, 0.5);
    const v = [0.15, 0.32, 0.26, 0.5, 0.44, 0.7, 0.86], pts = v.map((t, i) => [ox + cw * (0.06 + i * 0.15), oy - ch * t]);
    u += L("M" + pts.map(([a, b2]) => `${f(a)} ${f(b2)}`).join(" L"), "#3fb24f", 9) + P(`M${f(pts[6][0] - 22)} ${f(pts[6][1] - 2)} L${f(pts[6][0] + 14)} ${f(pts[6][1] - 22)} L${f(pts[6][0] + 4)} ${f(pts[6][1] + 18)} Z`, "#3fb24f");
    u += L(`M${x + w * 0.16} ${y + h * 0.12} L${x + w * 0.44} ${y + h * 0.12} M${x + w * 0.16} ${y + h * 0.2} L${x + w * 0.34} ${y + h * 0.2}`, "#3f7fc8", 5, 0.8);
  } else {
    const cx = x + w * 0.72, cy = y + h * 0.42, r = Math.min(w, h) * 0.22;
    for (const a of [0, 60, 120]) u += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r)}" ry="${f(r * 0.36)}" transform="rotate(${a} ${f(cx)} ${f(cy)})" fill="none" stroke="#3f7fc8" stroke-width="5"/>`;
    u += C(cx, cy, r * 0.16, "#d8463a");
    for (let i = 0; i < 5; i++) {
      const yy = y + h * (0.16 + i * 0.15), r2 = rng(30 + i);
      let d = `M${x + w * 0.08} ${yy}`;
      for (let j = 1; j < 10; j++) d += ` Q${f(x + w * (0.08 + j * 0.04 - 0.02))} ${f(yy - 14 - r2() * 12)} ${f(x + w * (0.08 + j * 0.04))} ${f(yy + (r2() - 0.5) * 8)}`;
      u += L(d, i === 2 ? "#d8463a" : "#3a4458", 4, 0.75);
    }
  }
  s += clip(b, u);
  s += R(x + w * 0.1, y + h + 12, w * 0.8, 12, "#aeb4c0", null, 3) + R(x + w * 0.1, y + h + 12, w * 0.8, 3, "#ffffff", 0.5);
  for (const [i, c] of [[0, "#d8463a"], [1, "#3f7fc8"], [2, "#262b38"]]) s += P(rrect(x + w * 0.2 + i * 46, y + h + 2, 38, 11, 5), c) + R(x + w * 0.2 + i * 46 + 26, y + h + 2, 12, 11, "#eef1f4", null, 3);
  return s;
};

export const filingCabinet = (x, base, w, h, c = "#9aa6b8") => {
  let s = shadow(x + w / 2, base, w * 0.7, 12, 0.4) + form(rrect(x, base - h, w, h, 6), c, `M${x + w * 0.86} ${base - h} L${x + w} ${base - h} L${x + w} ${base} L${x + w * 0.86} ${base} Z`, null, 0.22) + R(x, base - h, w, 6, "#ffffff", 0.3, 3);
  const n = 3, dh = (h - 30) / n;
  for (let i = 0; i < n; i++) {
    const yy = base - h + 14 + i * dh;
    s += P(rrect(x + 10, yy, w - 20, dh - 10, 5), tone(c, 0.08)) + R(x + 10, yy + dh - 14, w - 20, 4, SH, 0.18) + R(x + 10, yy, w - 20, 3, "#ffffff", 0.35);
    s += P(rrect(x + w / 2 - 34, yy + dh * 0.42, 68, 14, 7), tone(c, -0.35)) + R(x + w / 2 - 30, yy + dh * 0.42 + 2, 60, 3, "#ffffff", 0.3) + R(x + w / 2 - 22, yy + dh * 0.16, 44, 20, "#fbf6ea", null, 2);
  }
  return s;
};

export const waterCooler = (cx, base, s) => {
  let b = shadow(0, 0, 70, 10, 0.4) + form(rrect(-56, -270, 112, 270, 12), "#e8ecf0", "M30 -280 L60 -280 L60 0 L30 0 Z", null, 0.2) + R(-56, -270, 112, 8, "#ffffff", 0.5, 4);
  b += P(rrect(-40, -200, 80, 60, 8), tone("#e8ecf0", -0.12)) + R(-28, -172, 12, 20, "#d8463a", null, 3) + R(16, -172, 12, 20, "#3f7fc8", null, 3) + R(-36, -110, 72, 6, "#9aa6b8", null, 3);
  const bottle = "M-46 -276 Q-50 -380 -40 -420 Q-30 -440 -16 -444 L-16 -470 L16 -470 L16 -444 Q30 -440 40 -420 Q50 -380 46 -276 Z";
  b += P(bottle, "#bfe4f6", 0.85) + clip(bottle, R(-60, -400, 120, 130, "#7cc4ea", 0.8) + E(0, -400, 60, 8, "#a8daf2") + R(-60, -360, 120, 6, "#ffffff", 0.25) + R(-60, -320, 120, 6, "#ffffff", 0.25) + R(18, -470, 40, 200, SH, 0.1)) + L("M-34 -296 Q-40 -360 -30 -408", "#ffffff", 6, 0.6) + R(-18, -480, 36, 14, "#3f7fc8", null, 4);
  return G(cx, base, 0, b, s);
};

export const serverRack = (x, top, w, h, seed, c = "#2a3644") => {
  const r = rng(seed);
  let s = shadow(x + w / 2, top + h, w * 0.62, 16, 0.5) + form(rrect(x, top, w, h, 8), c, `M${x + w * 0.9} ${top} L${x + w} ${top} L${x + w} ${top + h} L${x + w * 0.9} ${top + h} Z`, null, 0.25) + R(x, top, w, 10, tone(c, 0.2), null, 4);
  s += R(x + 14, top + 22, w - 28, h - 50, "#161d26");
  for (let u = top + 32; u < top + h - 66; u += 44) {
    s += P(rrect(x + 22, u, w - 44, 36, 4), tone("#344456", r() * 0.1)) + R(x + 22, u, w - 44, 3, "#ffffff", 0.12) + R(x + 22, u + 32, w - 44, 4, SH, 0.3);
    for (let v = 0; v < 6; v++) s += R(x + 34 + v * 10, u + 10, 5, 16, "#1f2833");
    s += R(x + 104, u + 13, (w - 200) * (0.3 + r() * 0.6), 9, "#4a5d73", null, 3);
    for (let k = 0; k < 3; k++) {
      const on = r(), col = on > 0.55 ? "#4fe07a" : on > 0.35 ? "#f39a1e" : "#24303c", lx = x + w - 46 - k * 18, ly = u + 18;
      s += (on > 0.35 ? glow(lx, ly, 16, 16, col, 0.6) : "") + C(lx, ly, 5, col) + (on > 0.35 ? C(lx - 1.5, ly - 1.5, 1.8, "#ffffff", 0.8) : "");
    }
  }
  s += R(x + w - 30, top + h * 0.4, 8, 90, tone(c, 0.25), null, 4) + R(x + 18, top + h - 26, w - 36, 12, "#1f2833");
  s += glow(x + w / 2, top + h + 4, w * 0.5, 14, "#6fb8ff", 0.25);
  return s;
};

export const cableTray = (x0, x1, y, seed) => {
  const r = rng(seed);
  let s = R(x0, y, x1 - x0, 16, "#55657a") + R(x0, y, x1 - x0, 4, "#ffffff", 0.18) + R(x0, y + 12, x1 - x0, 4, SH, 0.3);
  for (let x = x0 + 40; x < x1; x += 260) s += R(x, 0, 8, y, "#4a5a6c") + R(x + 5, 0, 3, y, SH, 0.2);
  const cols = ["#f39a1e", "#3f7fc8", "#d8463a", "#4fb36a", "#e3b23c"];
  for (let i = 0; i < 7; i++) {
    const a = x0 + r() * (x1 - x0) * 0.7, b2 = a + 120 + r() * 300, sag = 20 + r() * 60;
    s += L(`M${f(a)} ${y + 14} Q${f((a + b2) / 2)} ${f(y + 14 + sag)} ${f(b2)} ${y + 14}`, cols[i % 5], 5, 0.85);
  }
  return s;
};

export const perspFloor = (y0, colA, colB, lineC, vx = 960, n = 9, m = 13) => {
  let s = fillLin(box(0, y0, W, H - y0), [[0, colA], [1, colB]]);
  for (let k = 1; k <= n; k++) { const t = Math.pow(k / n, 1.7), y = y0 + (H - y0) * t; s += R(0, y - 1.5, W, 3, lineC, 0.5 + 0.4 * t); }
  for (let i = -m; i <= m; i++) s += L(`M${f(vx + i * 150)} ${y0} L${f(vx + i * 520)} ${H}`, lineC, 3, 0.55);
  return s + R(0, y0, W, 4, "#ffffff", 0.12);
};

export const shopBuilding = (x, base, w, h, seed, wall, awning = "#d8463a", trim = "#f4eee2") => {
  const r = rng(seed), top = base - h;
  let s = form(box(x, top, w, h), wall, box(x + w * 0.9, top, w * 0.1, h), null, 0.16) + R(x, top, w, h, SH, 0.03);
  for (let yy = top + 40; yy < base - 210; yy += 44) s += R(x, yy, w, 2, tone(wall, -0.12), 0.6);
  s += R(x - 10, top - 4, w + 20, 22, tone(wall, -0.22)) + R(x - 10, top - 4, w + 20, 5, "#ffffff", 0.25) + R(x - 6, top + 18, w + 12, 8, SH, 0.18);
  const cols = Math.max(2, Math.floor(w / 110)), gap = w / cols;
  for (let wy = top + 56; wy < base - 300; wy += 120) for (let i = 0; i < cols; i++) {
    const wx = x + gap * i + gap / 2 - 30;
    s += R(wx - 6, wy - 6, 72, 92, trim) + fillLin(box(wx, wy, 60, 80), [[0, "#bfe0f4"], [1, "#8fbfdf"]]) + P(poly([[wx, wy + 50], [wx + 30, wy], [wx + 44, wy], [wx, wy + 74]]), "#ffffff", 0.25) + R(wx + 27, wy, 6, 80, trim) + R(wx, wy, 60, 6, SH, 0.2);
    s += R(wx - 12, wy + 84, 84, 10, trim) + R(wx - 10, wy + 94, 80, 5, SH, 0.18);
    if (r() < 0.3) s += R(wx - 4, wy + 66, 68, 18, "#a8703f") + P(blob(wx + 30, wy + 62, 36, 12, seed + i, 8, 0.4), "#4f9b5a") + C(wx + 12, wy + 58, 5, "#e86a5c") + C(wx + 44, wy + 56, 5, "#f2c230");
  }
  const gy = base - 220, sw = w - 40;
  s += R(x + 20, gy - 50, sw, 44, tone(wall, -0.4), null, 4) + R(x + 40, gy - 36, sw * 0.4, 14, "#fbf6ea", 0.85, 4) + R(x + 40 + sw * 0.45, gy - 36, sw * 0.2, 14, "#fbf6ea", 0.5, 4);
  s += R(x + 20, gy, sw, 220, tone(wall, -0.25)) + fillLin(box(x + 34, gy + 50, sw * 0.62, 150), [[0, "#d6ecf8"], [1, "#a8cfe6"]]) + P(poly([[x + 34, gy + 160], [x + 34 + sw * 0.25, gy + 50], [x + 34 + sw * 0.34, gy + 50], [x + 34, gy + 196]]), "#ffffff", 0.3);
  s += R(x + 34, gy + 186, sw * 0.62, 14, tone(wall, -0.4));
  const dx = x + 54 + sw * 0.62;
  s += R(dx, gy + 40, sw * 0.38 - 34, 180, tone(awning, -0.45)) + R(dx + 10, gy + 54, sw * 0.38 - 54, 90, "#bfe0f4", 0.8) + C(dx + sw * 0.38 - 54, gy + 150, 6, "#e3b23c");
  const aw = `M${x + 10} ${gy} L${x + w - 10} ${gy} L${x + w + 10} ${gy + 54} L${x - 10} ${gy + 54} Z`;
  let st = "";
  for (let k = 0; k < 40; k++) st += R(x - 10 + k * 32, gy - 2, 16, 70, "#fbf6ea");
  s += shadow(x + w / 2, gy + 70, w * 0.5, 20, 0.3) + P(aw, awning) + clip(aw, st + R(x - 10, gy + 40, w + 20, 14, SH, 0.15));
  for (let k = 0; k < w + 20; k += 32) s += P(`M${f(x - 10 + k)} ${gy + 54} Q${f(x - 10 + k + 16)} ${gy + 74} ${f(x - 10 + k + 32)} ${gy + 54} Z`, Math.floor(k / 32) % 2 ? "#fbf6ea" : awning);
  return s;
};

export const car = (cx, base, s, c = "#3f7fc8", flip = false) => {
  const body = "M-180 -34 L-180 -80 Q-178 -100 -150 -104 L-92 -110 L-52 -162 Q-42 -172 -20 -172 L66 -172 Q88 -172 102 -158 L140 -112 L170 -106 Q188 -100 188 -80 L188 -34 Q188 -22 176 -22 L-168 -22 Q-180 -22 -180 -34 Z";
  let b = shadow(0, -4, 210, 16, 0.45) + C(-110, -30, 46, tone(c, -0.45)) + C(116, -30, 46, tone(c, -0.45));
  b += P(body, c) + clip(body, R(-200, -64, 400, 50, SH, 0.18) + R(-200, -112, 400, 8, "#ffffff", 0.18) + R(150, -180, 60, 180, SH, 0.1));
  b += P("M-82 -114 L-46 -158 L10 -158 L10 -114 Z", "#cfe6f4") + P("M22 -114 L22 -158 L64 -158 Q78 -158 88 -148 L120 -114 Z", "#b9dcef") + P("M-70 -118 L-50 -144 L-34 -144 L-58 -118 Z", "#ffffff", 0.5) + P("M30 -118 L44 -150 L56 -150 L42 -118 Z", "#ffffff", 0.4);
  b += L("M16 -110 L16 -36", tone(c, -0.3), 3) + R(30, -92, 22, 6, tone(c, -0.35), null, 3) + R(-60, -92, 22, 6, tone(c, -0.35), null, 3);
  b += P(rrect(172, -96, 16, 16, 5), "#fff3c4") + R(-184, -94, 10, 18, "#e04a3a", null, 3) + R(-184, -48, 372, 12, tone(c, -0.5), null, 5) + R(-184, -48, 372, 3, "#ffffff", 0.2);
  for (const wx of [-110, 116]) b += C(wx, -30, 34, "#262b38") + C(wx, -30, 18, "#c9ccd6") + C(wx, -30, 7, "#5a6478") + C(wx - 5, -35, 4, "#ffffff", 0.6);
  return flipG(cx, base, s, flip, b);
};

export const bench = (cx, base, s, wood = "#b5703f", metal = "#3a4458") => {
  let b = shadow(0, 0, 150, 12, 0.4);
  for (const lx of [-110, 96]) b += R(lx, -96, 14, 96, metal) + R(lx - 10, -4, 34, 6, metal, null, 3);
  for (let i = 0; i < 3; i++) b += P(rrect(-140, -100 + i * 14 - 0, 280, 11, 4), i % 2 ? tone(wood, -0.08) : wood) + R(-140, -100 + i * 14 + 8, 280, 3, SH, 0.2);
  b += L("M-116 -96 L-124 -190 M102 -96 L110 -190", metal, 12);
  for (let i = 0; i < 3; i++) b += P(rrect(-144, -196 + i * 26, 288, 18, 5), wood) + R(-144, -196 + i * 26, 288, 4, "#ffffff", 0.22, 2) + R(-144, -196 + i * 26 + 14, 288, 4, SH, 0.2);
  return G(cx, base, 0, b, s);
};

export const trafficLight = (x, base, h = 330, c = "#2e3448") => {
  const t = base - h;
  let s = shadow(x, base, 30, 6, 0.4) + R(x - 7, t + 100, 14, h - 100, c) + R(x + 2, t + 100, 5, h - 100, SH, 0.25) + P(rrect(x - 16, base - 12, 32, 12, 4), c);
  s += P(rrect(x - 30, t, 60, 150, 14), c) + R(x + 12, t + 6, 14, 138, SH, 0.2);
  for (const [i, col, on] of [[0, "#e04a3a", false], [1, "#f2c230", false], [2, "#3fd06a", true]]) {
    const cy = t + 28 + i * 47;
    s += P(`M${x - 24} ${cy - 18} Q${x} ${cy - 30} ${x + 24} ${cy - 18} L${x + 24} ${cy - 10} L${x - 24} ${cy - 10} Z`, tone(c, -0.3)) + C(x, cy, 16, on ? col : tone(col, -0.55)) + (on ? glow(x, cy, 50, 50, col, 0.45) + C(x - 5, cy - 5, 5, "#ffffff", 0.7) : "");
  }
  return s;
};

export const dayLamp = (x, base, h = 330, c = "#3c4b66") => {
  const t = base - h;
  return shadow(x, base + 2, 30, 6, 0.4) + P(`M${x - 16} ${base} Q${x - 14} ${base - 20} ${x - 6} ${base - 28} L${x - 5} ${t} L${x + 5} ${t} L${x + 6} ${base - 28} Q${x + 14} ${base - 20} ${x + 16} ${base} Z`, c) + R(x + 1, t, 3, h - 30, "#ffffff", 0.15) +
    L(`M${x} ${t + 6} Q${x} ${t - 30} ${x + 50} ${t - 30} L${x + 70} ${t - 30}`, c, 10) + P(`M${x + 50} ${t - 36} L${x + 120} ${t - 36} Q${x + 124} ${t - 18} ${x + 110} ${t - 14} L${x + 60} ${t - 14} Q${x + 46} ${t - 18} ${x + 50} ${t - 36} Z`, c) + R(x + 60, t - 18, 50, 6, "#fff3c4", 0.9, 3);
};

export const hydrant = (cx, base, s, c = "#d8463a") => {
  const b = shadow(0, 0, 40, 6, 0.4) + P(rrect(-30, -12, 60, 12, 4), tone(c, -0.3)) + form("M-22 -12 L-22 -80 Q-22 -104 0 -106 Q22 -104 22 -80 L22 -12 Z", c, "M6 -110 L26 -110 L26 -12 L6 -12 Z", null, 0.22) +
    P(rrect(-38, -78, 76, 18, 8), c) + R(-38, -66, 76, 6, SH, 0.2) + C(0, -110, 8, tone(c, -0.3)) + R(-26, -92, 52, 6, tone(c, 0.2)) + L("M-14 -90 L-14 -20", "#ffffff", 4, 0.3);
  return G(cx, base, 0, b, s);
};

export const truss = (x0, x1, y, h, c = "#f2c230") => {
  let s = R(x0, y + h + 4, x1 - x0, 16, SH, 0.14);
  for (let x = x0; x < x1; x += h) s += L(`M${x} ${y + 10} L${x + h / 2} ${y + h - 10} L${x + h} ${y + 10}`, tone(c, -0.3), 13) + L(`M${x} ${y + 10} L${x + h / 2} ${y + h - 10} L${x + h} ${y + 10}`, c, 8) + L(`M${x - 2} ${y + 10} L${x + h / 2 - 2} ${y + h - 10}`, "#ffffff", 2, 0.3);
  for (const yy of [y, y + h - 20]) s += R(x0, yy, x1 - x0, 20, c) + R(x0, yy + 14, x1 - x0, 6, SH, 0.22) + R(x0, yy, x1 - x0, 4, "#ffffff", 0.4);
  for (let x = x0; x < x1; x += h) s += C(x, y + 10, 5, tone(c, -0.35)) + C(x + h / 2, y + h - 10, 5, tone(c, -0.35));
  return s;
};

export const industrialLamp = (cx, y, s, floorY, c = "#3c4b66") =>
  fillLin(poly([[cx - 44 * s, y + 42 * s], [cx + 44 * s, y + 42 * s], [cx + 300 * s, floorY], [cx - 300 * s, floorY]]), [[0, "#fff6d0", 0.24], [1, "#fff6d0", 0]]) +
  glow(cx, floorY, 280 * s, 40 * s, "#fff6d0", 0.3) + glow(cx, y + 40 * s, 120 * s, 70 * s, "#fff6d0", 0.4) +
  R(cx - 2, 0, 4, y - 30 * s, "#2c3440") + R(cx - 10 * s, y - 34 * s, 20 * s, 14 * s, c, null, 3) +
  P(`M${cx - 70 * s} ${y + 40 * s} Q${cx - 60 * s} ${y - 20 * s} ${cx} ${y - 22 * s} Q${cx + 60 * s} ${y - 20 * s} ${cx + 70 * s} ${y + 40 * s} Z`, c) + P(`M${cx + 20 * s} ${y - 20 * s} Q${cx + 60 * s} ${y - 18 * s} ${cx + 70 * s} ${y + 40 * s} L${cx + 30 * s} ${y + 40 * s} Z`, SH, 0.2) +
  P(`M${cx - 54 * s} ${y - 2 * s} Q${cx - 40 * s} ${y - 18 * s} ${cx - 16 * s} ${y - 20 * s}`, "none") + L(`M${cx - 54 * s} ${y + 8 * s} Q${cx - 46 * s} ${y - 12 * s} ${cx - 20 * s} ${y - 16 * s}`, "#ffffff", 4 * s, 0.25) +
  E(cx, y + 40 * s, 70 * s, 10 * s, tone(c, -0.3)) + E(cx, y + 42 * s, 34 * s, 10 * s, "#fffbe8");

export const hazard = (x, y, w, h) => {
  let st = "";
  for (let k = -h; k < w + h; k += h * 1.4) st += P(poly([[x + k, y + h], [x + k + h * 0.7, y + h], [x + k + h * 1.4, y], [x + k + h * 0.7, y]]), "#262b38");
  return R(x, y, w, h, "#f2c230") + clip(box(x, y, w, h), st) + R(x, y, w, 3, "#ffffff", 0.3);
};

export const machine = (x, base, w, h, c = "#5f7389") => {
  const top = base - h;
  let s = L(`M${x + w * 0.2} ${top} L${x + w * 0.2} ${top - 120} Q${x + w * 0.2} ${top - 160} ${x + w * 0.2 + 40} ${top - 160} L${x + w * 0.6} ${top - 160}`, tone(c, -0.25), 30) + L(`M${x + w * 0.2 - 8} ${top} L${x + w * 0.2 - 8} ${top - 120}`, "#ffffff", 4, 0.2) + R(x + w * 0.2 - 22, top - 60, 44, 16, tone(c, -0.4), null, 4);
  s += L(`M${x + w * 0.82} ${top} L${x + w * 0.82} ${top - 70}`, tone(c, -0.15), 22) + R(x + w * 0.82 - 18, top - 76, 36, 14, tone(c, -0.4), null, 4);
  s += shadow(x + w / 2, base, w * 0.6, 20, 0.45) + form(rrect(x, top, w, h, 10), c, box(x + w * 0.88, top, w * 0.12, h), null, 0.25) + R(x, top, w, 12, tone(c, 0.18), null, 6);
  s += P(rrect(x + w * 0.07, top + h * 0.1, w * 0.42, h * 0.32, 10), tone(c, -0.4)) + fillLin(box(x + w * 0.1, top + h * 0.14, w * 0.36, h * 0.2), [[0, "#7fe0a0"], [1, "#3fb07a"]]);
  s += L(`M${x + w * 0.12} ${top + h * 0.26} Q${x + w * 0.17} ${top + h * 0.16} ${x + w * 0.22} ${top + h * 0.26} T${x + w * 0.32} ${top + h * 0.26} T${x + w * 0.42} ${top + h * 0.26}`, "#eafff0", 4, 0.9);
  for (const [i, col] of [[0, "#d8463a"], [1, "#f2c230"], [2, "#3fb24f"]]) s += C(x + w * (0.14 + i * 0.12), top + h * 0.37, 12, tone(col, -0.3)) + C(x + w * (0.14 + i * 0.12), top + h * 0.367, 10, col) + C(x + w * (0.14 + i * 0.12) - 3, top + h * 0.36, 3, "#ffffff", 0.6);
  const gx = x + w * 0.72, gy = top + h * 0.26, gr = w * 0.12;
  s += C(gx, gy + 4, gr + 10, SH, 0.2) + C(gx, gy, gr + 10, tone(c, -0.35)) + C(gx, gy, gr, "#f4f6f8") + `<path d="M${f(gx - gr * 0.8)} ${f(gy + gr * 0.3)} A${f(gr * 0.85)} ${f(gr * 0.85)} 0 0 1 ${f(gx + gr * 0.8)} ${f(gy + gr * 0.3)}" fill="none" stroke="#d8463a" stroke-width="6" stroke-dasharray="${f(gr * 0.3)} ${f(gr * 0.12)}"/>` + L(`M${gx} ${gy} L${f(gx + gr * 0.55)} ${f(gy - gr * 0.5)}`, "#262b38", 5) + C(gx, gy, 7, "#262b38");
  for (let k = 0; k < 6; k++) s += P(rrect(x + w * 0.08 + k * w * 0.14, top + h * 0.55, w * 0.1, h * 0.24, 4), tone(c, -0.2)) + R(x + w * 0.08 + k * w * 0.14, top + h * 0.55, w * 0.1, 4, "#ffffff", 0.15);
  return s + hazard(x, base - h * 0.12, w, h * 0.06);
};

export const crate = (x, base, s, c = "#c98b55") => {
  const w = 130, h = 100, d = 26;
  const b = shadow(w / 2 + 10, 0, w * 0.65, 10, 0.4) + R(0, -h, w, h, c) + R(0, -h, w, h * 0.3, "#ffffff", 0.06) +
    P(poly([[0, -h], [w, -h], [w + d, -h - 18], [d, -h - 18]]), tone(c, 0.2)) + P(poly([[w, -h], [w + d, -h - 18], [w + d, -18], [w, 0]]), tone(c, -0.22)) +
    R(w * 0.42, -h, w * 0.16, h * 0.5, tone(c, 0.14)) + P(poly([[w * 0.42, -h], [w * 0.58, -h], [w * 0.58 + d, -h - 18], [w * 0.42 + d, -h - 18]]), tone(c, 0.3)) +
    R(14, -h * 0.42, 40, 26, "#fbf6ea", 0.9, 2) + L(`M20 ${-h * 0.42 + 9} L46 ${-h * 0.42 + 9} M20 ${-h * 0.42 + 17} L40 ${-h * 0.42 + 17}`, "#9a8a7a", 2) + R(0, -6, w, 6, SH, 0.15);
  return G(x, base, 0, b, s);
};

export const barrel = (cx, base, s, c = "#3f7fc8") => {
  const body = "M-60 0 Q-70 -80 -60 -160 L60 -160 Q70 -80 60 0 Z";
  const b = shadow(0, 0, 76, 10, 0.45) + P(body, c) + clip(body, R(22, -170, 50, 180, SH, 0.22) + R(-50, -170, 16, 180, "#ffffff", 0.18) + R(-80, -128, 160, 10, tone(c, -0.3)) + R(-80, -42, 160, 10, tone(c, -0.3)) + R(-80, -128, 160, 3, "#ffffff", 0.2) + R(-80, -42, 160, 3, "#ffffff", 0.2)) +
    E(0, -160, 60, 12, tone(c, 0.15)) + E(0, -160, 50, 9, tone(c, -0.15)) + C(26, -162, 6, tone(c, -0.4)) + R(-30, -100, 44, 40, "#fbf6ea", 0.85, 3) + P(poly([[-8, -94], [6, -70], [-22, -70]]), "#f2c230");
  return G(cx, base, 0, b, s);
};

export const conveyor = (x0, x1, y, c = "#2c3440") => {
  let s = shadow((x0 + x1) / 2, y + 120, (x1 - x0) * 0.5, 16, 0.3);
  for (let x = x0 + 60; x < x1; x += 300) s += R(x, y + 40, 18, 90, "#4d5f73") + R(x + 12, y + 40, 6, 90, SH, 0.25) + R(x - 10, y + 124, 38, 8, "#3c4b66", null, 3);
  s += R(x0, y + 20, x1 - x0, 30, "#4d5f73") + R(x0, y + 44, x1 - x0, 6, SH, 0.25);
  for (let x = x0 + 20; x < x1; x += 60) s += C(x, y + 34, 12, "#9aa6b2") + C(x, y + 34, 4, "#3c4b66");
  s += R(x0, y, x1 - x0, 22, c, null, 4) + R(x0, y, x1 - x0, 4, "#ffffff", 0.18);
  for (let x = x0 + 30; x < x1; x += 40) s += R(x, y + 6, 18, 3, "#ffffff", 0.08);
  return s;
};

export const flask = (cx, base, s, liq = "#4fb3d9") => {
  const g = "M-18 -150 L-18 -96 L-70 -12 Q-76 0 -62 0 L62 0 Q76 0 70 -12 L18 -96 L18 -150 Z";
  const b = shadow(0, 0, 70, 7, 0.35) + P(g, "#eaf6fa", 0.55) + clip(g, P("M-90 -46 Q0 -54 90 -46 L90 10 L-90 10 Z", liq, 0.9) + E(0, -48, 60, 6, tone(liq, 0.3)) + R(20, -160, 60, 170, SH, 0.08) + C(-12, -24, 6, "#ffffff", 0.6) + C(8, -34, 4, "#ffffff", 0.5) + C(-24, -12, 3, "#ffffff", 0.5)) +
    L("M-10 -140 L-10 -96 L-54 -24", "#ffffff", 5, 0.6) + P(rrect(-24, -160, 48, 12, 5), "#eaf6fa") + R(-24, -160, 48, 4, "#ffffff", 0.7);
  return G(cx, base, 0, b, s);
};

export const beaker = (cx, base, s, liq = "#7bd17f") => {
  const g = "M-46 -120 L-54 -128 L50 -128 L46 -120 L44 -10 Q44 0 34 0 L-34 0 Q-44 0 -44 -10 Z";
  const b = shadow(0, 0, 54, 6, 0.35) + P(g, "#eaf6fa", 0.55) + clip(g, R(-60, -60, 120, 70, liq, 0.88) + E(0, -60, 46, 5, tone(liq, 0.3)) + R(18, -130, 40, 140, SH, 0.08)) +
    L("M-30 -110 L-30 -20", "#ffffff", 5, 0.55) + L("M20 -100 L36 -100 M26 -80 L36 -80 M20 -60 L36 -60 M26 -40 L36 -40", "#9fb6c2", 3, 0.8);
  return G(cx, base, 0, b, s);
};

export const testTubes = (x, base, s, cols = ["#d8463a", "#f39a1e", "#4fb3d9", "#7bd17f", "#7a5bb5"]) => {
  let b = shadow(110, 0, 130, 8, 0.4) + P(rrect(0, -14, 220, 14, 4), "#c98b55") + R(0, -14, 220, 4, "#ffffff", 0.25);
  cols.forEach((c, i) => {
    const tx = 24 + i * 42, tube = `M${tx - 12} -150 L${tx + 12} -150 L${tx + 12} -40 Q${tx + 12} -26 ${tx} -26 Q${tx - 12} -26 ${tx - 12} -40 Z`;
    b += P(tube, "#eaf6fa", 0.6) + clip(tube, R(tx - 14, -60 - i * 12 % 30, 28, 60, c, 0.9)) + L(`M${tx - 6} -140 L${tx - 6} -46`, "#ffffff", 3, 0.6) + R(tx - 14, -154, 28, 6, "#eaf6fa");
  });
  b += R(-4, -96, 228, 14, "#c98b55", null, 4) + R(-4, -96, 228, 4, "#ffffff", 0.25) + R(-4, -86, 228, 4, SH, 0.2) + R(4, -96, 10, 82, "#a8703f") + R(206, -96, 10, 82, "#a8703f");
  return G(x, base, 0, b, s);
};

export const microscope = (cx, base, s, c = "#eef2f4", d = "#3c4b66") => {
  const b = shadow(0, 0, 110, 10, 0.4) + P(rrect(-90, -30, 180, 30, 10), d) + R(-90, -30, 180, 5, "#ffffff", 0.2, 4) +
    L("M40 -30 Q90 -120 50 -220", c, 34) + L("M30 -40 Q76 -120 40 -210", "#ffffff", 6, 0.4) + L("M54 -30 Q104 -120 64 -220", SH, 6, 0.15) +
    P(rrect(-70, -110, 120, 16, 4), d) + R(-70, -110, 120, 4, "#ffffff", 0.2) + C(70, -120, 20, d) + C(70, -120, 8, c) +
    G(10, -230, -28, P(rrect(-22, -10, 44, 120, 10), c) + R(8, -10, 14, 120, SH, 0.15) + P(rrect(-28, 96, 56, 24, 6), d) + P(rrect(-16, -60, 32, 56, 6), d) + R(-16, -60, 32, 8, "#ffffff", 0.2)) +
    C(-8, -86, 9, "#7fd0ff", 0.8);
  return G(cx, base, 0, b, s);
};

export const labBench = (x0, x1, top, base, c = "#eef2f4", topC = "#3c4b66") => {
  const w = x1 - x0;
  let s = shadow((x0 + x1) / 2, base, w * 0.55, 18, 0.35) + R(x0 + 14, top + 26, w - 28, base - top - 26, c) + R(x0 + 14, base - 24, w - 28, 24, tone(c, -0.35));
  const n = Math.max(2, Math.round(w / 210)), dw = (w - 40) / n;
  for (let i = 0; i < n; i++) {
    const dx = x0 + 20 + i * dw;
    s += P(rrect(dx + 6, top + 42, dw - 12, base - top - 80, 6), tone(c, -0.06)) + R(dx + 6, top + 42, dw - 12, 4, "#ffffff", 0.6) + R(dx + dw - 14, top + 42, 8, base - top - 80, SH, 0.08) + P(rrect(dx + dw / 2 - 30, top + 60, 60, 12, 6), "#9aa6b2");
  }
  s += P(rrect(x0, top, w, 28, 6), topC) + R(x0 + 4, top, w - 8, 5, "#ffffff", 0.2, 3) + R(x0 + 14, top + 28, w - 28, 12, SH, 0.22);
  return s;
};

export const periodicPoster = (x, y, w, h, seed) => {
  const r = rng(seed), cols = ["#f2a07a", "#9fc8e0", "#f2d07a", "#a8d8a0", "#d0b0e0"];
  let s = R(x + 8, y + 10, w, h, SH, 0.14) + R(x, y, w, h, "#fbf6ea") + R(x + w * 0.08, y + h * 0.07, w * 0.5, h * 0.06, "#3a4458", 0.8, 3);
  const cw = (w * 0.86) / 12, ch = cw * 1.1;
  for (let j = 0; j < 6; j++) for (let i = 0; i < 12; i++) {
    if (j === 0 && i > 0 && i < 11) continue;
    if (j < 3 && i > 1 && i < 6 && j > 0) continue;
    s += R(x + w * 0.07 + i * cw, y + h * 0.2 + j * ch, cw - 3, ch - 3, cols[Math.floor(r() * cols.length)], null, 2);
  }
  return s;
};

export const sofa = (x, base, w, c = "#d9763a", pillow = "#f2c230") => {
  const d = tone(c, -0.25);
  let s = shadow(x + w / 2, base, w * 0.55, 16, 0.4);
  for (const lx of [x + 30, x + w - 46]) s += R(lx, base - 22, 16, 22, "#5a3a2a", null, 3);
  s += form(rrect(x + 40, base - 250, w - 80, 170, 30), d, box(x + 40, base - 140, w - 80, 60), null, 0.2);
  const n = 2, cw = (w - 120) / n;
  for (let i = 0; i < n; i++) s += form(rrect(x + 60 + i * cw, base - 236, cw - 8, 140, 26), c, box(x + 60 + i * cw, base - 130, cw, 40), null, 0.16) + R(x + 74 + i * cw, base - 232, cw - 36, 6, "#ffffff", 0.2, 3);
  for (let i = 0; i < n; i++) s += form(rrect(x + 50 + i * cw, base - 120, cw + 2, 60, 20), c, box(x + 50 + i * cw, base - 84, cw + 2, 30), null, 0.2) + R(x + 64 + i * cw, base - 118, cw - 26, 5, "#ffffff", 0.25, 3);
  s += P(rrect(x + 40, base - 70, w - 80, 50, 12), d);
  for (const [ax, sh] of [[x, 0.1], [x + w - 80, 0.22]]) s += form(rrect(ax, base - 170, 80, 150, 30), c, box(ax + 50, base - 180, 40, 170), null, sh) + R(ax + 10, base - 166, 60, 6, "#ffffff", 0.22, 3);
  s += G(x + 130, base - 150, -14, form(rrect(-50, -46, 100, 92, 24), pillow, box(10, -50, 50, 100), null, 0.2)) + G(x + w - 140, base - 150, 12, form(rrect(-46, -42, 92, 84, 22), tone(pillow, -0.05), box(10, -50, 50, 100), null, 0.2));
  return s;
};

export const doorFront = (x, base, w, h, c = "#7d5d45", frame = "#eef1f4") => {
  const top = base - h;
  let s = R(x - 26, top - 26, w + 52, h + 26, frame) + R(x - 26, top - 26, w + 52, 6, "#ffffff", 0.5) + R(x + w + 14, top - 20, 12, h + 20, SH, 0.12);
  s += R(x, top, w, h, c) + R(x, top, w, 10, SH, 0.25) + R(x + w - 18, top, 18, h, SH, 0.12);
  for (const [py, ph] of [[top + 30, h * 0.4], [top + h * 0.5, h * 0.44]]) s += P(rrect(x + 26, py, w - 52, ph, 4), tone(c, -0.14)) + R(x + 26, py, w - 52, 5, SH, 0.2) + R(x + 26, py + ph - 4, w - 52, 4, "#ffffff", 0.18) + R(x + 34, py + 8, w - 68, ph - 16, tone(c, 0.05));
  s += C(x + w - 40, top + h * 0.5, 13, "#d9b25f") + C(x + w - 43, top + h * 0.5 - 3, 4, "#f6e2a8") + P(rrect(x + w - 46, top + h * 0.5 + 16, 12, 24, 4), "#c9a052");
  return s;
};

export const floorLamp = (cx, base, s, shade = "#f2e2c0", c = "#3a3348") => {
  const b = glow(0, -420, 260, 220, "#ffdc96", 0.3) + glow(0, 0, 140, 22, "#ffdc96", 0.35) + shadow(0, 0, 60, 8, 0.4) + E(0, -6, 50, 10, c) + R(-4, -400, 8, 396, c) + R(1, -400, 3, 396, "#ffffff", 0.2) +
    P("M-70 -380 L70 -380 L48 -480 L-48 -480 Z", shade) + P("M20 -480 L48 -480 L70 -380 L36 -380 Z", SH, 0.12) + E(0, -380, 70, 10, "#fff6d8") + R(-48, -484, 96, 6, tone(shade, -0.2), null, 3);
  return G(cx, base, 0, b, s);
};

export const dayCloud = (cx, cy, w, seed, c = "#ffffff", shade = "#c9dcec") => {
  const r = rng(seed);
  let lumps = "";
  const n = 4 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), lx = cx - w * 0.38 + t * w * 0.76, ly = cy - Math.sin(t * Math.PI) * w * 0.12 - r() * w * 0.04, rr = w * (0.12 + Math.sin(t * Math.PI) * 0.1 + r() * 0.04);
    lumps += blob(lx, ly, rr * 1.15, rr, seed * 10 + i, 9, 0.12) + " ";
  }
  lumps += blob(cx, cy + w * 0.04, w * 0.5, w * 0.09, seed + 99, 10, 0.1);
  return P(lumps, shade) + clip(lumps, P(lumps, c) + `<g transform="translate(0 ${f(w * 0.06)})">${P(lumps, shade)}</g>`) + P(blob(cx - w * 0.12, cy - w * 0.1, w * 0.12, w * 0.05, seed + 7, 8, 0.2), "#ffffff", 0.6);
};
