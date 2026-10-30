// Illustrated background presets: one function per preset, returning a full 1920x1080 SVG string.
import { W, H, rng, f, P, R, C, E, L, G, poly, svg, glow, shadow, fillLin, clip, vignette, rrect, blob, scallopLine, tone } from "./kit.mjs";
import * as p from "./props.mjs";
import * as w from "./props_work.mjs";
import { readFileSync } from "node:fs";

const SH = "#1a1020";
export const BG = {};

BG.night_town = () => {
  let b = fillLin(`M0 0 L${W} 0 L${W} ${H} L0 ${H} Z`, [[0, "#16214a"], [0.5, "#2c4178"], [1, "#4a5f98"]]);
  b += p.stars(51, 0, 0, W, 560, 120) + p.moon(1500, 230, 82);
  b += p.cloud(1330, 330, 520, 61, "#53669f", 0.75, "#8d9fd4") + p.cloud(380, 230, 440, 71, "#4a5c95", 0.6, "#7f92c8") + p.cloud(1800, 120, 300, 81, "#4a5c95", 0.5, "#7f92c8");
  b += P(scallopLine(-20, 1960, 600, 6, 180, 34), "#34477c", 0.7) + P(scallopLine(-20, 1960, 650, 5, 120, 40), "#2b3b6c");
  const rl = rng(7);
  for (let i = 0; i < 26; i++) b += C(rl() * W, 660 + rl() * 60, 2 + rl() * 1.5, "#f2c46a", 0.6);
  const r = rng(91);
  let x = -20;
  while (x < 1960) { const w = 90 + r() * 110, h = 110 + r() * 150; b += p.skyBlock(x, 790, w, h, Math.floor(r() * 1e6), ["#2a3866", "#26335e", "#2e3c6c"][Math.floor(r() * 3)]); x += w + 14 + r() * 30; }
  b += fillLin(`M0 700 L${W} 700 L${W} 900 L0 900 Z`, [[0, "#3d5088", 0], [0.6, "#3d5088", 0.55], [1, "#3d5088", 0.2]]);
  const r2 = rng(17);
  for (const [hx, w] of [[-60, 300], [330, 220], [1440, 230], [1700, 270]]) {
    const h = 260 + r2() * 80;
    b += p.townHouse(hx, 962, w * 0.62, w * 0.38, h, Math.floor(r2() * 1e6), ["#40518a", "#485a93", "#3c4c84"][Math.floor(r2() * 3)], ["#2b2f58", "#352f5c", "#2a3460"][Math.floor(r2() * 3)], 0.65);
  }
  b += p.tree(300, 962, 0.95, 401, "#1f3a44", "#28505a", "#33646c") + p.tree(1690, 962, 1.05, 411, "#1f3a44", "#28505a", "#33646c") + p.tree(1915, 962, 0.85, 421, "#1f3a44", "#28505a", "#33646c");
  b += p.hedge(-20, 250, 900, 966, 3) + p.fence(250, 570, 966, 62, "#b9b3d0") + p.sittingCat(470, 908, 0.9) + p.hedge(1400, 1640, 906, 966, 9) + p.fence(1640, 1940, 966, 62, "#b9b3d0");
  b += R(0, 962, W, 30, "#5a6594") + R(0, 962, W, 6, "#7e8abb") + R(0, 986, W, 6, SH, 0.25);
  for (let k = 0; k < W; k += 140) b += R(k, 966, 3, 22, "#454f80");
  b += fillLin(`M0 992 L${W} 992 L${W} ${H} L0 ${H} Z`, [[0, "#2a335e"], [1, "#1f2648"]]);
  for (let k = 40; k < W; k += 260) b += R(k, 1034, 130, 9, "#6a74a4", 0.55, 4);
  b += p.streetLamp(150, 966, 240) + p.streetLamp(1580, 966, 240);
  return svg(b + vignette(0.18));
};

const roomWall = (y1, base, motif, seed, skirt, skirtH = 34) => p.wallpaper(0, y1, base, motif, seed) + p.skirting(y1 - skirtH, skirtH, skirt) + fillLin(`M0 0 L${W} 0 L${W} ${y1} L0 ${y1} Z`, [[0, SH, 0.12], [0.3, SH, 0], [1, SH, 0.06]]);

BG.bedroom = () => {
  let b = roomWall(760, "#ecc99c", "#ddb07c", 3, "#f3dfbf");
  b += glow(1240, 470, 520, 420, "#ffdc96", 0.3);
  b += R(548, 138, 664, 494, "#d9b88c") + R(548, 138, 664, 10, SH, 0.12) + p.nightView(566, 156, 628, 458, 41) + p.windowFrame(566, 156, 628, 458, "#f6ead2");
  b += R(526, 614, 708, 24, "#f8ead2", null, 4) + R(526, 614, 708, 5, "#ffffff", 0.6) + R(536, 638, 688, 10, SH, 0.18);
  b += p.curtain(462, 604, 132, 664, "#d8463a", true, 5) + p.curtain(1156, 1298, 132, 664, "#d8463a", false, 6) + p.curtainRod(444, 1316, 128);
  b += p.shelf(60, 200, 340, "#a8703f", 13) + p.shelf(60, 360, 340, "#a8703f", 17, p.plant(352, 360, 0.42, 4, "tall", "#3f7fc8", "#5b98dc"));
  b += p.frameArt(1420, 176, 300, 224, p.landscapeArt(1446, 202, 248, 172));
  b += p.planks(760, H, "#bb895c", "#a2734a", "#d6a878", 21) + p.floorShade(760);
  b += fillLin("M604 762 L1160 762 L1330 1080 L430 1080 Z", [[0, "#d6e4ff", 0.2], [1, "#d6e4ff", 0.04]]);
  b += p.braidedRug(820, 968, 430, 84);
  b += p.plant(150, 930, 1.35, 21, "leafy", "#e8e0d0", "#f6f0e4");
  b += p.nightstand(1150, 800, 170, 170, "#a8703f") + p.tableLamp(1235, 630, 1.05) + p.mug(1186, 630, 0.42, "#f4f1ea", "#3f7fc8", false);
  b += p.bed(1340, 1960, 440, 620, 840, { wood: "#8a5a34", blanket: "#3f8ee6", blanketD: "#2f72c4" });
  return svg(b + vignette());
};

BG.mid_door_close = () => {
  let b = roomWall(900, "#e6c99f", "#d8b88a", 9, "#f3dfbf", 44) + glow(960, 360, 900, 600, "#fff1c9", 0.3);
  b += shadow(960, 450, 560, 520, 0.18);
  b += R(456, 0, 1008, 900, "#f3e6cc") + R(456, 0, 14, 900, "#ffffff", 0.4) + R(1450, 0, 14, 900, SH, 0.12) + R(486, 0, 948, 900, "#d9c7a6") + R(500, 0, 920, 900, SH, 0.2);
  b += R(510, 0, 900, 900, "#8f5e3e");
  for (let k = 0; k < 10; k++) b += L(`M${540 + k * 88} 0 C${552 + k * 88} 300 ${532 + k * 88} 600 ${548 + k * 88} 900`, "#7a4a30", 2, 0.16);
  const panel = (x, y, w, h) => R(x, y, w, h, "#7a4a30", null, 6) + P(poly([[x, y], [x + w, y], [x + w - 18, y + 18], [x + 18, y + 18], [x + 18, y + h - 18], [x, y + h]]), "#6a3e26") + P(poly([[x + w, y], [x + w, y + h], [x, y + h], [x + 18, y + h - 18], [x + w - 18, y + h - 18], [x + w - 18, y + 18]]), "#ab7a50") + R(x + 18, y + 18, w - 36, h - 36, "#96633f") + R(x + 18, y + 18, w - 36, 6, "#ffffff", 0.1) +
    L(`M${x + 50} ${y + 40} C${x + w * 0.3} ${y + h * 0.4} ${x + w * 0.5} ${y + h * 0.3} ${x + w * 0.7} ${y + h * 0.6} M${x + w * 0.4} ${y + 50} C${x + w * 0.5} ${y + h * 0.5} ${x + w * 0.7} ${y + h * 0.4} ${x + w - 50} ${y + h - 50}`, "#7a4a30", 2, 0.14);
  b += panel(590, 50, 740, 400) + panel(590, 670, 740, 210);
  b += R(1340, 0, 70, 900, SH, 0.12) + R(510, 0, 900, 8, SH, 0.25);
  for (const hy of [120, 760]) b += R(512, hy, 18, 70, "#c9a052", null, 3) + R(512, hy, 18, 8, "#f0d698", 0.6);
  b += C(960, 250, 14, "#c9a052") + C(960, 250, 7, "#2a1d16") + C(956, 246, 3, "#f6e2a8");
  b += shadow(960, 600, 230, 60, 0.3) + P(rrect(776, 520, 368, 108, 16), "#b08a42") + R(776, 520, 368, 12, "#f0d698", 0.7, 8) + P(rrect(800, 548, 320, 52, 8), "#2a1d16") + R(800, 548, 320, 14, "#000000", 0.4) + R(788, 610, 344, 10, "#7d5f28", null, 5) + [796, 1124].flatMap((x) => [538, 610].map((y) => C(x, y, 5, "#7d5f28") + C(x - 1.5, y - 1.5, 2, "#f6e2a8", 0.6))).join("");
  b += shadow(1236, 540, 80, 90, 0.25) + P(rrect(1200, 470, 60, 140, 16), "#c9a052") + R(1206, 476, 8, 128, "#f6e2a8", 0.4, 4) + C(1230, 510, 26, "#d9b25f") + P("M1230 484 A26 26 0 0 1 1256 510 A30 26 0 0 0 1230 484 Z", "#a8823e") + C(1220, 500, 8, "#f6e2a8") + P("M1226 566 C1226 560 1234 560 1234 566 L1236 584 L1224 584 Z", "#2a1d16");
  b += p.lightSwitch(1480, 430);
  b += p.coatRack(1560, 190, 290);
  b += p.plant(250, 930, 1.6, 33, "tall", "#3f8f8e", "#57a8a6");
  b += p.planks(900, H, "#bb895c", "#a2734a", "#d6a878", 23) + p.floorShade(900, H, 0.32, 0.1);
  b += shadow(960, 1010, 470, 70, 0.4);
  const mat = "M600 940 L1320 940 L1380 1060 L540 1060 Z";
  b += P(mat, "#b5523b") + clip(mat, [...Array(40).keys()].map((k) => L(`M${520 + k * 22} 930 L${500 + k * 22} 1070`, "#a04634", 4, 0.6)).join("") + L("M632 956 L1288 956 L1334 1044 L586 1044 Z", "#e2a04a", 8, 0.85) + L("M652 968 L1268 968 L1306 1032 L614 1032 Z", "#e2a04a", 3, 0.5) + R(540, 940, 900, 10, "#ffffff", 0.15));
  for (let k = 0; k < 30; k++) b += L(`M${f(552 + k * 28)} 1060 L${f(550 + k * 28)} 1074`, "#c96a50", 4);
  return svg(b + vignette());
};

BG.desk_night = () => {
  let b = roomWall(760, "#2c3657", "#36416a", 11, "#3a4670");
  b += glow(1170, 520, 700, 420, "#8fd0ff", 0.18);
  b += p.fairyLights([[-20, 70], [420, 92], [860, 74], [1240, 96]], 7, 5);
  b += R(1264, 104, 552, 432, "#3a4468") + p.nightView(1280, 120, 520, 400, 103) + p.windowFrame(1280, 120, 520, 400, "#4a5478");
  b += R(1250, 520, 580, 20, "#4a5478", null, 4) + R(1250, 520, 580, 4, "#ffffff", 0.15) + R(1250, 540, 580, 8, SH, 0.3);
  b += p.curtain(1196, 1310, 92, 600, "#3b4a82", true, 7, "#8a96c8") + p.curtain(1770, 1884, 92, 600, "#3b4a82", false, 8, "#8a96c8") + p.curtainRod(1180, 1900, 88, "#4a4560");
  b += fillLin("M1300 548 L1790 548 L1960 1080 L1080 1080 Z", [[0, "#b8c8ff", 0.14], [1, "#b8c8ff", 0.02]]);
  b += p.frameArt(160, 160, 300, 380, fillLin("M186 186 L434 186 L434 514 L186 514 Z", [[0, "#f2a07a"], [1, "#7a5bb5"]]) + C(310, 300, 62, "#ffd66a", 0.9) + P(scallopLine(186, 434, 420, 4, 50, 20, 514), "#3b2f5a") + P(scallopLine(186, 434, 460, 5, 40, 12, 514), "#2a2148"), "#4a4560", "#efe6d2");
  b += p.wallClock(700, 196, 54, "#d8463a");
  b += p.corkboard(940, 128, 290, 210, 6);
  b += p.shelf(520, 380, 380, "#4a4560", 113, p.plant(860, 380, 0.42, 9, "leafy", "#e8e0d0", "#f6f0e4"));
  b += p.planks(760, H, "#262d47", "#1c2238", "#353e60", 29) + p.floorShade(760, H, 0.3, 0.2);
  b += glow(1540, 900, 360, 90, "#b8c8ff", 0.12);
  return svg(b + vignette(0.3));
};

BG.mid_desk = () => {
  let b = glow(1170, 520, 640, 420, "#8fd0ff", 0.3);
  b += P("M1130 720 L1210 720 L1222 784 L1118 784 Z", "#2e3448") + R(1186, 720, 24, 64, SH, 0.25) + P(rrect(1050, 770, 240, 22, 8), "#2e3448") + R(1056, 770, 228, 5, "#ffffff", 0.15);
  b += P(rrect(872, 352, 596, 386, 24), "#1a1f2c") + P(rrect(880, 360, 580, 370, 18), "#2b3246") + R(880, 360, 580, 6, "#ffffff", 0.12, 3);
  b += fillLin("M904 384 L1436 384 L1436 706 L904 706 Z", [[0, "#bfe4ff"], [1, "#8cc6f4"]]);
  b += R(904, 384, 532, 40, "#7fb6e8") + C(930, 404, 7, "#e86a5c") + C(952, 404, 7, "#f2c230") + C(974, 404, 7, "#3fb24f");
  b += R(940, 450, 300, 26, "#ffffff", 0.9, 6) + R(940, 494, 460, 16, "#ffffff", 0.6, 6) + R(940, 524, 420, 16, "#ffffff", 0.6, 6);
  b += R(940, 570, 200, 110, "#ffffff", 0.55, 8) + R(1170, 570, 200, 110, "#ffffff", 0.55, 8) + P("M960 660 L1010 610 L1040 640 L1080 596 L1120 660 Z", "#7fb6e8") + C(1300, 610, 22, "#f2c230", 0.8);
  b += P("M904 384 L1080 384 L960 706 L904 706 Z", "#ffffff", 0.1) + C(1170, 722, 4, "#7fd0ff");
  b += [[880, 372, "#fff3a6", -6], [912, 366, "#ffc4c4", 5]].map(([x, y, c, rot]) => `<g transform="translate(${x} ${y}) rotate(${rot})">` + R(-30, -4, 60, 56, SH, 0.2) + R(-32, -8, 60, 56, c) + L("M-24 10 L20 10 M-24 22 L12 22", "#6a5a6a", 3, 0.5) + `</g>`).join("");
  b += P("M0 790 L1920 790 L1920 1080 L0 1080 Z", "#704f3c") + R(0, 790, W, 22, "#8a6550") + R(0, 790, W, 5, "#a8806a") + R(0, 812, W, 10, SH, 0.3);
  for (let k = 0; k < 7; k++) b += L(`M${-100 + k * 330} 830 C${100 + k * 330} 860 ${200 + k * 330} 900 ${300 + k * 330} 1080`, "#5e4232", 3, 0.5);
  b += fillLin("M0 822 L1920 822 L1920 1080 L0 1080 Z", [[0, SH, 0], [1, SH, 0.3]]);
  b += glow(1170, 806, 540, 60, "#8fd0ff", 0.24);
  b += shadow(1170, 866, 260, 14, 0.4) + P("M960 820 L1380 820 L1400 860 L940 860 Z", "#2e3448") + P("M940 860 L1400 860 L1400 868 L940 868 Z", "#1a1f2c");
  for (let r = 0; r < 3; r++) for (let k = 0; k < 14; k++) b += R(f(962 + k * 29 + r * 6), f(826 + r * 11), 24, 8, "#4a5470", null, 2) + R(f(962 + k * 29 + r * 6), f(826 + r * 11), 24, 2, "#7a86a8", 0.6);
  b += shadow(1470, 852, 34, 7, 0.4) + P("M1450 818 C1450 804 1490 804 1490 818 L1490 838 C1490 852 1450 852 1450 838 Z", "#2e3448") + L("M1470 806 L1470 822", "#4a5470", 2) + L("M1470 806 C1470 790 1430 790 1400 830", "#2e3448", 3, 0.8);
  b += p.deskLamp(620, 792, 1.05, "#e86a5c");
  b += p.bookStack(120, 794, 12, 3) + P("M330 800 L620 790 L640 820 L350 830 Z", "#f4f1ea") + L("M360 806 L600 798 M364 814 L560 808", "#c9c3b6", 3) + P("M300 790 L560 784 L570 800 L310 808 Z", "#fbf6ea", 0.9);
  b += shadow(1556, 804, 70, 9, 0.4) + P("M1500 690 L1610 690 L1596 800 L1514 800 Z", "#f4f1ea") + P("M1572 690 L1610 690 L1596 800 L1566 800 Z", "#d9d3c6") + P(rrect(1494, 676, 122, 22, 6), "#d8463a") + R(1504, 726, 102, 26, "#f2c230", 0.9);
  b += P("M1560 676 L1600 560 L1608 562 L1570 676 Z", "#c9a06a") + P("M1574 676 L1622 566 L1630 570 L1584 676 Z", "#3f7fc8") + P("M1600 560 L1604 548 L1608 562 Z", "#2a2a2a") + P("M1590 676 L1594 580 L1602 580 L1598 676 Z", "#4f9b5a");
  b += p.mug(1700, 800, 0.95, "#f4f1ea", "#3f7fc8");
  b += p.plant(1830, 800, 0.9, 41, "leafy", "#e8e0d0", "#f6f0e4");
  return svg(b);
};

BG.hallway = () => {
  let b = R(0, 0, W, H, "#d6cab0");
  b += fillLin("M0 0 L1920 0 L1120 330 L800 330 Z", [[0, "#efe6d2"], [1, "#ddd1b8"]]);
  b += P("M0 0 L800 330 L800 620 L0 1080 Z", "#dccfb4") + P("M1920 0 L1120 330 L1120 620 L1920 1080 Z", "#c9ba9d");
  const wy = (x, frac, left) => { const t = left ? x / 800 : (1920 - x) / 800; const top = 330 * t, bot = 1080 - 460 * t; return top + (bot - top) * frac; };
  const quad = (xa, xb, v0, v1, left) => poly([[xa, wy(xa, v0, left)], [xb, wy(xb, v0, left)], [xb, wy(xb, v1, left)], [xa, wy(xa, v1, left)]]);
  for (const left of [true, false]) {
    const xa = left ? 0 : 1920, xb = left ? 800 : 1120;
    for (let k = 0; k < 14; k++) { const u = k / 14, x0 = xa + (xb - xa) * Math.pow(u, 0.7), x1 = xa + (xb - xa) * Math.pow(u + 0.012, 0.7); b += P(quad(x0, x1, 0, 0.58, left), left ? "#cbbd9f" : "#b8a988", 0.5); }
    b += P(quad(xa, xb, 0.58, 1, left), left ? "#c9b48f" : "#b8a37e");
    b += P(quad(xa, xb, 0.58, 0.605, left), "#f3ebd8") + P(quad(xa, xb, 0.6, 0.615, left), SH, 0.1);
    for (const [u0, u1] of [[0.02, 0.18], [0.26, 0.4], [0.5, 0.6], [0.68, 0.76], [0.82, 0.88]]) {
      const x0 = xa + (xb - xa) * Math.pow(u0, 0.75), x1 = xa + (xb - xa) * Math.pow(u1, 0.75);
      b += P(quad(x0, x1, 0.66, 0.93, left), SH, 0.08) + P(quad(x0, x1, 0.66, 0.672, left), SH, 0.12) + P(quad(x0, x1, 0.92, 0.93, left), "#ffffff", 0.25);
    }
    b += P(quad(xa, xb, 0.965, 1, left), "#8a6a4a") + P(quad(xa, xb, 0.965, 0.972, left), "#ffffff", 0.2);
  }
  b += P("M0 1080 L800 620 L1120 620 L1920 1080 Z", "#8c4c46");
  const run = "M330 1080 L880 620 L1040 620 L1590 1080 Z";
  let runPat = "";
  for (let k = 0; k < 12; k++) {
    const t0 = Math.pow(k / 12, 1.7), t1 = Math.pow((k + 0.5) / 12, 1.7), y0 = 620 + 460 * t0, y1 = 620 + 460 * t1, cx = 960, hw0 = 80 + 550 * t0, hw1 = 80 + 550 * t1;
    runPat += P(poly([[cx, y0 + (y1 - y0) * 0.1], [cx + (hw0 + hw1) * 0.12, (y0 + y1) / 2], [cx, y1 - (y1 - y0) * 0.1], [cx - (hw0 + hw1) * 0.12, (y0 + y1) / 2]]), "#e2a04a", 0.55);
  }
  b += P(run, "#a35a50") + clip(run, runPat + L("M392 1080 L888 628 M1528 1080 L1032 628", "#e2a04a", 6, 0.75) + L("M450 1080 L896 636 M1470 1080 L1024 636", "#e2a04a", 2, 0.5) + fillLin("M0 620 L1920 620 L1920 1080 L0 1080 Z", [[0, SH, 0.25], [0.4, SH, 0], [1, SH, 0.12]]));
  for (const [y, rx] of [[1000, 380], [780, 160], [680, 70]]) b += glow(960, y, rx, rx * 0.16, "#fff1c9", 0.28);
  b += R(800, 330, 320, 290, "#d4c7aa") + R(800, 330, 320, 290, SH, 0.04) + R(800, 586, 320, 34, "#b9a888");
  b += p.nightView(880, 378, 160, 180, 121) + p.windowFrame(880, 378, 160, 180, "#efe6d2", 10);
  b += p.curtain(850, 892, 362, 574, "#c96a5a", true, 3, "#e3b23c") + p.curtain(1028, 1070, 362, 574, "#c96a5a", false, 4, "#e3b23c") + R(842, 358, 236, 8, "#8a5a34", null, 4);
  b += shadow(960, 620, 110, 8, 0.4) + P(rrect(880, 572, 160, 12, 3), "#8a5a34") + R(890, 584, 8, 36, "#8a5a34") + R(1022, 584, 8, 36, "#8a5a34") + p.plant(990, 572, 0.32, 51, "leafy", "#e8e0d0", "#f6f0e4") + p.tableLamp(920, 572, 0.32, true, "#f2c98a", "#c96a5a");
  const door = (xa, xb, left, c, cs) => {
    const top = (x) => wy(x, 0.28, left), bot = (x) => wy(x, 0.985, left), dx = left ? 12 : -12;
    let s = P(poly([[xa - dx, bot(xa)], [xa - dx, top(xa) - 16], [xb + dx * 0.7, top(xb) - 12], [xb + dx * 0.7, bot(xb)]]), "#f3ebd8") + P(poly([[xb, bot(xb)], [xb, top(xb) - 4], [xb + dx * 0.7, top(xb) - 12], [xb + dx * 0.7, bot(xb)]]), SH, 0.15);
    s += P(poly([[xa, bot(xa)], [xa, top(xa)], [xb, top(xb)], [xb, bot(xb)]]), c);
    const ix = (u) => xa + (xb - xa) * u, iy = (u, v) => top(ix(u)) + (bot(ix(u)) - top(ix(u))) * v;
    for (const [v0, v1] of [[0.08, 0.44], [0.54, 0.92]]) s += P(poly([[ix(0.16), iy(0.16, v0)], [ix(0.84), iy(0.84, v0)], [ix(0.84), iy(0.84, v1)], [ix(0.16), iy(0.16, v1)]]), cs) + P(poly([[ix(0.16), iy(0.16, v0)], [ix(0.84), iy(0.84, v0)], [ix(0.84), iy(0.84, v0 + 0.02)], [ix(0.16), iy(0.16, v0 + 0.02)]]), SH, 0.2);
    s += P(poly([[ix(0.9), iy(0.9, 0)], [ix(1), iy(1, 0)], [ix(1), iy(1, 1)], [ix(0.9), iy(0.9, 1)]]), SH, 0.15);
    const ku = left ? 0.82 : 0.18, kr = Math.max(4, Math.abs(xb - xa) * 0.05);
    s += C(ix(ku), iy(ku, 0.52), kr, "#d9b25f") + C(ix(ku) - kr * 0.3, iy(ku, 0.52) - kr * 0.3, kr * 0.35, "#f6e2a8");
    return s;
  };
  b += door(120, 300, true, "#8a5a3c", "#7a4a30") + door(500, 600, true, "#8a5a3c", "#7a4a30") + door(700, 750, true, "#8a5a3c", "#7a4a30");
  b += door(1220, 1170, false, "#7a4e34", "#6a4028") + door(1420, 1320, false, "#7a4e34", "#6a4028");
  const art = (xa, xb, left, c1, c2) => { const y = (x, v) => wy(x, v, left), ix = (u) => xa + (xb - xa) * u; return P(quad(xa, xb, 0.3, 0.5, left), "#a8703f") + P(poly([[ix(0.1), y(ix(0.1), 0.33)], [ix(0.9), y(ix(0.9), 0.33)], [ix(0.9), y(ix(0.9), 0.47)], [ix(0.1), y(ix(0.1), 0.47)]]), c1) + P(poly([[ix(0.1), y(ix(0.1), 0.42)], [ix(0.5), y(ix(0.5), 0.37)], [ix(0.9), y(ix(0.9), 0.43)], [ix(0.9), y(ix(0.9), 0.47)], [ix(0.1), y(ix(0.1), 0.47)]]), c2); };
  b += art(360, 450, true, "#9fc8e0", "#5f9a6a") + art(1560, 1500, false, "#f2d0a0", "#c96a5a");
  b += p.sconce(330, wy(330, 0.22, true), 0.8) + p.sconce(640, wy(640, 0.24, true), 0.5) + p.sconce(1560, wy(1560, 0.22, false), 0.75);
  for (const [x, y, rx, ry] of [[960, 104, 130, 24], [960, 226, 74, 14], [960, 296, 42, 8]]) b += glow(x, y + 40, rx * 3.2, ry * 9, "#fff1c9", 0.3) + E(x, y - ry * 0.5, rx * 1.1, ry, "#c9bc9f") + E(x, y, rx, ry, "#fffbe8") + E(x, y + ry * 0.2, rx * 0.6, ry * 0.5, "#ffffff");
  b += p.plant(80, 1080, 1.5, 61, "tall", "#c96a5a", "#dc8270");
  return svg(b + vignette());
};

BG.mid_doorframe = () => {
  const wall = "M1340 0 L1920 0 L1920 1080 L1340 1080 Z M1420 120 L1420 1080 L1880 1080 L1880 120 Z";
  let b = `<path d="${wall}" fill="#cdbf9f" fill-rule="evenodd"/>`;
  b += `<g clip-path="url(#dfw)"><defs><clipPath id="dfw"><path d="${wall}" clip-rule="evenodd"/></clipPath></defs>`;
  for (let y = 40; y < 1080; y += 110) b += P(`M1380 ${y - 13} C1389 ${y - 4} 1389 ${y + 4} 1380 ${y + 13} C1371 ${y + 4} 1371 ${y - 4} 1380 ${y - 13} Z`, "#bfae8a", 0.6);
  b += R(1340, 0, 30, 1080, SH, 0.1) + `</g>`;
  b += shadow(1650, 600, 330, 560, 0.2);
  b += P("M1388 88 L1912 88 L1912 1080 L1880 1080 L1880 120 L1420 120 L1420 1080 L1388 1080 Z", "#f3ebd8") + P("M1388 88 L1912 88 L1904 98 L1398 98 L1398 1080 L1388 1080 Z", "#ffffff", 0.45) + P("M1880 120 L1900 100 L1900 1080 L1880 1080 Z", SH, 0.1);
  b += L("M1406 1080 L1406 106 L1894 106 L1894 1080", "#d9cdb0", 3, 0.8);
  b += R(1420, 120, 24, 960, SH, 0.14) + R(1420, 120, 460, 18, SH, 0.18);
  b += p.lightSwitch(1350, 460);
  return svg(b);
};

const paintWall = (y1, base, y0 = 0) => R(0, y0, W, y1 - y0, base) + fillLin(`M0 ${y0} L${W} ${y0} L${W} ${y1} L0 ${y1} Z`, [[0, SH, 0.14], [0.35, SH, 0], [1, SH, 0.08]]);
const ceiling = (y, c) => R(0, 0, W, y, c) + R(0, y - 8, W, 8, SH, 0.18) + R(0, y, W, 14, SH, 0.1);
const carpet = (y0, c, seed) => {
  let s = R(0, y0, W, H - y0, c);
  const r = rng(seed);
  for (let i = 0; i < 420; i++) s += R(r() * W, y0 + r() * (H - y0), 3, 3, i % 2 ? tone(c, 0.12) : tone(c, -0.12), 0.5);
  return s + p.floorShade(y0, H, 0.3, 0.12);
};
const tiles = (y0, a, b2, line, vx = 960) => {
  let s = R(0, y0, W, H - y0, a);
  const rows = 7;
  for (let k = 0; k < rows; k++) {
    const t0 = Math.pow(k / rows, 1.6), t1 = Math.pow((k + 1) / rows, 1.6), ya = y0 + (H - y0) * t0, yb = y0 + (H - y0) * t1;
    for (let i = -14; i < 14; i++) if ((i + k) % 2) {
      const xa0 = vx + i * (110 + 300 * t0), xa1 = vx + (i + 1) * (110 + 300 * t0), xb0 = vx + i * (110 + 300 * t1), xb1 = vx + (i + 1) * (110 + 300 * t1);
      s += P(poly([[xa0, ya], [xa1, ya], [xb1, yb], [xb0, yb]]), b2);
    }
    s += R(0, ya - 1, W, 2, line, 0.4);
  }
  return s + p.floorShade(y0, H, 0.24, 0.1);
};
const fg = (b) => svg(b, false);

BG.office = () => {
  let b = paintWall(760, "#8fa3b8") + ceiling(70, "#dfe4ea");
  for (const cx of [420, 960, 1500]) b += w.ceilingPanel(cx, 34, 240, 760);
  b += glow(680, 380, 700, 360, "#fff6d8", 0.25);
  b += w.officeWindow(180, 150, 1000, 470, 5);
  b += w.whiteboard(1340, 170, 380, 270, "chart");
  b += p.wallClock(1820, 150, 50, "#3a4458");
  b += R(0, 728, W, 32, "#e6eaee") + R(0, 728, W, 5, "#ffffff", 0.5) + R(0, 756, W, 4, SH, 0.2);
  b += carpet(760, "#5f6f86", 31);
  b += w.officeDesk(1250, 1890, 640, 1080);
  b += w.monitorFront(1560, 642, 320, 200, "#2b3246", true);
  b += p.mug(1780, 642, 0.7, "#f4f1ea", "#3f7fc8", false) + p.bookStack(1290, 642, 5, 2);
  b += p.plant(90, 900, 1.5, 71, "tall", "#e8e0d0", "#f6f0e4");
  return svg(b + vignette(0.2));
};

BG.server = () => {
  let b = paintWall(820, "#3e4f63") + ceiling(120, "#2e3b4c");
  for (let x = 0; x < W; x += 160) b += R(x, 0, 4, 120, SH, 0.25);
  b += w.cableTray(0, W, 150, 41);
  for (const cx of [260, 960, 1660]) b += w.ceilingPanel(cx, 96, 200, 820);
  b += w.perspFloor(820, "#4a5d73", "#33424f", "#6c829a");
  for (const [x, wd] of [[40, 300], [380, 300], [1240, 300], [1580, 300]]) b += w.serverRack(x, 200, wd, 640, x + 7);
  b += glow(960, 560, 360, 360, "#6fb8ff", 0.2) + w.serverRack(760, 260, 400, 580, 99, "#334457");
  return svg(b + vignette(0.3));
};

BG.street = () => {
  let b = fillLin(`M0 0 L${W} 0 L${W} 780 L0 780 Z`, [[0, "#8ec2ea"], [1, "#e4f1f8"]]);
  b += glow(1640, 170, 260, 260, "#fff3c4", 0.6) + C(1640, 170, 72, "#fff1b8") + C(1640, 170, 60, "#fff8dc");
  b += w.dayCloud(420, 170, 420, 11) + w.dayCloud(1180, 110, 320, 21) + w.dayCloud(1860, 300, 260, 31);
  b += w.cityRow(-20, 1960, 760, 300, 500, 7, ["#b6cde2", "#c1d6e8", "#aac4dc"], "#eef7fc", 0.4, 1.4);
  const r = rng(77);
  let x = -40;
  const walls = ["#e8b48a", "#c9d6a6", "#e6c98a", "#b8c8de", "#e4a59a", "#d8c0a8"], awn = ["#d8463a", "#3f7fc8", "#4f9b5a", "#e3b23c", "#7a5bb5"];
  let i = 0;
  while (x < 1960) { const bw = 300 + r() * 120, bh = 400 + r() * 160; b += w.shopBuilding(x, 760, bw, bh, 200 + i, walls[i % walls.length], awn[i % awn.length]); x += bw + 6; i++; }
  b += R(0, 760, W, 70, "#d8d2c6") + R(0, 760, W, 6, "#ffffff", 0.4);
  for (let k = 0; k < W; k += 120) b += R(k, 760, 3, 70, "#b9b2a4");
  b += R(0, 822, W, 12, "#a9a397") + R(0, 822, W, 3, "#ffffff", 0.4);
  b += fillLin(`M0 834 L${W} 834 L${W} ${H} L0 ${H} Z`, [[0, "#5c6474"], [1, "#4a5160"]]);
  for (let k = 30; k < W; k += 240) b += R(k, 940, 140, 12, "#f4eee2", 0.85, 4);
  b += R(0, 834, W, 10, SH, 0.25);
  b += w.dayLamp(420, 800) + w.dayLamp(1500, 800);
  b += p.tree(980, 800, 1.05, 501, "#3f7a4a", "#4f9b5a", "#6db56a", "#6a4a34") + E(980, 800, 70, 10, "#8a7a5a");
  b += w.bench(1220, 800, 0.9) + w.hydrant(680, 800, 0.9) + w.trafficLight(1800, 812);
  b += w.car(300, 1030, 1.05, "#d8463a") + w.car(1600, 1060, 1.1, "#3f7fc8", true);
  return svg(b + vignette(0.14));
};

BG.factory = () => {
  let b = paintWall(780, "#7d8fa3") + R(0, 0, W, 330, "#6c7d90") + R(0, 322, W, 8, SH, 0.15);
  for (let x = 130; x < W; x += 420) b += R(x - 8, 132, 236, 136, "#5a6b7e") + fillLin(`M${x} 140 L${x + 220} 140 L${x + 220} 260 L${x} 260 Z`, [[0, "#d6ecf8"], [1, "#a8cfe6"]]) + R(x + 106, 140, 8, 120, "#5a6b7e") + R(x, 196, 220, 6, "#5a6b7e") + P(poly([[x, 230], [x + 70, 140], [x + 100, 140], [x, 258]]), "#ffffff", 0.3) + fillLin(poly([[x, 260], [x + 220, 260], [x + 420, 780], [x + 60, 780]]), [[0, "#f4fbff", 0.12], [1, "#f4fbff", 0]]);
  for (let x = 0; x < W; x += 120) b += R(x, 330, 4, 450, SH, 0.06);
  b += w.truss(0, W, 30, 80);
  b += R(0, 744, W, 36, "#5a6b7e") + R(0, 744, W, 5, "#ffffff", 0.2);
  b += fillLin(`M0 780 L${W} 780 L${W} ${H} L0 ${H} Z`, [[0, "#9aa4ae"], [1, "#7c8691"]]);
  const rf = rng(5);
  for (let i = 0; i < 18; i++) b += P(blob(rf() * W, 820 + rf() * 240, 40 + rf() * 80, 6 + rf() * 10, i, 7, 0.4), "#5d6670", 0.18);
  b += w.hazard(0, 1000, W, 18);
  for (const cx of [320, 960, 1600]) b += w.industrialLamp(cx, 300, 1, 1000);
  b += w.machine(1220, 800, 520, 440);
  b += w.conveyor(0, 1240, 660);
  for (const [cx, s] of [[120, 0.9], [420, 1], [760, 0.85], [1040, 0.95]]) b += w.crate(cx - 60, 660, s, ["#c98b55", "#d39a62"][Math.round(cx) % 2]);
  b += w.barrel(80, 1060, 0.95, "#e07a2e") + w.barrel(210, 1070, 0.9, "#3f7fc8");
  return svg(b + vignette(0.24));
};

BG.lab = () => {
  let b = paintWall(760, "#a9c9c6") + ceiling(60, "#e8efee");
  for (const cx of [560, 1460]) b += w.ceilingPanel(cx, 28, 260, 760);
  b += R(0, 520, W, 240, "#eef4f3") + R(0, 520, W, 6, SH, 0.1);
  for (let x = 0; x < W; x += 60) b += R(x, 520, 2, 240, "#c9d8d6");
  for (let y = 580; y < 760; y += 60) b += R(0, y, W, 2, "#c9d8d6");
  const labShelf = (y, seed) => {
    const r = rng(seed);
    let s = "", x = 170;
    while (x < 930) {
      const k = r(), c = ["#4fb3d9", "#7bd17f", "#f39a1e", "#d8463a", "#7a5bb5"][Math.floor(r() * 5)];
      s += k < 0.4 ? w.flask(x + 36, y, 0.62, c) : k < 0.75 ? w.beaker(x + 30, y, 0.7, c) : p.bookStack(x, y, seed + x, 2);
      x += 90 + r() * 40;
    }
    return s + shadow(550, y + 30, 440, 18, 0.3) + R(140, y, 820, 18, "#eef2f4") + R(140, y, 820, 4, "#ffffff", 0.7) + R(140, y + 14, 820, 4, SH, 0.18) + R(190, y + 18, 14, 40, "#9aa6b2") + R(900, y + 18, 14, 40, "#9aa6b2");
  };
  b += labShelf(250, 3) + labShelf(470, 9);
  b += w.whiteboard(1180, 140, 600, 380, "formula");
  b += tiles(760, "#dde6e6", "#c9d6d6", "#b4c4c4");
  b += w.labBench(1100, 1920, 640, 1080);
  b += w.testTubes(1560, 640, 0.75) + w.microscope(1830, 640, 0.75) + w.flask(1180, 640, 0.6, "#7a5bb5") + w.beaker(1420, 640, 0.6, "#4fb3d9");
  b += shadow(1300, 642, 60, 6, 0.4) + E(1300, 636, 56, 10, "#eaf6fa", 0.7) + E(1300, 634, 46, 6, "#a8e0b0", 0.8) + C(1288, 633, 4, "#4fb36a") + C(1310, 635, 3, "#4fb36a");
  b += p.plant(90, 900, 1.3, 81, "leafy", "#eef2f4", "#ffffff");
  return svg(b + vignette(0.18));
};

BG.studio = () => {
  const id = "stu";
  let b = `<defs><radialGradient id="${id}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#5aa0e8"/><stop offset="0.55" stop-color="#2f6fc0"/><stop offset="1" stop-color="#1c4a8e"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
  for (let i = 0; i < 24; i++) {
    const a0 = (i / 24) * Math.PI * 2, a1 = a0 + Math.PI / 24, R0 = 2400;
    b += P(`M960 430 L${f(960 + Math.cos(a0) * R0)} ${f(430 + Math.sin(a0) * R0)} L${f(960 + Math.cos(a1) * R0)} ${f(430 + Math.sin(a1) * R0)} Z`, "#ffffff", 0.06);
  }
  b += glow(960, 430, 700, 500, "#cfe6ff", 0.35);
  const r = rng(12);
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H, rr = 20 + r() * 70; b += glow(x, y, rr, rr, "#e8f4ff", 0.25 + r() * 0.2); }
  return svg(b + vignette(0.32));
};

BG.apartment = () => {
  let b = paintWall(790, "#8fa3b8") + ceiling(60, "#dfe4ea");
  b += R(0, 60, W, 18, "#eef1f4") + R(0, 74, W, 4, SH, 0.15);
  b += glow(580, 400, 560, 360, "#c8d8ff", 0.18);
  b += R(182, 152, 796, 476, "#7d90a6") + p.nightView(200, 170, 760, 440, 61) + p.windowFrame(200, 170, 760, 440, "#eef1f4");
  b += R(170, 610, 820, 22, "#eef1f4", null, 4) + R(170, 610, 820, 5, "#ffffff", 0.6) + R(180, 632, 800, 10, SH, 0.18);
  b += p.curtain(120, 250, 140, 680, "#e3b23c", true, 3, "#d8463a") + p.curtain(910, 1040, 140, 680, "#e3b23c", false, 4, "#d8463a") + p.curtainRod(100, 1060, 136, "#5a6478");
  b += w.doorFront(1440, 790, 300, 560);
  b += p.frameArt(1220, 330, 120, 120, fillLin("M1236 346 L1324 346 L1324 434 L1236 434 Z", [[0, "#f2a07a"], [1, "#f2d07a"]]) + C(1280, 384, 18, "#fff4c0") + P(scallopLine(1236, 1324, 410, 3, 30, 10, 434), "#5f9a6a"), "#3a4458");
  b += R(0, 756, W, 34, "#eef1f4") + R(0, 756, W, 5, "#ffffff", 0.5) + R(0, 786, W, 4, SH, 0.2);
  b += p.planks(790, H, "#b5835a", "#9c6e48", "#d0a274", 33) + p.floorShade(790);
  b += p.braidedRug(700, 980, 420, 70, ["#5f9ea0", "#f1d9a8", "#c96a5a", "#f1d9a8", "#3f7fc8"]);
  b += w.officeDesk(1060, 1380, 640, 900, "#a8703f", "#5a4a40");
  b += w.monitorFront(1210, 642, 190, 120, "#2b3246", false) + p.mug(1330, 642, 0.55, "#f4f1ea", "#d8463a") + p.bookStack(1080, 642, 7, 2);
  b += w.floorLamp(1840, 900, 0.95);
  b += p.plant(120, 930, 1.45, 91, "leafy", "#d9763a", "#e8915a");
  return svg(b + vignette(0.2));
};

BG.mid_house = () => readFileSync(new URL("./static/mid_house.svg", import.meta.url), "utf8");

BG.fg_plant = () => {
  let b = "";
  for (const [x, y, rot, len, wid, c] of [[1800, 1100, -50, 360, 120, "#3f7d4f"], [1860, 1110, -20, 420, 130, "#4b8f5a"], [1910, 1090, 12, 380, 120, "#3f7d4f"], [1740, 1120, -74, 300, 110, "#4b8f5a"], [1960, 1060, 40, 330, 110, "#56a064"], [1830, 1140, -4, 300, 100, "#56a064"], [1700, 1100, -36, 420, 130, "#4b8f5a"], [1880, 1120, -30, 520, 150, "#56a064"], [1940, 1100, -8, 480, 140, "#3f7d4f"]]) b += p.leaf(x, y, len, wid, rot, c, "#2f5f3c", true);
  b += p.pot(1830, 1180, 300, 240, "#c96a4a", "#dc8260");
  return fg(b);
};

BG.fg_lamp = () => {
  let b = P("M-40 1080 L-40 900 L340 900 L340 1080 Z", "#8a5a3a") + R(-40, 900, 380, 26, "#a8703f") + R(-40, 900, 380, 6, "#ffffff", 0.25) + R(-40, 926, 380, 12, SH, 0.25);
  b += p.tableLamp(150, 900, 2.2, true, "#f2c46a", "#4a5568");
  return fg(b);
};

BG.fg_branch = () => {
  const c = "#141c34";
  let b = `<path d="M-40 140 C200 120 420 60 640 -40 L700 -40 C470 90 260 170 -40 200 Z" fill="${c}"/>`;
  const r = rng(81);
  for (let i = 0; i < 26; i++) {
    const t = r(), x = -20 + t * 680, y = 150 - t * 170 + (r() - 0.5) * 90, s = 0.7 + r() * 0.8, rot = -30 + r() * 120;
    b += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})"><path d="M0 0 C30 -26 80 -26 110 0 C80 26 30 26 0 0 Z" fill="${i % 3 ? c : "#1c2747"}"/></g>`;
  }
  b += `<path d="M1700 1080 C1680 980 1760 920 1840 940 C1900 900 1980 930 1980 1080 Z" fill="${c}"/>`;
  return fg(b);
};

BG.grain = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><filter id="n" x="0" y="0" width="100%" height="100%">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>` +
  `<rect width="${W}" height="${H}" filter="url(#n)"/></svg>\n`;
