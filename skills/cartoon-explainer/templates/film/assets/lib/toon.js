(function () {
  "use strict";

  const INK = "#262626";
  const OUT = 4;

  const SKIN = { light: "#f3cba5", tan: "#e0a878", brown: "#b07850", dark: "#734a2e" };
  const HAIR = { black: "#2b2622", brown: "#6b4226", blond: "#d9b25f", red: "#a8502a", grey: "#b9bec4", white: "#e9ecef" };
  const OUTFIT = {
    suit: { coat: "#3c4b66", shade: "#2f3b52", shirt: "#ffffff", tie: "#c8402f", pants: "#34425a", shoe: "#3a302d" },
    labcoat: { coat: "#f4f6f8", shade: "#d3dae2", shirt: "#7fa6c9", tie: "#3c4b66", pants: "#4a5873", shoe: "#3a302d" },
    worker: { coat: "#5f7389", shade: "#4d5f73", shirt: "#5f7389", vest: "#f39a1e", stripe: "#f2f2ee", pants: "#44536a", shoe: "#5a4232" },
    casual: { coat: "#d9763a", shade: "#b9612e", shirt: "#d9763a", pants: "#3f5274", shoe: "#eeebe4" },
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const toHex = (a) => "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  function mix(a, b, t) {
    if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
    const A = rgb(a), B = rgb(b);
    return toHex(A.map((v, i) => v + (B[i] - v) * t));
  }
  function mute(c, k) {
    if (!/^#[0-9a-f]{6}$/i.test(c)) return c;
    const A = rgb(c), g = A[0] * 0.3 + A[1] * 0.59 + A[2] * 0.11, d = k == null ? 0.16 : k;
    return toHex(A.map((v) => v + (g - v) * d + (236 - v) * 0.05));
  }
  let uid = 0;
  const f1 = (v) => (+v).toFixed(1);
  function spline(pts) {
    const n = pts.length, at = (i) => pts[(i + n) % n];
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d + " Z";
  }
  function frame(ax, ay, bx, by) {
    const L = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / L, dy = (by - ay) / L;
    return { L, pt: (u, v) => [ax + dx * u * L - dy * v, ay + dy * u * L + dx * v] };
  }
  const lerpW = (prof, u) => {
    for (let i = 1; i < prof.length; i++) if (u <= prof[i][0]) {
      const [u0, w0] = prof[i - 1], [u1, w1] = prof[i];
      return w0 + (w1 - w0) * ((u - u0) / (u1 - u0 || 1));
    }
    return prof[prof.length - 1][1];
  };
  function limb(ax, ay, bx, by, spec) {
    const fr = frame(ax, ay, bx, by), s = spec.out;
    const lp = s > 0 ? spec.outer : spec.inner, rp = s > 0 ? spec.inner : spec.outer;
    const pts = [];
    lp.forEach(([u, w], i) => pts.push([...fr.pt(u, w), spec.hem && i === lp.length - 1 ? 1 : 0]));
    if (spec.capB) pts.push(fr.pt(1 + spec.capB / fr.L, (lp[lp.length - 1][1] - rp[rp.length - 1][1]) / 2));
    rp.slice().reverse().forEach(([u, w], i) => pts.push([...fr.pt(u, -w), spec.hem && i === 0 ? 1 : 0]));
    pts.push(fr.pt(-spec.capA / fr.L, (lp[0][1] - rp[0][1]) / 2));
    const shade = [];
    rp.forEach(([u, w]) => shade.push(fr.pt(u, -w * 1.5)));
    rp.slice().reverse().forEach(([u, w]) => shade.push(fr.pt(u, -w * (0.22 + 0.12 * Math.sin(u * 7)))));
    return { d: spline(pts), shade: spline(shade), fr, lw: (u) => lerpW(lp, u), rw: (u) => lerpW(rp, u) };
  }
  function crease(fr, u0, u1, v0, v1, k) {
    const a = fr.pt(u0, v0), m = fr.pt((u0 + u1) / 2, v0 + (v1 - v0) * 0.55 + k), b = fr.pt(u1, v1), m2 = fr.pt((u0 + u1) / 2 + 0.01, v0 + (v1 - v0) * 0.5);
    return `M${f1(a[0])} ${f1(a[1])} Q${f1(m[0])} ${f1(m[1])} ${f1(b[0])} ${f1(b[1])} Q${f1(m2[0])} ${f1(m2[1])} ${f1(a[0])} ${f1(a[1])} Z`;
  }
  function sym(x0, y0, segs) {
    let d = `M${x0} ${y0}`, cur = [x0, y0];
    const starts = [];
    for (const s of segs) { starts.push(cur); d += ` C${s[0]} ${s[1]} ${s[2]} ${s[3]} ${s[4]} ${s[5]}`; cur = [s[4], s[5]]; }
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], st = starts[i];
      d += ` C${600 - s[2]} ${s[3]} ${600 - s[0]} ${s[1]} ${600 - st[0]} ${st[1]}`;
    }
    return d + " Z";
  }
  const mir = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${600 - +x} ${y}`);
  const F = (d, fill, extra) => `<path d="${d}" fill="${fill}" ${extra || ""}/>`;
  const P = F;
  const S = (d, c, w, op) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op ? ` opacity="${op}"` : ""}/>`;

  function headPath(soft) {
    return sym(300, 104, [
      [354, 104, 404, 132, 419, 194],
      [425, 222, 424, 254, 421, 280],
      [419, 294, 425, 304, 421, 318],
      soft ? [414, 348, 400, 372, 382, 392] : [417, 340, 404, 358, 398, 376],
      soft ? [360, 414, 330, 428, 300, 430] : [380, 392, 352, 414, 330, 424],
      ...(soft ? [] : [[318, 430, 310, 431, 300, 431]]),
    ]);
  }
  function headShade(soft) {
    return spline([[356, 96], [398, 160], [396, 240], [404, 302, 1], [372, 350], soft ? [336, 404] : [342, 400], [300, 444, 1], [470, 444, 1], [470, 96, 1]]);
  }
  const ear = (skin, shade) => {
    const r = "M417 260 C433 244 454 252 452 280 C450 304 437 320 419 324 L414 300 Z";
    const ri = "M424 270 C436 264 444 274 440 290 C438 302 431 308 424 308 C431 297 433 283 424 270 Z";
    return F(mir(r), skin) + F(mir(ri), shade) + F(r, skin) + F(ri, shade) + F("M440 280 C446 296 440 314 422 322 L419 318 C432 310 438 296 440 280 Z", shade);
  };

  function hairBack(style, c, dk) {
    if (style === "long") return P("M168 250 C158 140 230 90 300 90 C370 90 442 140 432 250 L446 392 L460 476 L436 462 L424 494 L404 470 L382 486 L372 470 L335 470 L329 404 L271 404 L265 470 L228 470 L218 486 L196 470 L176 494 L164 462 L140 476 L154 392 Z", c) +
      F("M398 140 C430 180 438 230 432 300 L446 392 L460 476 L436 462 L424 494 L404 470 C420 400 420 300 398 140 Z", dk);
    if (style === "bun") return P("M300 34 C334 30 362 48 362 74 C362 100 336 116 300 116 C264 116 238 100 238 74 C238 48 266 32 300 34 Z", c) +
      F("M246 84 C238 54 266 30 304 34 C334 38 346 58 338 76 C322 62 292 60 270 76 C262 82 254 88 246 84 Z", mix(c, "#ffffff", 0.12)) +
      F("M356 66 C368 98 342 118 302 116 C270 114 250 100 250 88 C272 100 302 100 324 86 C338 78 348 70 356 66 Z", dk) +
      S("M262 62 Q300 44 340 62", dk, 4, 0.7) + S("M256 92 Q300 108 346 88", dk, 4, 0.5);
    if (style === "grey" || style === "bald") return P("M156 322 C134 250 150 184 202 156 L398 156 C450 184 466 250 444 322 L438 310 L432 334 L420 312 L414 300 L186 300 L180 312 L168 334 L162 310 Z", c) +
      F("M398 156 C450 184 466 250 444 322 L438 310 L432 334 L420 312 L414 300 C424 250 418 200 398 156 Z", dk);
    return "";
  }

  function hairFront(style, c) {
    switch (style) {
      case "side":
        return P("M176 268 C164 196 196 120 262 102 C320 86 394 100 424 156 C438 186 436 226 428 264 L418 266 L412 214 Q400 194 382 180 Q384 196 374 206 Q362 186 340 172 Q336 190 318 204 Q306 182 284 170 Q276 188 256 200 Q248 186 232 178 Q216 198 204 226 Q192 246 186 268 Z", c);
      case "bald":
        return "";
      case "grey":
        return P("M246 130 Q290 100 352 116 L342 126 Q300 118 262 138 Z", c);
      case "long":
      case "bun":
        return P("M170 264 C158 150 230 94 300 94 C370 94 442 150 430 264 Q420 206 388 182 Q358 164 324 160 L314 148 Q292 168 262 176 Q222 192 198 226 Q182 244 170 264 Z", c);
      case "curly": {
        const pts = [[168, 268], [158, 214], [174, 162], [210, 124], [254, 100], [300, 92], [346, 100], [390, 124], [426, 162], [442, 214], [432, 268]];
        let d = `M${pts[0][0]} ${pts[0][1]} `;
        for (let i = 1; i < pts.length; i++) {
          const [x0, y0] = pts[i - 1], [x, y] = pts[i];
          d += `A${Math.hypot(x - x0, y - y0) * 0.7} ${Math.hypot(x - x0, y - y0) * 0.7} 0 0 1 ${x} ${y} `;
        }
        d += "Q408 214 384 192 L372 206 Q356 182 334 178 L320 196 Q300 176 278 178 L262 196 Q246 178 222 190 L214 208 Q186 230 168 268 Z";
        return P(d, c);
      }
      default:
        return "";
    }
  }

  function hairShade(style, c) {
    if (style === "side") return F("M424 156 C438 186 436 226 428 264 L418 266 L412 214 Q400 194 382 180 C398 172 412 164 424 156 Z", c) +
      S("M300 110 Q332 148 318 198", c, 5, 0.75) + S("M246 120 Q262 152 256 194", c, 5, 0.6) + S("M354 116 Q384 148 374 200", c, 5, 0.75) + S("M210 160 Q220 190 206 222", c, 4, 0.5);
    if (style === "long" || style === "bun") return F("M360 166 C400 182 424 216 430 264 C440 200 420 150 380 120 C378 140 370 154 360 166 Z", c) +
      S("M314 150 Q356 150 394 186", c, 4, 0.6) + S("M314 150 Q262 158 214 206", c, 4, 0.55) + S("M300 104 Q312 126 314 148", c, 4, 0.5);
    if (style === "curly") return F("M372 182 C404 196 424 226 432 268 C446 220 432 168 400 138 C396 156 386 170 372 182 Z", c) +
      S("M250 120 q16 18 4 34", c, 4, 0.6) + S("M330 112 q16 18 4 34", c, 4, 0.6) + S("M396 150 q12 20 0 36", c, 4, 0.6);
    if (style === "grey") return S("M262 128 Q300 112 340 120", c, 3, 0.7);
    return "";
  }

  function hairShine(style) {
    const c = "rgba(255,255,255,0.2)";
    if (style === "side") return F("M214 172 C236 140 282 118 338 116 C292 130 254 148 226 182 Z", c);
    if (style === "long" || style === "bun") return F("M206 190 C230 140 270 118 320 116 C280 132 246 156 222 198 Z", c);
    if (style === "curly") return F("M206 168 C232 132 270 114 316 112 C278 128 244 150 222 178 Z", c);
    if (style === "bald") return F("M232 152 L256 128 L296 120 L320 126 L290 132 L266 140 L246 164 Z", "rgba(255,255,255,0.36)");
    return "";
  }

  function mouths() {
    const dark = "#5e2a2c", tongue = "#d9727a", lip = "#8a3f3a";
    return (
      `<g class="tz-m tz-m-rest">${F("M268 360 Q300 382 332 360 Q300 374 268 360 Z", lip)}</g>` +
      `<g class="tz-m tz-m-closed" opacity="0">${F("M274 364 Q300 370 326 364 Q300 375 274 364 Z", lip)}</g>` +
      `<g class="tz-m tz-m-open" opacity="0">${P("M266 352 Q300 346 334 352 Q326 402 300 406 Q274 402 266 352 Z", dark)}` +
      F("M282 392 Q300 380 318 392 Q312 402 300 403 Q288 402 282 392 Z", tongue) + F("M272 355 L328 355 L325 366 L275 366 Z", "#fff") + `</g>` +
      `<g class="tz-m tz-m-round" opacity="0">${P("M300 344 C316 344 322 358 322 368 C322 382 312 390 300 390 C288 390 278 382 278 368 C278 358 284 344 300 344 Z", dark)}` +
      F("M290 380 Q300 372 310 380 Q306 388 300 388 Q294 388 290 380 Z", tongue) + `</g>` +
      `<g class="tz-m tz-m-wide" opacity="0">${P("M260 354 Q300 349 340 354 Q330 384 300 386 Q270 384 260 354 Z", dark)}` +
      F("M266 356 L334 356 L330 366 L270 366 Z", "#fff") + `</g>`
    );
  }

  const TORSO = "M262 448 C228 456 184 466 160 488 C144 502 136 526 134 556 L116 920 L484 920 L466 556 C464 526 456 502 440 488 C416 466 372 456 338 448 Z";
  function torso(o, kind, neck) {
    const mid = mix(o.coat, o.shade, 0.55);
    let s = F(TORSO, o.coat) + F("M370 456 C420 470 454 498 466 556 L484 920 L392 920 C412 780 414 610 370 456 Z", o.shade);
    s += F("M152 522 C168 488 206 468 250 458 C214 482 190 508 178 544 Z", mix(o.coat, "#ffffff", 0.14));
    s += F("M190 536 Q226 554 250 604 Q220 570 186 552 Z", mid) + F("M410 536 Q374 554 350 604 Q380 570 414 552 Z", mix(o.shade, "#000000", 0.1)) + F("M200 590 Q226 604 238 636 Q218 612 196 604 Z", mid, 'opacity="0.7"');
    s += neck || "";
    if (kind === "suit" || kind === "labcoat") {
      const shirtShade = mix(o.shirt, "#5a6a85", 0.22);
      s += F("M262 450 Q300 484 338 450 L300 576 Z", o.shirt) + F("M262 450 Q300 484 338 450 L300 500 Z", shirtShade);
      if (kind === "suit") s += F("M288 474 L312 474 L320 566 L300 596 L280 566 Z", o.tie) + F("M300 474 L312 474 L320 566 L300 596 Z", mix(o.tie, "#000000", 0.18)) + F("M286 456 L314 456 L310 478 L290 478 Z", mix(o.tie, "#000000", 0.12));
      s += F("M262 450 L230 488 L260 520 L244 540 L300 644 Z", mid) + F("M338 450 L370 488 L340 520 L356 540 L300 644 Z", o.shade);
      s += F("M300 644 L296 920 L304 920 Z", o.shade);
      if (kind === "labcoat") s += F("M372 620 L420 620 L418 680 L374 680 Z", mid) + F("M384 606 L390 606 L392 640 L386 640 Z", "#4a82c4");
    } else if (kind === "worker") {
      s += F("M254 448 Q300 514 346 448 L338 448 Q300 494 262 448 Z", mix(o.coat, "#000000", 0.2));
      s += F("M196 470 L270 452 L300 520 L330 452 L404 470 L440 920 L160 920 Z", o.vest) + F("M330 452 L404 470 L440 920 L384 920 C396 760 380 600 330 452 Z", mix(o.vest, "#7a3a10", 0.22));
      s += F("M182 640 L418 640 L424 680 L176 680 Z", o.stripe) + F("M176 760 L424 760 L430 800 L170 800 Z", o.stripe);
      s += F("M296 520 L304 520 L304 920 L296 920 Z", mix(o.vest, "#7a3a10", 0.3));
    } else {
      s += F("M248 448 Q300 520 352 448 L338 448 Q300 500 262 448 Z", mix(o.coat, "#000000", 0.14));
    }
    return s;
  }

  function sleeve(o, kind) {
    if (kind === "worker") return o.shirt;
    return o.coat;
  }

  function makeChar(spec) {
    const k = spec.outfit || "suit";
    const o0 = Object.assign({}, OUTFIT[k], spec.colors || {});
    const o = {};
    for (const key in o0) o[key] = mute(o0[key]);
    const skin = mute(SKIN[spec.skin] || spec.skin || SKIN.light, 0.08);
    const hc = mute(HAIR[spec.hairColor] || spec.hairColor || (spec.hair === "grey" ? HAIR.grey : HAIR.black), 0.1);
    const hdk = mix(hc, "#000000", 0.2);
    const sl = sleeve(o, k);
    const skinShade = mix(skin, "#b4503c", 0.3);
    const skinMid = mix(skin, skinShade, 0.45);
    const skinLight = mix(skin, "#fff4e8", 0.35);
    const soft = spec.soft != null ? spec.soft : spec.hair === "long" || spec.hair === "bun";
    const cid = "tzh" + uid++;
    const hand = (x, y, side) => {
      const m = side === "L" ? 1 : -1, X = (v) => v * m;
      return `<g transform="translate(${x} ${y})">` +
        F(`M${X(16)} -16 C${X(30)} -24 ${X(45)} -14 ${X(45)} 2 C${X(45)} 14 ${X(37)} 21 ${X(28)} 17 C${X(24)} 8 ${X(20)} -4 ${X(16)} -16 Z`, skin) +
        F(`M${X(45)} 2 C${X(45)} 14 ${X(37)} 21 ${X(28)} 17 C${X(35)} 13 ${X(40)} 8 ${X(45)} 2 Z`, skinShade) +
        F(`M${X(-26)} -32 C${X(-31)} -8 ${X(-30)} 14 ${X(-24)} 30 C${X(-20)} 42 ${X(-12)} 46 ${X(-6)} 42 C${X(-2)} 48 ${X(6)} 48 ${X(10)} 42 C${X(14)} 46 ${X(21)} 44 ${X(23)} 34 C${X(27)} 20 ${X(28)} 2 ${X(26)} -14 C${X(24)} -28 ${X(16)} -36 0 -37 C${X(-12)} -37 ${X(-22)} -35 ${X(-26)} -32 Z`, skin) +
        F(`M${X(23)} 34 C${X(27)} 20 ${X(28)} 2 ${X(26)} -14 L${X(14)} -8 C${X(16)} 8 ${X(16)} 24 ${X(10)} 42 C${X(14)} 46 ${X(21)} 44 ${X(23)} 34 Z`, skinShade) +
        F(`M${X(-26)} -32 C${X(-22)} -35 ${X(-12)} -37 0 -37 C${X(-10)} -30 ${X(-18)} -20 ${X(-22)} 2 C${X(-26)} -10 ${X(-27)} -22 ${X(-26)} -32 Z`, skinLight) +
        S(`M${X(-6)} 42 L${X(-7)} 28`, skinShade, 3) + S(`M${X(10)} 42 L${X(9)} 28`, skinShade, 3) +
        S(`M${X(-20)} 16 Q0 22 ${X(16)} 14`, skinShade, 3, 0.6) + `</g>`;
    };
    const cuff = k === "suit" ? o.shirt : null;
    const fold = mix(o.shade, "#000000", 0.1);
    const arm = (side) => {
      const sx = side === "L" ? 182 : 418, ex = side === "L" ? 152 : 448, hx = side === "L" ? 160 : 440, out = side === "L" ? 1 : -1;
      const wy = 856, cy = cuff ? 846 : wy;
      const up = limb(sx, 512, ex, 712, { out, capA: 34, capB: 26,
        outer: [[0, 41], [0.14, 47], [0.4, 40], [0.75, 36], [0.95, 37], [1, 36]], inner: [[0, 33], [0.22, 36], [0.6, 34], [0.92, 33], [1, 33]] });
      const fo = limb(ex, 712, hx, cy, { out, capA: 34, capB: 0, hem: true,
        outer: [[0, 36], [0.1, 39], [0.22, 35], [0.62, 32], [0.9, 30], [1, 34]], inner: [[0, 34], [0.16, 33], [0.55, 32], [0.86, 29], [1, 32]] });
      const id1 = "tzc" + uid++, id2 = "tzc" + uid++;
      const iv = -out, folds =
        F(crease(fo.fr, 0.04, 0.24, iv * 33, iv * 6, out * 4), fold) + F(crease(fo.fr, 0.2, 0.36, iv * 31, iv * 12, out * 3), fold) +
        F(crease(fo.fr, 0.02, 0.16, out * 37, out * 14, -out * 3), fold) + F(crease(up.fr, 0.78, 0.98, iv * 32, iv * 8, out * 3), fold);
      const hemBand = (() => { const a = fo.fr.pt(0.9, 60), b = fo.fr.pt(0.9, -60), c = fo.fr.pt(1.1, -60), d = fo.fr.pt(1.1, 60);
        return `M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])} L${f1(d[0])} ${f1(d[1])} Z`; })();
      const cf = cuff ? limb(hx + (ex - hx) * 0.05, cy - 4, hx, wy, { out, capA: 0, capB: 0, hem: true, outer: [[0, 30], [1, 30]], inner: [[0, 29], [1, 29]] }) : null;
      return `<g class="tz-arm${side}"><clipPath id="${id1}"><path d="${up.d}"/></clipPath>` +
        `<circle cx="${sx + out * 4}" cy="524" r="36" fill="${sl}"/><circle cx="${ex}" cy="712" r="36" fill="${sl}"/>` +
        F(up.d, sl) + F(up.shade, o.shade, `clip-path="url(#${id1})"`) +
        `<g class="tz-fore${side}"><clipPath id="${id2}"><path d="${fo.d}"/></clipPath>` +
        F(fo.d, sl) + `<g clip-path="url(#${id2})">${F(fo.shade, o.shade)}${folds}${F(hemBand, fold)}</g>` +
        (cf ? F(cf.d, cuff) + F(cf.shade, mix(cuff, "#5a6a85", 0.22)) : "") +
        hand(hx, 886, side) + `</g></g>`;
    };
    const pants = o.pants || mix(o.coat, "#000000", 0.25), pshade = mix(pants, "#000000", 0.22), pfold = mix(pants, "#000000", 0.32);
    const shoe = o.shoe || "#3a302d", sole = mix(shoe, "#000000", 0.3);
    const leg = (side) => {
      const out = side === "L" ? 1 : -1, hx = side === "L" ? 250 : 350, kx = side === "L" ? 244 : 356, ax = side === "L" ? 240 : 360;
      const th = limb(hx, 890, kx, 1130, { out, capA: 30, capB: 0,
        outer: [[0, 64], [0.3, 62], [0.75, 52], [1, 48]], inner: [[0, 50], [0.4, 48], [0.85, 43], [1, 43]] });
      const sh = limb(kx, 1130, ax, 1352, { out, capA: 40, capB: 0, hem: true,
        outer: [[0, 48], [0.25, 48], [0.7, 42], [1, 45]], inner: [[0, 43], [0.3, 43], [0.8, 39], [1, 42]] });
      const id1 = "tzc" + uid++, id2 = "tzc" + uid++, iv = -out;
      const hemBand = (() => { const a = sh.fr.pt(0.93, 70), b = sh.fr.pt(0.93, -70), c = sh.fr.pt(1.1, -70), d = sh.fr.pt(1.1, 70);
        return `M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])} L${f1(c[0])} ${f1(c[1])} L${f1(d[0])} ${f1(d[1])} Z`; })();
      const sx = ax + out * -8, X = (v) => sx + v * -out * 1.3;
      const foot = F(`M${X(-40)} 1368 C${X(-44)} 1340 ${X(-28)} 1328 ${X(0)} 1328 C${X(30)} 1328 ${X(58)} 1344 ${X(64)} 1368 C${X(66)} 1384 ${X(54)} 1392 ${X(30)} 1392 L${X(-26)} 1392 C${X(-38)} 1392 ${X(-42)} 1382 ${X(-40)} 1368 Z`, shoe) +
        F(`M${X(-41)} 1378 L${X(65)} 1376 C${X(64)} 1388 ${X(54)} 1394 ${X(30)} 1394 L${X(-26)} 1394 C${X(-36)} 1394 ${X(-41)} 1388 ${X(-41)} 1378 Z`, sole) +
        F(`M${X(-22)} 1340 C${X(-6)} 1332 ${X(22)} 1334 ${X(40)} 1344 C${X(20)} 1340 ${X(0)} 1340 ${X(-18)} 1348 Z`, mix(shoe, "#ffffff", 0.3), 'opacity="0.7"');
      return `<g class="tz-leg${side}"><clipPath id="${id1}"><path d="${th.d}"/></clipPath>` +
        F(th.d, pants) + `<g clip-path="url(#${id1})">${F(th.shade, pshade)}${F(crease(th.fr, 0.8, 0.98, iv * 36, iv * 10, out * 4), pfold)}</g>` +
        `<g class="tz-shin${side}"><clipPath id="${id2}"><path d="${sh.d}"/></clipPath>` + foot +
        `<circle cx="${kx}" cy="1130" r="45" fill="${pants}"/>` + F(sh.d, pants) +
        `<g clip-path="url(#${id2})">${F(sh.shade, pshade)}${F(crease(sh.fr, 0.02, 0.2, out * 38, out * 12, -out * 3), pfold)}${F(hemBand, pfold)}</g></g></g>`;
    };
    const hips = F("M176 870 L424 870 L414 966 Q300 1004 186 966 Z", pants) + F("M300 880 L424 870 L414 966 Q356 990 300 996 Z", pshade);
    const legsSvg = `<ellipse class="tz-shadow" cx="300" cy="1392" rx="200" ry="22" fill="#1c2430" opacity="0.16"/>` +
      `<g class="tz-legs">${hips}${leg("L")}${leg("R")}</g>`;
    const eye = (x) => `<g class="tz-pupil"><ellipse cx="${x}" cy="274" rx="15" ry="20" fill="#2c2427"/><circle cx="${x + 5}" cy="266" r="5" fill="#ffffff" opacity="0.9"/></g>`;
    const lids = S("M236 252 Q255 242 274 250", skinShade, 4, 0.7) + S("M326 250 Q345 242 364 252", skinShade, 4, 0.7);
    const glasses = spec.glasses
      ? `<g fill="rgba(255,255,255,0.16)" stroke="#2c2427" stroke-width="7" stroke-linejoin="round"><path d="M212 240 L298 240 L294 290 Q290 306 270 306 L236 306 Q216 306 214 288 Z"/><path d="M302 240 L388 240 L386 288 Q384 306 364 306 L330 306 Q310 306 306 290 Z"/></g>` +
        `<path d="M296 252 Q300 246 304 252" fill="none" stroke="#2c2427" stroke-width="6"/>`
      : "";
    const light = /^#[0-9a-f]{6}$/i.test(hc) && rgb(hc).reduce((a, b) => a + b) > 480;
    const brow = light ? mix(hc, "#5a6068", 0.45) : hc;
    const beard = spec.beard
      ? P("M184 300 C188 380 218 428 250 446 L262 464 L276 450 L290 470 L302 452 L316 470 L328 450 L342 464 L352 444 C384 428 412 380 416 300 C398 352 370 334 352 336 C332 338 318 346 300 346 C282 346 268 338 248 336 C230 334 202 352 184 300 Z", hc) +
        F("M416 300 C412 380 384 428 352 444 L342 464 L330 452 C368 420 392 372 404 330 C410 322 414 312 416 300 Z", hdk) +
        S("M232 380 L240 420", hdk, 3, 0.6) + S("M300 400 L300 440", hdk, 3, 0.6) + S("M366 380 L358 420", hdk, 3, 0.6) +
        F("M276 392 Q300 384 324 392 Q300 400 276 392 Z", "#5b2323", 'class="tz-beardmouth"')
      : "";
    const stache = spec.moustache ? P("M258 344 C272 326 294 328 300 338 C306 328 328 326 342 344 L350 354 C330 348 312 348 300 342 C288 348 270 348 250 354 Z", hc) + F("M300 338 C306 328 328 326 342 344 L350 354 C330 348 312 348 300 342 Z", hdk) : "";
    const hat = k === "worker" && spec.hat !== false
      ? F("M168 220 C168 120 230 78 300 78 C370 78 432 120 432 220 Z", "#efc048") + F("M300 78 C320 78 330 120 330 220 L270 220 C270 120 280 78 300 78 Z", "#ddab2e") +
        F("M136 214 L464 214 Q470 244 444 246 L156 246 Q130 244 136 214 Z", "#efc048") + F("M136 232 L464 232 Q462 244 444 246 L156 246 Q138 244 136 232 Z", "#d39f2a")
      : "";
    const NECK = "M268 390 C268 418 267 436 261 450 Q300 506 339 450 C333 436 332 418 332 390 Z", nid = "tzn" + uid++;
    const neck = `<clipPath id="${nid}"><path d="${NECK}"/></clipPath>` + F(NECK, skin) +
      F("M314 390 L340 390 L340 490 L322 490 C321 450 319 420 314 390 Z", skinShade, `clip-path="url(#${nid})"`);
    const chinShadow = F("M270 404 L330 404 L330 436 C320 446 310 451 300 451 C290 451 280 446 270 436 Z", skinShade);
    const HP = headPath(soft);
    const face = `<clipPath id="${cid}"><path d="${HP}"/></clipPath>` + F(HP, skin) +
      `<g clip-path="url(#${cid})">` + F(headShade(soft), skinShade) +
      F(spline([[168, 300, 1], [194, 322], [212, 372], [262, 418], [300, 434, 1], [300, 470, 1], [160, 470, 1]]), skinMid, 'opacity="0.55"') +
      F("M224 170 C244 142 276 128 306 128 C274 144 250 162 236 190 Z", skinLight) +
      F("M286 410 Q300 404 314 410 Q300 418 286 410 Z", skinLight, 'opacity="0.6"') + `</g>`;
    const nose = F("M300 284 C306 300 316 318 318 328 C316 337 306 339 295 334 C303 330 308 326 306 318 C304 306 302 296 300 284 Z", skinShade) +
      F("M294 292 L299 314 L292 316 Z", skinLight, 'opacity="0.7"');
    const brows = `<g class="tz-brows">${F("M226 236 C236 218 258 211 282 217 L281 229 C260 224 242 228 226 236 Z", brow, 'class="tz-browL"')}` +
      `${F("M374 236 C364 218 342 211 318 217 L319 229 C340 224 358 228 374 236 Z", brow, 'class="tz-browR"')}</g>`;
    if (spec.back) {
      const cap = spec.hair === "bald" ? skin : hc;
      return (
        `<svg class="tz-svg" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" overflow="visible">` +
        `<g class="tz-char">` + legsSvg + `<g class="tz-body">` +
        F(TORSO, o.coat) +
        F("M370 456 C420 470 454 498 466 556 L484 920 L392 920 C412 780 414 610 370 456 Z", o.shade) +
        F("M300 470 L304 920 L296 920 Z", mix(o.coat, o.shade, 0.6)) +
        F("M226 520 Q262 540 270 600 L262 600 Q254 548 222 528 Z", mix(o.coat, o.shade, 0.5)) +
        `<g class="tz-head">` +
        F("M266 380 L334 380 L342 470 L258 470 Z", skin) + F("M300 380 L334 380 L342 470 L300 470 Z", skinShade) +
        F("M246 452 Q300 476 354 452 L360 478 Q300 500 240 478 Z", mix(o.coat, "#000000", 0.18)) +
        ear(skin, skinShade) +
        F(HP, skin) +
        (spec.hair === "long" ? hairBack("long", hc, hdk) : "") +
        F("M172 290 C162 160 228 100 300 100 C372 100 438 160 428 290 C424 344 406 384 386 404 L372 396 L360 410 L344 394 L328 404 L300 392 L272 404 L256 394 L240 410 L228 396 L214 404 C194 384 176 344 172 290 Z", spec.hair === "bald" ? hc : cap) +
        (spec.hair === "bald" ? F("M404 250 C420 300 412 360 386 404 L372 396 C394 350 402 300 396 250 Z", hdk) + S("M236 300 C244 340 248 370 248 396 M300 300 L300 390 M364 300 C356 340 352 370 352 396", hdk, 3, 0.5) + F("M186 236 C180 150 236 104 300 104 C364 104 420 150 414 236 C396 226 374 238 352 228 C334 240 316 238 300 230 C284 238 266 240 248 228 C226 238 204 226 186 236 Z", skin) + F("M352 112 C396 136 420 180 414 236 C406 232 398 230 390 230 C394 186 380 144 352 112 Z", skinShade) :
        F("M352 112 C404 140 434 200 428 290 C424 344 406 384 386 404 L372 396 C390 350 400 300 392 240 C386 186 372 144 352 112 Z", mix(cap, "#000000", 0.2))) +
        (spec.hair === "bun" ? hairBack("bun", hc, hdk) : "") +
        (spec.hair === "bald" ? "" : S("M300 112 Q296 220 300 380", mix(cap, "#000000", 0.2), 4, 0.5) + S("M250 126 Q232 240 252 390", mix(cap, "#000000", 0.2), 4, 0.45)) +
        F("M222 166 C246 132 284 116 322 118 C286 132 256 152 238 182 Z", "rgba(255,255,255,0.18)") +
        `<g class="tz-eyes"></g><g class="tz-brows"></g><g class="tz-mouth" opacity="0">${mouths()}</g>` +
        `</g>` + arm("L") + arm("R") + `</g></g></svg>`
      );
    }
    return (
      `<svg class="tz-svg" viewBox="0 0 600 920" xmlns="http://www.w3.org/2000/svg" overflow="visible">` +
      `<g class="tz-char">` + legsSvg + `<g class="tz-body">` +
      torso(o, k, neck) +
      `<g class="tz-head">` +
      hairBack(spec.hair, hc, hdk) + chinShadow + ear(skin, skinShade) + face +
      `<ellipse cx="232" cy="336" rx="22" ry="13" fill="#ee8f84" opacity="0.28"/><ellipse cx="368" cy="336" rx="22" ry="13" fill="#ee8f84" opacity="0.28"/>` +
      nose +
      `<g class="tz-eyes">${lids}${eye(255)}${eye(345)}</g>` + brows +
      beard + `<g class="tz-mouth">${mouths()}</g>` + stache + glasses +
      hairFront(spec.hair, hc) + hairShade(spec.hair, hdk) + hairShine(spec.hair) + hat +
      `</g>` +
      arm("L") + arm("R") +
      `</g></g></svg>`
    );
  }

  const ORIGIN = {
    body: "300 920", head: "300 440", eyes: "300 270",
    armL: "182 520", armR: "418 520", foreL: "150 712", foreR: "450 712",
    feet: "300 1392", legL: "250 890", legR: "350 890", shinL: "244 1130", shinR: "356 1130",
  };

  const POSES = {
    rest: { armL: 0, foreL: 0, armR: 0, foreR: 0, head: 0 },
    explain: { armL: 0, foreL: 0, armR: 8, foreR: 118, head: -3 },
    explain2: { armL: -10, foreL: -112, armR: 0, foreR: 0, head: 3 },
    point: { armL: 0, foreL: 0, armR: -96, foreR: -8, head: 4 },
    pointL: { armL: 96, foreL: 8, armR: 0, foreR: 0, head: -4 },
    shrug: { armL: 26, foreL: 95, armR: -26, foreR: -95, head: 6 },
    handsUp: { armL: 138, foreL: 40, armR: -138, foreR: -40, head: 0 },
    think: { armL: 0, foreL: 0, armR: 70, foreR: 124, head: -6 },
    cross: { armL: -14, foreL: -118, armR: 14, foreR: 118, head: 0 },
  };

  const CAST = {};

  function actor(id, specOverride) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) throw new Error("TOON.actor: no element " + id);
    let spec = specOverride;
    if (!spec) {
      const key = el.getAttribute("data-cast");
      spec = CAST[key];
      if (!spec) throw new Error("TOON.actor: unknown cast '" + key + "' (assets/lib/cast.js)");
    }
    el.innerHTML = makeChar(spec);
    if (spec.flip) el.querySelector(".tz-svg").setAttribute("transform", "scale(-1 1)");
    const q = (s) => el.querySelector(s);
    const rig = {
      el, spec, flip: !!spec.flip,
      char: q(".tz-char"), body: q(".tz-body"), head: q(".tz-head"), eyes: q(".tz-eyes"), pupils: el.querySelectorAll(".tz-pupil"),
      brows: q(".tz-brows"), armL: q(".tz-armL"), armR: q(".tz-armR"), foreL: q(".tz-foreL"), foreR: q(".tz-foreR"),
      legs: q(".tz-legs"), legL: q(".tz-legL"), legR: q(".tz-legR"), shinL: q(".tz-shinL"), shinR: q(".tz-shinR"), shadow: q(".tz-shadow"),
      mouth: {}, pose: Object.assign({}, POSES.rest), shape: "rest",
    };
    for (const m of ["rest", "closed", "open", "round", "wide"]) rig.mouth[m] = q(".tz-m-" + m);
    return rig;
  }

  function setMouth(tl, rig, t, shape) {
    if (shape === rig._lastShape && t > (rig._lastT || -1)) return;
    for (const m in rig.mouth) tl.set(rig.mouth[m], { opacity: m === shape ? 1 : 0 }, Math.max(0, t));
    rig._lastShape = shape; rig._lastT = t;
  }

  function fold(w) {
    return w.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function visemes(word) {
    const f = fold(word);
    if (!f) return ["closed"];
    if (/^\d+$/.test(f)) return ["open", "wide", "round"].slice(0, Math.min(3, f.length));
    const groups = f.match(/[aeiouy]+/g) || ["a"];
    const out = [];
    if (/^(m|b|p|ph)/.test(f)) out.push("closed");
    for (const g of groups) {
      const c = g[0] === "y" && g.length > 1 ? g[1] : g[0];
      out.push(c === "a" ? "open" : c === "o" || c === "u" ? "round" : "wide");
    }
    if (/(m|p|b)$/.test(f)) out.push("closed");
    return out;
  }

  function talk(tl, rig, words, opts) {
    const o = Object.assign({ lead: 0.04, gap: 0.12, from: -Infinity, to: Infinity, nod: true }, opts || {});
    const ws = words.filter((w) => w.end > o.from && w.start < o.to);
    setMouth(tl, rig, 0, "rest");
    if (o.nod) {
      let last = -1;
      for (const w of ws) {
        if (w.end - w.start < 0.26 || w.start - last < 0.7) continue;
        const t = Math.max(o.from, w.start - 0.05);
        tl.fromTo(rig.head, { y: 0 }, { y: 7, duration: 0.12, ease: "power2.out" }, t);
        tl.fromTo(rig.head, { y: 7 }, { y: 0, duration: 0.28, ease: "sine.inOut" }, t + 0.12);
        last = w.start;
      }
    }
    ws.forEach((w, i) => {
      const t0 = Math.max(o.from, w.start - o.lead), t1 = Math.min(o.to, w.end - o.lead);
      const seq = visemes(w.w);
      const dur = Math.max(0.06, t1 - t0);
      const closedLen = Math.min(0.06, dur * 0.25);
      const vowels = seq.filter((s) => s !== "closed").length || 1;
      let t = t0;
      seq.forEach((s, j) => {
        const len = s === "closed" ? closedLen : (dur - closedLen * (seq.length - vowels)) / vowels;
        setMouth(tl, rig, t, s);
        t += len;
        if (j % 2 === 1 && len > 0.22) setMouth(tl, rig, t - len / 2, "wide");
      });
      const next = ws[i + 1];
      if (!next || next.start - w.end > o.gap) setMouth(tl, rig, t1, "rest");
    });
  }

  function idle(tl, rig, t0, t1, seed) {
    const r = mulberry32(seed || 1);
    const span = Math.max(0.1, t1 - t0);
    const cyc = 1.7;
    const n = Math.max(0, Math.floor(span / cyc) - 1);
    tl.fromTo(rig.body, { scaleY: 1 }, { scaleY: 1.012, svgOrigin: ORIGIN.body, duration: cyc, ease: "sine.inOut", repeat: n, yoyo: true }, t0);
    const sw = 2.9 + r() * 0.6, ns = Math.max(0, Math.floor(span / sw) - 1), a = 0.5 + r() * 0.4;
    tl.fromTo(rig.char, { rotation: -a }, { rotation: a, svgOrigin: ORIGIN.feet, duration: sw, ease: "sine.inOut", repeat: ns, yoyo: true }, t0);
    let t = t0 + 0.6 + r() * 1.6;
    while (t < t1 - 0.3) {
      tl.fromTo(rig.eyes, { scaleY: 1 }, { scaleY: 0.08, svgOrigin: ORIGIN.eyes, duration: 0.05, ease: "power1.in" }, t);
      tl.fromTo(rig.eyes, { scaleY: 0.08 }, { scaleY: 1, svgOrigin: ORIGIN.eyes, duration: 0.08, ease: "power1.out" }, t + 0.06);
      t += 2.2 + r() * 2.4;
    }
  }

  function pose(tl, rig, t, name, dur) {
    const to = POSES[name];
    if (!to) throw new Error("TOON.pose: unknown pose " + name);
    const d = dur == null ? 0.35 : dur;
    const ease = "back.out(1.6)";
    for (const part of ["armL", "foreL", "armR", "foreR"]) {
      if (rig.pose[part] === to[part]) continue;
      const lag = part.startsWith("fore") && d > 0.05 ? 0.05 : 0;
      tl.fromTo(rig[part], { rotation: rig.pose[part], svgOrigin: ORIGIN[part] }, { rotation: to[part], svgOrigin: ORIGIN[part], duration: d + lag, ease }, t + lag);
    }
    if (d > 0.05) {
      const lean = (to.head - rig.pose.head) * 0.25 || 0;
      if (lean) {
        tl.fromTo(rig.body, { rotation: 0 }, { rotation: lean, svgOrigin: ORIGIN.body, duration: d * 0.6, ease: "power2.out" }, t);
        tl.fromTo(rig.body, { rotation: lean }, { rotation: 0, svgOrigin: ORIGIN.body, duration: d * 1.4, ease: "sine.inOut" }, t + d * 0.6);
      }
    }
    if (rig.pose.head !== to.head)
      tl.fromTo(rig.head, { rotation: rig.pose.head, svgOrigin: ORIGIN.head }, { rotation: to.head, svgOrigin: ORIGIN.head, duration: d * 1.3, ease: "sine.inOut" }, t);
    rig.pose = Object.assign({}, to);
  }

  function gestures(tl, rig, words, seed, opts) {
    const o = Object.assign({ every: 2.6, names: ["explain", "rest", "explain2", "rest", "shrug", "rest"] }, opts || {});
    if (!words.length) return;
    const r = mulberry32(seed || 7);
    let next = words[0].start + 0.3, k = Math.floor(r() * o.names.length);
    for (const w of words) {
      if (w.start < next) continue;
      pose(tl, rig, w.start - 0.1, o.names[k % o.names.length]);
      k++;
      next = w.start + o.every * (0.8 + r() * 0.5);
    }
  }

  function look(tl, rig, t, dx, dur) {
    if (rig.pupils.length) tl.to(rig.pupils, { x: dx, duration: dur == null ? 0.18 : dur, ease: "power2.out" }, t);
  }

  function brows(tl, rig, t, dy, hold) {
    tl.fromTo(rig.brows, { y: 0 }, { y: dy, duration: 0.12, ease: "power2.out" }, t);
    tl.fromTo(rig.brows, { y: dy }, { y: 0, duration: 0.2, ease: "power2.inOut" }, t + (hold || 0.6));
  }

  const CUES = (window.__toonCues = window.__toonCues || []);
  let currentScene = null;

  function cue(t, kind, x, gain, dur) {
    if (!currentScene) return;
    const c = { t: +(currentScene.start + t).toFixed(3), kind, scene: currentScene.id, x: x || 0, gain: gain == null ? 1 : gain };
    if (dur) c.dur = dur;
    CUES.push(c);
  }

  // Ambience bed from audio/amb/<file>.mp3, looped over [t, t + dur]; db trims the layer,
  // o = { fi, fo (fade s), lp (low-pass Hz) }.
  function amb(t, dur, file, db, o) {
    if (!currentScene) return;
    CUES.push(Object.assign({ t: +(currentScene.start + t).toFixed(3), kind: "amb", scene: currentScene.id, file, dur: +dur.toFixed(3), db: db || 0 }, o));
  }

  // One-shot recording from audio/amb/<file>.mp3 at t (its leading silence trimmed), cut at t + dur if given.
  function clip(t, file, db, x, dur) {
    if (!currentScene) return;
    const c = { t: +(currentScene.start + t).toFixed(3), kind: "clip", scene: currentScene.id, file, db: db || 0, x: x || 0 };
    if (dur) c.dur = +dur.toFixed(3);
    CUES.push(c);
  }

  function stage() {
    const r = document.querySelector('[data-composition-id="main"][data-width]') || document.querySelector("[data-width]");
    return r ? { W: +r.getAttribute("data-width"), H: +r.getAttribute("data-height") } : { W: 1920, H: 1080 };
  }

  function panOf(el) {
    const r = el.getBoundingClientRect && el.getBoundingClientRect();
    if (!r || !r.width) return 0;
    const root = el.closest("[data-width]");
    const W = root ? +root.getAttribute("data-width") : stage().W;
    const rr = root ? root.getBoundingClientRect() : { left: 0, width: W };
    return Math.max(-1, Math.min(1, ((r.left - rr.left + r.width / 2) / (rr.width || W)) * 2 - 1));
  }

  function enter(tl, el, t, opts) {
    const o = Object.assign({ from: "bottom", dur: 0.5, ease: "back.out(1.3)", sfx: "whoosh" }, opts || {});
    const { W, H } = stage(), dy = Math.max(700, H * 0.65), dx = Math.max(1100, W * 0.6);
    const off = { bottom: { y: dy }, left: { x: -dx }, right: { x: dx }, top: { y: -dy }, pop: { scale: 0 } }[o.from];
    const zero = { x: 0, y: 0, scale: 1 };
    tl.fromTo(el, Object.assign({}, zero, off), Object.assign({}, zero, { duration: o.dur, ease: o.ease }), t);
    if (o.sfx) cue(t, o.sfx, panOf(el), 0.8);
  }

  function exit(tl, el, t, opts) {
    const o = Object.assign({ to: "bottom", dur: 0.35, ease: "power2.in" }, opts || {});
    const { W, H } = stage(), dy = Math.max(700, H * 0.65), dx = Math.max(1100, W * 0.6);
    const off = { bottom: { y: dy }, left: { x: -dx }, right: { x: dx }, top: { y: -dy }, pop: { scale: 0 } }[o.to];
    tl.to(el, Object.assign({ duration: o.dur, ease: o.ease }, off), t);
  }

  function pop(tl, el, t, opts) {
    const o = Object.assign({ dur: 0.42, sfx: "pop", hold: null }, opts || {});
    tl.fromTo(el, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: o.dur, ease: "back.out(2.4)" }, t);
    if (o.sfx) cue(t, o.sfx, panOf(el));
    if (o.hold != null) tl.to(el, { scale: 0, opacity: 0, duration: 0.2, ease: "back.in(2)" }, t + o.dur + o.hold);
  }

  function bubble(tl, el, t, opts) {
    const o = Object.assign({ hold: null, sfx: "pop" }, opts || {});
    tl.fromTo(el, { scale: 0.2, opacity: 0, transformOrigin: el.getAttribute("data-tail") === "right" ? "85% 110%" : "15% 110%" },
      { scale: 1, opacity: 1, duration: 0.38, ease: "back.out(2.2)" }, t);
    if (o.sfx) cue(t, o.sfx, panOf(el), 0.7);
    if (o.hold != null) tl.to(el, { scale: 0.2, opacity: 0, duration: 0.18, ease: "power2.in" }, t + 0.38 + o.hold);
  }

  function statPill(tl, el, t, opts) {
    const o = Object.assign({ hold: null, sfx: "stamp" }, opts || {});
    tl.fromTo(el, { scale: 2.4, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.32, ease: "back.out(1.8)" }, t);
    if (o.sfx) cue(t + 0.12, o.sfx, panOf(el), 0.9);
    if (o.hold != null) tl.to(el, { scale: 0, opacity: 0, duration: 0.2, ease: "back.in(2)" }, t + 0.32 + o.hold);
  }

  function splitChars(el) {
    if (el._tzChars) return el._tzChars;
    const text = el.textContent;
    el.textContent = "";
    const chars = [];
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue;
      if (/^\s+$/.test(word)) { el.appendChild(document.createTextNode(" ")); continue; }
      const w = document.createElement("span");
      w.className = "tz-word";
      for (const ch of Array.from(word)) {
        const s = document.createElement("span");
        s.className = "tz-ch";
        s.textContent = ch;
        w.appendChild(s);
        chars.push(s);
      }
      el.appendChild(w);
    }
    el._tzChars = chars;
    return chars;
  }

  function kinetic(tl, el, t, opts) {
    const o = Object.assign({ stagger: 0.035, seed: 3, hold: null, sfx: "whoosh" }, opts || {});
    const r = mulberry32(o.seed);
    const chars = splitChars(el);
    chars.forEach((c, i) => {
      const rot = (r() - 0.5) * 80, dy = -160 - r() * 160, sc = 0.2 + r() * 0.4;
      tl.fromTo(c, { y: dy, rotation: rot, scale: sc, opacity: 0 }, { y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.6)" }, t + i * o.stagger);
    });
    if (o.sfx) cue(t, o.sfx, 0, 0.9);
    if (o.hold != null) {
      const tEnd = t + chars.length * o.stagger + 0.5 + o.hold;
      chars.forEach((c, i) => tl.to(c, { y: 120, opacity: 0, duration: 0.22, ease: "power2.in" }, tEnd + i * 0.012));
    }
    return t + chars.length * o.stagger + 0.5;
  }

  function chart(tl, path, t, opts) {
    const o = Object.assign({ dur: 1.4, ease: "power1.inOut", sfx: "tick", dots: null }, opts || {});
    const len = path.getTotalLength();
    tl.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: o.dur, ease: o.ease }, t);
    if (o.sfx) for (let i = 0; i < 4; i++) cue(t + (i * o.dur) / 4, o.sfx, panOf(path), 0.6);
    if (o.dots) o.dots.forEach((d, i, a) => pop(tl, d, t + (o.dur * (i + 1)) / a.length - 0.1, { sfx: null, dur: 0.3 }));
  }

  function bars(tl, els, t, opts) {
    const o = Object.assign({ stagger: 0.12, dur: 0.5, sfx: "tick" }, opts || {});
    els.forEach((b, i) => {
      tl.fromTo(b, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: o.dur, ease: "back.out(1.4)" }, t + i * o.stagger);
      if (o.sfx) cue(t + i * o.stagger, o.sfx, panOf(b), 0.6);
    });
  }

  function nameCard(tl, el, t, opts) {
    const o = Object.assign({ hold: 2.5, sfx: "whoosh" }, opts || {});
    tl.fromTo(el, { x: -900 }, { x: 0, duration: 0.45, ease: "power3.out" }, t);
    if (o.sfx) cue(t, o.sfx, -0.6, 0.7);
    if (o.hold != null) tl.to(el, { x: -900, duration: 0.35, ease: "power2.in" }, t + 0.45 + o.hold);
  }

  function pin(tl, el, t, opts) {
    const o = Object.assign({ hold: null, sfx: "pop" }, opts || {});
    tl.fromTo(el, { y: -160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "bounce.out" }, t);
    if (o.sfx) cue(t + 0.3, o.sfx, -0.7, 0.7);
    if (o.hold != null) tl.to(el, { y: -160, opacity: 0, duration: 0.25, ease: "power2.in" }, t + 0.45 + o.hold);
  }

  function camera(tl, el, t0, t1, opts) {
    const o = Object.assign({ from: 1, to: 1.07, x0: 0, x1: 0, y0: 0, y1: 0, origin: "50% 50%" }, opts || {});
    tl.fromTo(el, { scale: o.from, x: o.x0, y: o.y0, transformOrigin: o.origin }, { scale: o.to, x: o.x1, y: o.y1, duration: Math.max(0.05, t1 - t0), ease: o.ease || "sine.inOut" }, t0);
  }

  function parallax(tl, shot, t0, t1, opts) {
    const o = Object.assign({ dx: 60, dy: 0, from: 1.03, to: 1.08, origin: "50% 50%", far: 0.3, near: 1.8 }, opts || {});
    const d = Math.max(0.05, t1 - t0);
    camera(tl, shot.querySelector(".tz-cam"), t0, t1, { from: o.from, to: o.to, origin: o.origin });
    for (const [cls, k] of [[".tz-far", o.far], [".tz-mid", 1], [".tz-near", o.near]]) {
      const el = shot.querySelector(cls);
      if (!el) continue;
      const hx = (o.dx * k) / 2, hy = (o.dy * k) / 2;
      tl.fromTo(el, { x: hx, y: hy }, { x: -hx, y: -hy, duration: d, ease: "none" }, t0);
    }
  }

  function shake(tl, el, t, opts) {
    const o = Object.assign({ amp: 14, dur: 0.35, seed: 5 }, opts || {});
    const r = mulberry32(o.seed), n = 7;
    for (let i = 0; i < n; i++) {
      const k = 1 - i / n;
      tl.to(el, { x: (r() - 0.5) * 2 * o.amp * k, y: (r() - 0.5) * 2 * o.amp * k, duration: o.dur / n, ease: "none" }, t + (i * o.dur) / n);
    }
    tl.to(el, { x: 0, y: 0, duration: 0.05 }, t + o.dur);
  }

  function whip(tl, overlay, t, opts) {
    const o = Object.assign({ out: null, in: null, dir: 1, dur: 0.36, seed: 9, sfx: "whoosh" }, opts || {});
    const { W, H } = stage();
    if (!overlay._tzBars) {
      const r = mulberry32(o.seed), n = Math.round(22 * H / 1080);
      for (let i = 0; i < n; i++) {
        const b = document.createElement("i"), h = 6 + r() * 22;
        b.style.cssText = `left:${(r() * W * 0.78).toFixed(0)}px;top:${(r() * (H - 20)).toFixed(0)}px;width:${(380 + r() * 760).toFixed(0)}px;height:${h.toFixed(0)}px;opacity:${(0.55 + r() * 0.45).toFixed(2)}`;
        overlay.appendChild(b);
      }
      overlay._tzBars = true;
    }
    const h = o.dur / 2, d = o.dir;
    tl.fromTo(overlay, { x: d > 0 ? W + 30 : -W - 780 }, { x: d > 0 ? -W - 780 : W + 30, duration: o.dur, ease: "none" }, t - h);
    if (o.out) tl.fromTo(o.out, { x: 0 }, { x: -320 * d, duration: h, ease: "power2.in" }, t - h);
    if (o.in) tl.fromTo(o.in, { x: 320 * d }, { x: 0, duration: h * 1.3, ease: "power2.out" }, t);
    if (o.sfx) cue(t - h, o.sfx, 0, 0.8);
  }

  function burst(tl, t, opts) {
    const { W, H } = stage();
    const o = Object.assign({ out: null, in: null, dur: 0.5, seed: 21, cx: W / 2, cy: H / 2, colors: ["#a9c6ea", "#7fa7d9"], sfx: "whoosh", hit: "pop" }, opts || {});
    if (!o.in) throw new Error("TOON.burst: opts.in (incoming shot) is required");
    const r = mulberry32(o.seed + Math.round(t * 1000));
    const star = (n, inner, tip) => {
      const rot = r() * 6, pts = [];
      for (let k = 0; k < n * 2; k++) {
        const a = rot + (k * Math.PI) / n + (r() - 0.5) * (Math.PI / n) * 0.7;
        const rr = k % 2 ? inner[0] + r() * (inner[1] - inner[0]) : tip[0] + r() * (tip[1] - tip[0]);
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return pts;
    };
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("class", "tz-burst-svg");
    const rim = (pts, fill) => {
      const g = document.createElementNS(NS, "g"), p = document.createElementNS(NS, "polygon");
      p.setAttribute("points", pts.map(([x, y]) => `${(o.cx + x).toFixed(1)},${(o.cy + y).toFixed(1)}`).join(" "));
      p.setAttribute("fill", fill); g.appendChild(p); svg.appendChild(g);
      gsap.set(g, { svgOrigin: `${o.cx} ${o.cy}` });
      return g;
    };
    const A = rim(star(24, [0.3, 0.5], [0.95, 1.25]), o.colors[0]);
    const B = rim(star(30, [0.62, 0.74], [0.95, 1.12]), o.colors[1]);
    o.in.parentNode.insertBefore(svg, o.in);
    const mask = star(26, [0.8, 0.88], [0.97, 1.06]);
    const cid = "tzburst" + uid++, cp = document.createElementNS(NS, "clipPath"), mp = document.createElementNS(NS, "polygon");
    cp.setAttribute("id", cid); cp.setAttribute("clipPathUnits", "userSpaceOnUse");
    mp.setAttribute("points", mask.map(([x, y]) => `${(o.cx + x).toFixed(3)},${(o.cy + y).toFixed(3)}`).join(" "));
    cp.appendChild(mp); svg.appendChild(cp);
    gsap.set(mp, { svgOrigin: `${o.cx} ${o.cy}` });
    const t0 = t - o.dur, R1 = 1650 * Math.max(1, Math.hypot(W, H) / 2203);
    tl.set(svg, { opacity: 0 }, 0);
    tl.set(svg, { opacity: 1 }, t0);
    tl.set(svg, { opacity: 0 }, t + 0.02);
    tl.set(o.in, { opacity: 1 }, t0);
    tl.fromTo(A, { scale: 6, rotation: -18 }, { scale: R1 * 1.25, rotation: 0, duration: o.dur, ease: "power2.in" }, t0);
    tl.fromTo(B, { scale: 5, rotation: 12 }, { scale: R1 * 1.12, rotation: 0, duration: o.dur, ease: "power2.in" }, t0);
    tl.set(o.in, { clipPath: `url(#${cid})` }, t0);
    tl.fromTo(mp, { scale: 4 }, { scale: R1, duration: o.dur, ease: "power2.in" }, t0);
    tl.set(o.in, { clipPath: "none" }, t + 0.02);
    if (o.out) tl.fromTo(o.out, { scale: 1 }, { scale: 1.08, duration: o.dur, ease: "power1.in" }, t0);
    if (o.in) tl.fromTo(o.in, { scale: 1.1 }, { scale: 1, duration: o.dur + 0.35, ease: "power2.out", immediateRender: false }, t0);
    if (o.sfx) cue(t0, o.sfx, 0, 0.75);
    if (o.hit) cue(t - 0.02, o.hit, 0, 0.6);
  }

  function iris(tl, el, t, opts) {
    const o = Object.assign({ at: "50% 50%", hold: 0.5, to: 9, dur: 0.5 }, opts || {});
    tl.fromTo(el, { clipPath: `circle(120% at ${o.at})` }, { clipPath: `circle(${o.to}% at ${o.at})`, duration: o.dur, ease: "power2.inOut" }, t);
    tl.fromTo(el, { clipPath: `circle(${o.to}% at ${o.at})` }, { clipPath: `circle(0% at ${o.at})`, duration: 0.22, ease: "power2.in", immediateRender: false }, t + o.dur + o.hold);
  }

  // Multi-plane camera. Every element with data-z inside the shot is a depth plane: z 0 = sky (fixed),
  // 1 = the subject plane, >1 = foreground (moves and zooms more). keys: [{ t, x, y, s, ease }] in
  // camera units (px at z 1); between keys the camera eases (bell curve by default) and holds after.
  // One key list across a wide/tall world = a one-shot move; two keys with ease "none" = slow drift.
  function move(tl, shot, keys, opts) {
    const o = Object.assign({ ox: "50%", oy: "50%", ease: "power2.inOut" }, opts || {});
    const planes = [...shot.querySelectorAll("[data-z]")];
    if (!planes.length) throw new Error("TOON.move: no [data-z] planes in " + (shot.id || "shot"));
    const ks = keys.map((k) => Object.assign({ x: 0, y: 0, s: 1 }, k));
    const st = (z, k) => ({ x: -k.x * z, y: -k.y * z, scale: 1 + (k.s - 1) * z });
    for (const el of planes) {
      const z = +el.getAttribute("data-z");
      tl.set(el, Object.assign({ transformOrigin: `${o.ox} ${o.oy}` }, st(z, ks[0])), Math.max(0, ks[0].t - 0.001));
      for (let i = 1; i < ks.length; i++) {
        const a = ks[i - 1], b = ks[i];
        tl.fromTo(el, st(z, a), Object.assign(st(z, b), { duration: Math.max(0.05, b.t - a.t), ease: b.ease || o.ease, immediateRender: false }), a.t);
      }
    }
  }

  // Handheld / walking camera: small seeded drift of a wrapper (never the element that `move` drives).
  function bob(tl, el, t0, t1, opts) {
    const o = Object.assign({ amp: 6, rot: 0.4, period: 1.1, seed: 3, walk: false }, opts || {});
    const r = mulberry32(o.seed);
    let t = t0, i = 0, last = { x: 0, y: 0, rotation: 0 };
    while (t < t1 - 0.05) {
      const d = Math.min(o.period * (0.8 + r() * 0.4), t1 - t);
      const nx = o.walk ? (i % 2 ? 1 : -1) * o.amp * 0.6 : (r() - 0.5) * 2 * o.amp;
      const ny = o.walk ? (i % 2 ? o.amp : -o.amp * 0.4) : (r() - 0.5) * 2 * o.amp;
      const next = { x: nx, y: ny, rotation: (r() - 0.5) * 2 * o.rot };
      tl.fromTo(el, last, Object.assign({}, next, { duration: d, ease: "sine.inOut", immediateRender: false }), t);
      last = next; t += d; i++;
    }
    tl.to(el, { x: 0, y: 0, rotation: 0, duration: 0.2, ease: "sine.out" }, t1 - 0.05);
  }

  function cuts(tl, shots, times, opts) {
    shots.forEach((s, i) => {
      tl.set(s, { opacity: i === 0 ? 1 : 0 }, 0);
      if (i > 0) tl.set(s, { opacity: 1 }, times[i]);
      if (i < shots.length - 1) tl.set(s, { opacity: 0 }, times[i + 1]);
    });
    if (!(opts && opts.cine === false)) cine(tl, shots, times, opts && opts.end);
  }

  // Film-camera depth on every shot (the user wants each shot cinematic): far/near planes drift against the mid
  // plane, a soft foreground prop slides past the lens, and the background racks into focus at the cut.
  // Planes that already carry x tweens are left alone; data-nocine="1" on a shot skips it, "lens" skips the prop.
  const FG_IN = /apartment|bedroom|office|hallway|desk_night|lab|server|factory/, FG_OUT = /street|night_town/;
  function cine(tl, shots, times, end) {
    const T1 = end || Math.max(tl.duration(), times[times.length - 1] + 2);
    const hasX = (el) => tl.getTweensOf(el).some((tw) => tw.vars && ("x" in tw.vars || "y" in tw.vars));
    const hasF = (el) => el.style.filter || tl.getTweensOf(el).some((tw) => tw.vars && "filter" in tw.vars);
    shots.forEach((s, i) => {
      const no = s.getAttribute("data-nocine") || "";
      if (no === "1") return;
      const t0 = times[i], t1 = i + 1 < shots.length ? times[i + 1] : T1, d = t1 - t0;
      if (!(d > 0.4)) return;
      const r = mulberry32(31 + i * 17 + Math.round(t0 * 100)), dir = i % 2 ? -1 : 1;
      const A = 70 * Math.min(1.5, Math.max(0.6, d / 4)), dy = (r() - 0.5) * A * 0.5;
      const far = s.querySelector(".tz-far"), near = s.querySelector(".tz-near"), cam = s.querySelector(".tz-cam");
      if (far && !hasX(far)) tl.fromTo(far, { x: dir * A * 0.4, y: dy * 0.4, scale: 1.08, transformOrigin: "50% 50%" }, { x: -dir * A * 0.4, y: -dy * 0.4, scale: 1.08, duration: d, ease: "sine.inOut", immediateRender: false }, t0);
      if (near && near.childElementCount && !hasX(near)) tl.fromTo(near, { x: -dir * A * 0.9, y: -dy }, { x: dir * A * 0.9, y: dy, duration: d, ease: "sine.inOut", immediateRender: false }, t0);
      if (far && d > 2.4 && !hasF(far)) tl.fromTo(far, { filter: "blur(6px)" }, { filter: "blur(0px)", duration: 0.8, ease: "power2.out", immediateRender: false }, t0);
      const bg = far && far.querySelector("img.tz-bg"), src = bg ? bg.getAttribute("src") : "";
      if (!cam || no === "lens" || !src || !(FG_IN.test(src) || FG_OUT.test(src))) return;
      const pick = FG_OUT.test(src) ? "fg_branch" : ["fg_plant", "fg_lamp"][Math.floor(r() * 2)], flip = r() < 0.5;
      const lens = document.createElement("div");
      lens.className = "tz-lens";
      lens.style.cssText = "position:absolute;inset:0;pointer-events:none";
      const fx = document.createElement("div");
      fx.style.cssText = "position:absolute;inset:0;transform:" + (flip ? "scaleX(-1)" : "none") + " scale(1.18);transform-origin:50% 50%;filter:blur(4px)";
      fx.innerHTML = '<img class="tz-fg" alt="" src="assets/bg/' + pick + '.soft.png">';
      lens.appendChild(fx);
      cam.parentNode.insertBefore(lens, cam.nextSibling);
      tl.fromTo(lens, { x: -dir * A * 2.4, y: -dy * 1.5 }, { x: dir * A * 2.4, y: dy * 1.5, duration: d, ease: "sine.inOut", immediateRender: false }, t0);
    });
  }

  function scene(id) {
    const D = window.TOON_DATA;
    if (!D) throw new Error("TOON_DATA missing: run ./make.sh align (writes film/assets/data/words.js)");
    const sec = D.sections.find((s) => s.id === id);
    if (!sec) throw new Error("TOON.scene: no section " + id);
    const start = sec.start, dur = sec.end - sec.start;
    const rel = (x) => +(x - start).toFixed(3);
    const lines = D.lines.filter((l) => l.section === id).map((l) => ({
      i: l.i, text: l.text, start: rel(l.start), end: rel(l.end),
      words: l.words.map((w) => ({ w: w.w, start: rel(w.start), end: rel(w.end) })),
    }));
    const words = [].concat(...lines.map((l) => l.words));
    const S = {
      id, start, dur, lines, words,
      line: (n) => lines[n],
      at(word, nth) {
        const f = fold(word);
        let k = 0;
        for (const w of words) if (fold(w.w) === f && k++ === (nth || 0)) return w.start;
        throw new Error(`TOON.scene(${id}).at: word "${word}" #${nth || 0} not found`);
      },
      phrase(text, nth) {
        const want = text.split(/\s+/).map(fold).filter(Boolean);
        let k = 0;
        for (let i = 0; i + want.length <= words.length; i++) {
          if (want.every((f, j) => fold(words[i + j].w) === f) && k++ === (nth || 0)) return { start: words[i].start, end: words[i + want.length - 1].end };
        }
        throw new Error(`TOON.scene(${id}).phrase: "${text}" #${nth || 0} not found`);
      },
      cut: (n, lead) => Math.max(0, lines[n].start - (lead == null ? 0.12 : lead)),
    };
    currentScene = S;
    for (let i = CUES.length - 1; i >= 0; i--) if (CUES[i].scene === id) CUES.splice(i, 1);
    return S;
  }

  window.TOON = {
    INK, SKIN, HAIR, OUTFIT, POSES, CAST, ORIGIN,
    rng: mulberry32, fold, visemes, makeChar,
    scene, actor, talk, idle, pose, gestures, look, brows, setMouth,
    cine, enter, exit, pop, bubble, statPill, kinetic, splitChars, chart, bars, nameCard, pin, camera, parallax, shake, whip, burst, iris, cuts, cue, amb, clip,
    stage, move, bob,
  };
})();
