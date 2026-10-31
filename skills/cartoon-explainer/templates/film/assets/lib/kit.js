(function () {
  window.KIT = function (P, tl) {
    TOON.POSES.hold = { armL: 0, foreL: 0, armR: 4, foreR: 104, head: 0 };
    TOON.POSES.phone = { armL: 0, foreL: 0, armR: 4, foreR: 112, head: -4 };
    TOON.POSES.lift = { armL: 0, foreL: 0, armR: -20, foreR: 130, head: 3 };
    const sp = (base, o) => Object.assign({}, typeof base === "string" ? TOON.CAST[base] : base, o || {});
    const coat = (a, b) => ({ coat: a, shade: b, shirt: a });
      const CLOUD = (x, y, s, a, b) =>
        `<g class="kit-cloud"><ellipse cx="${x}" cy="${y + 8 * s}" rx="${130 * s}" ry="${40 * s}" fill="${b || "#e6ecf2"}"/><ellipse cx="${x}" cy="${y}" rx="${126 * s}" ry="${40 * s}" fill="${a || "#fbfaf6"}"/>` +
        `<circle cx="${x - 52 * s}" cy="${y - 18 * s}" r="${46 * s}" fill="${a || "#fbfaf6"}"/><circle cx="${x + 26 * s}" cy="${y - 34 * s}" r="${60 * s}" fill="${a || "#fbfaf6"}"/><circle cx="${x + 80 * s}" cy="${y - 6 * s}" r="${38 * s}" fill="${a || "#fbfaf6"}"/></g>`;
      const TREE = (x, y, s, col, dk) =>
        `<rect x="${x - 6 * s}" y="${y - 40 * s}" width="${12 * s}" height="${40 * s}" fill="#7a5a3c"/><circle cx="${x}" cy="${y - 70 * s}" r="${42 * s}" fill="${col}"/>` +
        `<circle cx="${x - 28 * s}" cy="${y - 46 * s}" r="${28 * s}" fill="${col}"/><circle cx="${x + 26 * s}" cy="${y - 44 * s}" r="${30 * s}" fill="${dk}"/><circle cx="${x + 12 * s}" cy="${y - 62 * s}" r="${30 * s}" fill="${dk}" opacity="0.6"/>`;
      const GLOW = (id, col, a) => `<defs><radialGradient id="${P}${id}"><stop offset="0" stop-color="${col}" stop-opacity="${a || 0.75}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>`;
      const LAND = (id, o) => {
        const hz = o.hz, rr = TOON.rng(o.seed);
        let s =
          `<defs><linearGradient id="${P}${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient>` +
          `<radialGradient id="${P}${id}sun"><stop offset="0" stop-color="#fff4d6"/><stop offset="0.4" stop-color="#fff4d6" stop-opacity="0.85"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></radialGradient></defs>` +
          `<rect width="1920" height="1080" fill="url(#${P}${id}sky)"/>`;
        if (o.sun) s += `<circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="220" fill="url(#${P}${id}sun)"/><circle cx="${o.sun[0]}" cy="${o.sun[1]}" r="62" fill="#fff8e4"/>`;
        if (!o.noCloud) s += CLOUD(360, 170, 1) + CLOUD(1120, 120, 0.8) + CLOUD(1640, 230, 0.65);
        s += o.fx || "";
        s += `<path d="M0 ${hz - 70} C280 ${hz - 170} 520 ${hz - 50} 760 ${hz - 100} C1000 ${hz - 160} 1240 ${hz - 40} 1480 ${hz - 120} C1680 ${hz - 180} 1820 ${hz - 90} 1920 ${hz - 110} L1920 1080 L0 1080 Z" fill="${o.far}"/>`;
        for (let i = 0; i < 9; i++) { const x = 80 + i * 210 + rr() * 60; s += TREE(x, hz - 40 + rr() * 30, 0.45 + rr() * 0.2, o.tree[0], o.tree[1]); }
        s +=
          `<path d="M0 ${hz + 10} C260 ${hz - 70} 560 ${hz + 20} 860 ${hz - 20} C1160 ${hz - 60} 1420 ${hz + 30} 1920 ${hz - 30} L1920 1080 L0 1080 Z" fill="${o.mid}"/>` +
          `<path d="M860 ${hz - 20} C1160 ${hz - 60} 1420 ${hz + 30} 1920 ${hz - 30} L1920 ${hz + 50} C1500 ${hz + 90} 1200 ${hz + 20} 860 ${hz + 40} Z" fill="${o.shade}" opacity="0.55"/>` +
          `<path d="M0 ${hz + 90} C500 ${hz + 60} 1300 ${hz + 120} 1920 ${hz + 70} L1920 1080 L0 1080 Z" fill="${o.near}"/>`;
        return s;
      };
      const BAMBOO = (x0, x1, y, seed, s) => {
        const rr = TOON.rng(seed), k = s || 1;
        let out = "";
        for (let x = x0; x < x1; x += 46 * k) {
          const h = (170 + rr() * 90) * k, lean = (rr() - 0.5) * 40 * k;
          out += `<path d="M${x} ${y} Q${x + lean * 0.3} ${y - h * 0.6} ${x + lean} ${y - h}" stroke="#8aa868" stroke-width="${7 * k}" fill="none" stroke-linecap="round"/>`;
          out += `<ellipse cx="${x + lean}" cy="${y - h + 20 * k}" rx="${38 * k}" ry="${54 * k}" fill="${rr() < 0.5 ? "#7fa36a" : "#6c9058"}"/>`;
          out += `<ellipse cx="${x + lean * 0.5 - 14 * k}" cy="${y - h * 0.55}" rx="${30 * k}" ry="${40 * k}" fill="#86ad70" opacity="0.9"/>`;
        }
        return out;
      };
      const PADDY = (y0, y1, seed, water, w) => {
        const rr = TOON.rng(seed), WD = w || 1920;
        let s = "";
        for (let i = 0; i < 4; i++) {
          const a = y0 + (y1 - y0) * Math.pow(i / 4, 1.3), b = y0 + (y1 - y0) * Math.pow((i + 1) / 4, 1.3);
          s += `<rect x="0" y="${a}" width="${WD}" height="${b - a + 1}" fill="${i % 2 ? "#a2c983" : "#b3d793"}"/>`;
          if (water) s += `<rect x="${rr() * (WD - 1000)}" y="${a + (b - a) * 0.25}" width="${500 + rr() * 500}" height="${(b - a) * 0.3}" rx="${(b - a) * 0.15}" fill="#d6eeee" opacity="0.45"/>`;
          for (let k = 0; k < 3 * WD / 1920; k++) s += `<rect x="${rr() * WD}" y="${a}" width="${4 + i * 2}" height="${b - a}" fill="#cdb98e" opacity="0.8"/>`;
          const rows = 1 + i, gap = 34 + i * 20, sz = 0.6 + i * 0.35;
          for (let r = 0; r < rows; r++) {
            const y = a + ((b - a) * (r + 0.7)) / (rows + 0.3);
            for (let x = ((r % 2) * gap) / 2 + rr() * 10; x < WD; x += gap) s += `<path d="M${x - 7 * sz} ${y} Q${x - 6 * sz} ${y - 10 * sz} ${x - 10 * sz} ${y - 18 * sz} Q${x} ${y - 10 * sz} ${x + 1 * sz} ${y - 22 * sz} Q${x + 3 * sz} ${y - 10 * sz} ${x + 10 * sz} ${y - 17 * sz} Q${x + 6 * sz} ${y - 8 * sz} ${x + 7 * sz} ${y} Z" fill="#7fae66"/>`;
          }
          s += `<rect x="0" y="${b - 3 - i}" width="${WD}" height="${5 + i * 2}" fill="#cdb98e"/>`;
        }
        return s;
      };
      const LANTERN = (x, y, s) =>
        `<g class="kit-lan"><path d="M${x} ${y - 70 * s} L${x} ${y - 42 * s}" stroke="#7a3e2a" stroke-width="${4 * s}"/>` +
        `<rect x="${x - 20 * s}" y="${y - 46 * s}" width="${40 * s}" height="${12 * s}" rx="${3 * s}" fill="#e2b04a"/>` +
        `<ellipse cx="${x}" cy="${y}" rx="${44 * s}" ry="${38 * s}" fill="#d8463a"/><ellipse cx="${x - 12 * s}" cy="${y - 6 * s}" rx="${16 * s}" ry="${26 * s}" fill="#ec6f60"/>` +
        `<path d="M${x + 14 * s} ${y - 34 * s} Q${x + 40 * s} ${y} ${x + 14 * s} ${y + 34 * s}" stroke="#b23a30" stroke-width="${5 * s}" fill="none"/>` +
        `<rect x="${x - 20 * s}" y="${y + 34 * s}" width="${40 * s}" height="${12 * s}" rx="${3 * s}" fill="#e2b04a"/>` +
        `<path d="M${x} ${y + 46 * s} L${x} ${y + 86 * s}" stroke="#e2b04a" stroke-width="${7 * s}" stroke-linecap="round"/></g>`;
      const ARECA = (x, y, h, s) => {
        let out = `<path d="M${x} ${y} Q${x + 14 * s} ${y - h * 0.5} ${x + 6 * s} ${y - h}" stroke="#a89a80" stroke-width="${16 * s}" fill="none" stroke-linecap="round"/>`;
        for (let k = 1; k < 9; k++) out += `<rect x="${x - 6 * s + 8 * s * Math.sin(k)}" y="${y - (h * k) / 9}" width="${18 * s}" height="${4 * s}" fill="#8f826a" opacity="0.6"/>`;
        const tx = x + 6 * s, ty = y - h;
        for (const [ax, ay, cx2, cy2] of [[-150, 40, -80, -50], [150, 30, 80, -60], [-110, 100, -60, 10], [120, 110, 60, 20], [-20, -110, -10, -60], [40, -100, 30, -60]])
          out += `<path d="M${tx} ${ty} Q${tx + cx2 * s} ${ty + cy2 * s} ${tx + ax * s} ${ty + ay * s}" stroke="#7fa36a" stroke-width="${22 * s}" fill="none" stroke-linecap="round"/>`;
        return out;
      };
      const JAR = (x, y, s) =>
        `<ellipse cx="${x}" cy="${y + 4}" rx="${110 * s}" ry="${18 * s}" fill="#000" opacity="0.14"/>` +
        `<path d="M${x - 60 * s} ${y - 190 * s} Q${x - 130 * s} ${y - 110 * s} ${x - 80 * s} ${y} L${x + 80 * s} ${y} Q${x + 130 * s} ${y - 110 * s} ${x + 60 * s} ${y - 190 * s} Z" fill="#8a5a3c"/>` +
        `<path d="M${x + 20 * s} ${y - 190 * s} L${x + 60 * s} ${y - 190 * s} Q${x + 130 * s} ${y - 110 * s} ${x + 80 * s} ${y} L${x + 30 * s} ${y} Q${x + 70 * s} ${y - 110 * s} ${x + 20 * s} ${y - 190 * s} Z" fill="#734a30"/>` +
        `<ellipse cx="${x}" cy="${y - 190 * s}" rx="${66 * s}" ry="${14 * s}" fill="#5a3a24"/><ellipse cx="${x}" cy="${y - 188 * s}" rx="${52 * s}" ry="${9 * s}" fill="#9fc7c4"/>`;
      const HOUSE = (x0, x1, gy, o) => {
        o = o || {};
        const h = o.h || 250, rh = o.roof || 190, rb = gy - h, rt = rb - rh, w = x1 - x0, bays = o.bays || 3, bw = (w - 40) / bays;
        const wall = o.wall || "#ecd9b0", wood = o.wood || "#9a6a44", roof = o.roofc || "#b4553a";
        let s = `<rect x="${x0 + 20}" y="${rb}" width="${w - 40}" height="${h}" fill="${wall}"/>`;
        for (let b = 0; b < bays; b++) {
          const bx = x0 + 20 + b * bw;
          if (b === Math.floor(bays / 2)) {
            s += `<rect x="${bx + 30}" y="${rb + 40}" width="${bw - 60}" height="${h - 40}" fill="${o.door || wood}"/>`;
            for (let k = 1; k < 4; k++) s += `<rect x="${bx + 30 + ((bw - 60) * k) / 4 - 3}" y="${rb + 40}" width="6" height="${h - 40}" fill="#000" opacity="0.15"/>`;
          } else {
            const wx = bx + bw * 0.22, ww = bw * 0.56, wy = rb + h * 0.28, wh = h * 0.38;
            s += `<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" fill="${o.win || "#7a5a3c"}"/>`;
            for (let k = 1; k < 5; k++) s += `<rect x="${wx + (ww * k) / 5 - 3}" y="${wy}" width="6" height="${wh}" fill="${o.bar || "#c9a77c"}"/>`;
          }
          s += `<rect x="${bx - 9}" y="${rb}" width="18" height="${h}" fill="${o.col || "#8a5a3c"}"/>`;
        }
        s += `<rect x="${x1 - 29}" y="${rb}" width="18" height="${h}" fill="${o.col || "#8a5a3c"}"/>`;
        s += `<rect x="${x0 + 20}" y="${rb}" width="${w - 40}" height="26" fill="#000" opacity="0.14"/>`;
        s += `<path d="M${x0 - 50} ${rb + 12} Q${x0 - 70} ${rb - 4} ${x0 - 84} ${rb - 34} L${x0 + 70} ${rt} L${x1 - 70} ${rt} L${x1 + 84} ${rb - 34} Q${x1 + 70} ${rb - 4} ${x1 + 50} ${rb + 12} Z" fill="${roof}"/>`;
        for (let x = x0 + 40; x < x1 - 20; x += 30) { const f = (x - x0) / w; s += `<path d="M${x0 + 70 + f * (w - 140)} ${rt + 6} L${x} ${rb + 6}" stroke="#000" stroke-opacity="0.12" stroke-width="7"/>`; }
        s += `<path d="M${x0 + 70} ${rt + 30} L${x1 - 70} ${rt + 30} L${x1 - 80} ${rt + 50} L${x0 + 80} ${rt + 50} Z" fill="#ffffff" opacity="0.1"/>`;
        s += `<rect x="${x0 + 50}" y="${rt - 18}" width="${w - 100}" height="24" rx="8" fill="${o.ridge || "#8f3f2a"}"/>`;
        s += `<path d="M${x0 + 54} ${rt - 6} Q${x0 + 20} ${rt - 10} ${x0 + 26} ${rt - 46} Q${x0 + 44} ${rt - 30} ${x0 + 60} ${rt - 18} Z M${x1 - 54} ${rt - 6} Q${x1 - 20} ${rt - 10} ${x1 - 26} ${rt - 46} Q${x1 - 44} ${rt - 30} ${x1 - 60} ${rt - 18} Z" fill="${o.ridge || "#8f3f2a"}"/>`;
        s += `<rect x="${x0}" y="${gy - 18}" width="${w}" height="26" rx="6" fill="${o.step || "#cbbca2"}"/>`;
        return s;
      };
      const COURT = (id, o) => {
        o = o || {};
        const n = !!o.night, gy = 650;
        let s = `<defs><linearGradient id="${P}${id}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${n ? "#1f2748" : "#bcdcef"}"/><stop offset="1" stop-color="${n ? "#4a4a78" : "#f4e8d2"}"/></linearGradient></defs>` +
          `<rect width="1920" height="1080" fill="url(#${P}${id}sk)"/>`;
        if (n) { const rr = TOON.rng(77); for (let i = 0; i < 70; i++) s += `<circle cx="${rr() * 1920}" cy="${rr() * 360}" r="${1.5 + rr() * 2.5}" fill="#fff6dc" opacity="${0.5 + rr() * 0.5}"/>`; }
        else s += CLOUD(300, 120, 0.8) + CLOUD(1500, 90, 0.7);
        s += o.fx || "";
        s += ARECA(110, gy, 560, 1) + ARECA(1830, gy, 600, 1.05) + BAMBOO(1640, 1920, gy - 200, 5, 0.9) + BAMBOO(0, 260, gy - 200, 6, 0.9);
        s += HOUSE(200, 1720, gy, n ? { wall: "#8e8070", door: "#f2c46a", win: "#f6d58a", bar: "#c9a46a", roofc: "#6e3a32", ridge: "#5a2e26", col: "#5a3a2a", step: "#7d7466" } : {});
        if (n) s += GLOW(id + "dg", "#f6c46a") + `<ellipse cx="960" cy="560" rx="380" ry="200" fill="url(#${P}${id}dg)"/>`;
        s += `<rect x="0" y="${gy}" width="1920" height="${1080 - gy}" fill="${n ? "#6e5f5a" : "#d9a07a"}"/>`;
        for (let k = 0; k < 9; k++) { const y = gy + 10 + Math.pow(k / 8, 1.6) * (1080 - gy); s += `<rect x="0" y="${y}" width="1920" height="4" fill="#000" opacity="0.08"/>`; }
        for (let k = -12; k <= 12; k++) s += `<path d="M${960 + k * 90} ${gy} L${960 + k * 260} 1080" stroke="#000" stroke-opacity="0.07" stroke-width="4"/>`;
        if (n) s += [500, 960, 1420].map((x) => LANTERN(x, 470, 0.9)).join("") + GLOW(id + "lg", "#ff8a6a") + [500, 960, 1420].map((x) => `<circle cx="${x}" cy="470" r="110" fill="url(#${P}${id}lg)"/>`).join("");
        else s += JAR(1640, 900, 0.9) + `<path d="M150 900 L210 900 L200 960 L160 960 Z" fill="#c8673f"/><ellipse cx="180" cy="884" rx="60" ry="34" fill="#7fae66"/>`;
        return s;
      };
      const BUF = (x, y, s) =>
        `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="214" rx="330" ry="26" fill="#000" opacity="0.14"/>` +
        `<rect x="-250" y="40" width="54" height="170" rx="20" fill="#56606b"/><rect x="140" y="40" width="54" height="170" rx="20" fill="#56606b"/>` +
        `<path d="M-330 -40 Q-372 40 -350 130" stroke="#5d6773" stroke-width="12" fill="none" stroke-linecap="round"/>` +
        `<ellipse cx="0" cy="0" rx="330" ry="150" fill="#6f7a86"/><circle cx="190" cy="-60" r="125" fill="#6f7a86"/><ellipse cx="-10" cy="70" rx="250" ry="70" fill="#7f8a96"/>` +
        `<rect x="-190" y="60" width="56" height="160" rx="20" fill="#6f7a86"/><rect x="210" y="60" width="56" height="160" rx="20" fill="#6f7a86"/>` +
        `<g transform="translate(360 -20)"><ellipse cx="0" cy="0" rx="96" ry="76" fill="#6f7a86"/><ellipse cx="64" cy="44" rx="62" ry="46" fill="#8a949e"/><circle cx="12" cy="-18" r="12" fill="#2c2427"/>` +
        `<path d="M-20 -60 C-90 -120 -150 -150 -150 -210 C-110 -160 -60 -130 10 -84 Z" fill="#e8dcc4"/><path d="M20 -66 C30 -130 0 -170 -40 -200 C20 -170 50 -120 44 -70 Z" fill="#d6c8aa"/></g></g>`;
      const HAT = '<g><path d="M86 180 Q300 222 514 180 L300 2 Z" fill="#ead8a8"/><path d="M300 2 L514 180 Q410 204 300 208 Z" fill="#d6bf8a"/>' +
        '<path d="M300 2 L196 192 M300 2 L404 196" stroke="#cdb47e" stroke-width="5" fill="none"/><path d="M86 180 Q300 222 514 180" stroke="#c4a76e" stroke-width="9" fill="none" stroke-linecap="round"/></g>';
      const hat = (rig) => rig.head.insertAdjacentHTML("beforeend", HAT);
      const THINK = (x, y, rx, ry, tx, ty) => {
        let s = "";
        for (let k = 0; k < 3; k++) { const f = (k + 1) / 4; s += `<circle cx="${tx + (x - tx) * f * 0.7}" cy="${ty + (y - ty) * f * 0.7}" r="${10 + k * 9}" fill="#fbfaf6"/>`; }
        for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; s += `<circle cx="${x + Math.cos(a) * rx * 0.82}" cy="${y + Math.sin(a) * ry * 0.78}" r="${Math.min(rx, ry) * 0.42}" fill="#fbfaf6"/>`; }
        return s + `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fbfaf6"/>`;
      };
      const FACE = (x, y, r, o) => {
        o = o || {};
        const sk = o.skin || "#f3c9a0", hc = o.hair || "#2c2427", rr = r * 0.78;
        let s = `<circle cx="${x}" cy="${y}" r="${r}" fill="${o.ring || "#ffffff"}"/><circle cx="${x}" cy="${y}" r="${rr}" fill="${sk}"/>`;
        s += `<path d="M${x - rr} ${y - rr * 0.05} C${x - rr} ${y - rr * 1.25} ${x + rr} ${y - rr * 1.25} ${x + rr} ${y - rr * 0.05} C${x + rr * 0.4} ${y - rr * 0.62} ${x - rr * 0.3} ${y - rr * 0.5} ${x - rr} ${y - rr * 0.05} Z" fill="${hc}"/>`;
        s += `<circle cx="${x - rr * 0.36}" cy="${y + rr * 0.02}" r="${rr * 0.1}" fill="#2c2427"/><circle cx="${x + rr * 0.36}" cy="${y + rr * 0.02}" r="${rr * 0.1}" fill="#2c2427"/>` +
          `<ellipse cx="${x - rr * 0.55}" cy="${y + rr * 0.32}" rx="${rr * 0.16}" ry="${rr * 0.09}" fill="#f29a9a" opacity="0.8"/><ellipse cx="${x + rr * 0.55}" cy="${y + rr * 0.32}" rx="${rr * 0.16}" ry="${rr * 0.09}" fill="#f29a9a" opacity="0.8"/>` +
          `<path d="M${x - rr * 0.3} ${y + rr * 0.36} Q${x} ${y + rr * (o.flat ? 0.4 : 0.62)} ${x + rr * 0.3} ${y + rr * 0.36}" stroke="#8a3f3a" stroke-width="${rr * 0.08}" fill="none" stroke-linecap="round"/>`;
        return s;
      };
      const BANG = (x, y, s, col) =>
        `<g><circle cx="${x}" cy="${y}" r="${46 * s}" fill="#fbfaf6"/><text x="${x}" y="${y + 24 * s}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${70 * s}" fill="${col || "#d8463a"}">!</text></g>`;
      const STAR = (x, y, r, col) => {
        let d = "";
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; d += (k ? "L" : "M") + (x + Math.cos(a) * rr).toFixed(1) + " " + (y + Math.sin(a) * rr).toFixed(1) + " "; }
        return `<path d="${d}Z" fill="${col || "#f2c230"}"/>`;
      };
      const SPARK = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r} Z" fill="#fff6d0"/>`;
      const PILL = (x, y, w, txt, col, fs) =>
        `<rect x="${x - w / 2 + 6}" y="${y - 44}" width="${w}" height="88" rx="44" fill="#000" opacity="0.15"/><rect x="${x - w / 2}" y="${y - 50}" width="${w}" height="88" rx="44" fill="#fbfaf6"/>` +
        `<text x="${x}" y="${y + 10}" text-anchor="middle" font-family="Nunito" font-weight="900" font-size="${fs || 48}" fill="${col || "#2c2427"}">${txt}</text>`;
      const CHECK = (x, y) => `<circle cx="${x}" cy="${y}" r="38" fill="#4caf6e"/><path d="M${x - 17} ${y + 1} L${x - 4} ${y + 15} L${x + 19} ${y - 13}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      const CUP = '<g transform="rotate(-104 440 856)"><path d="M408 808 L472 808 L466 866 Q440 876 414 866 Z" fill="#e6ecf2"/><ellipse cx="440" cy="808" rx="32" ry="8" fill="#c9a86a"/><rect x="408" y="824" width="64" height="8" fill="#4a7fb5" opacity="0.7"/></g>';
      const BOWL = (full) => '<g transform="rotate(-104 440 856)">' +
        (full ? '<ellipse cx="440" cy="826" rx="50" ry="24" fill="#fbfaf6"/><circle cx="424" cy="814" r="5" fill="#e6e0d0"/><circle cx="452" cy="818" r="5" fill="#e6e0d0"/>' : '<circle cx="428" cy="826" r="4" fill="#fbfaf6"/><circle cx="446" cy="828" r="4" fill="#fbfaf6"/><circle cx="458" cy="824" r="3.5" fill="#fbfaf6"/>') +
        '<path d="M386 830 Q440 902 494 830 Z" fill="#e6ecf2"/><path d="M386 830 L494 830" stroke="#4a7fb5" stroke-width="7"/><rect x="424" y="884" width="32" height="10" rx="4" fill="#cfd8e2"/>' +
        (full ? '<path d="M470 760 L420 836 M484 764 L432 840" stroke="#a87b52" stroke-width="7" stroke-linecap="round"/>' : "") + "</g>";
      const DRAGON = (id) => `<defs><clipPath id="${P}${id}dbody"><path d="M214 112 C238 118 252 136 250 156 C248 180 224 196 188 198 C150 200 116 192 104 172 C94 156 104 132 128 122 C152 112 190 106 214 112 Z"/></clipPath><clipPath id="${P}${id}dhead"><path d="M265 50 C296 50 318 66 324 90 C328 104 332 118 326 130 C320 140 308 146 300 150 C292 160 280 164 265 164 C250 164 238 160 230 150 C222 146 210 140 204 130 C198 118 202 104 206 90 C212 66 234 50 265 50 Z"/></clipPath><clipPath id="${P}${id}dtail"><path d="M112 146 C86 138 60 124 40 112 C34 109 30 112 32 118 C50 136 78 160 110 182 Z"/></clipPath></defs><g class="kit-wingB"><path d="M178 112 L160 44 Q124 32 84 34 Q110 54 88 74 Q118 80 112 102 Q136 102 148 116 Z" fill="#e48a84"/><path d="M178 112 L160 44 L112 102 Q136 102 148 116 Z" fill="#d27470" opacity="0.55"/><path d="M175 113 L157 45 L163 43 L181 111 Z M160 44 L86 33 L86 36 Z M160 44 L89 73 L91 76 Z M160 44 L111 101 L114 103 Z" fill="#177c8e"/><path d="M152 40 C158 36 166 38 168 46 C162 48 156 46 152 40 Z" fill="#177c8e"/></g><path d="M40 112 C30 104 20 100 8 98 C16 106 20 112 22 118 C16 124 12 130 8 136 C20 134 30 128 38 122 Z" fill="#177c8e"/><path d="M112 146 C86 138 60 124 40 112 C34 109 30 112 32 118 C50 136 78 160 110 182 Z" fill="#27a9bd"/><g clip-path="url(#${P}${id}dtail)"><path d="M20 124 C50 140 80 160 112 176 L112 200 L10 200 Z" fill="#a9e1e8"/></g><path d="M48 123 C49 115 53 110 59 108 C58 116 60 117 62 126 Z" fill="#177c8e"/><path d="M68 133 C69 125 73 118 79 116 C78 124 80 127 82 136 Z" fill="#177c8e"/><path d="M88 142 C89 134 93 125 99 123 C98 131 100 136 102 145 Z" fill="#177c8e"/><path d="M128 125 C130 116 135 108 142 106 C140 115 143 118 146 125 Z" fill="#177c8e"/><path d="M154 118 C156 109 161 99 168 97 C166 106 169 111 172 118 Z" fill="#177c8e"/><path d="M180 114 C182 105 187 95 194 93 C192 102 195 107 198 114 Z" fill="#177c8e"/><path d="M214 112 C238 118 252 136 250 156 C248 180 224 196 188 198 C150 200 116 192 104 172 C94 156 104 132 128 122 C152 112 190 106 214 112 Z" fill="#27a9bd"/><g clip-path="url(#${P}${id}dbody)"><path d="M90 140 C112 168 156 184 214 186 L214 220 L80 220 Z" fill="#1e92a6"/><path d="M250 146 C240 176 214 190 184 192 C156 194 130 188 116 176 C146 182 180 180 206 170 C226 162 240 152 250 146 Z" fill="#a9e1e8"/><path d="M152 182 C155 187 155 192 153 196" fill="none" stroke="#8ccfd8" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/><path d="M178 180 C181 185 181 190 179 194" fill="none" stroke="#8ccfd8" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/><path d="M204 172 C207 177 207 182 205 186" fill="none" stroke="#8ccfd8" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/><path d="M226 162 C229 167 229 172 227 176" fill="none" stroke="#8ccfd8" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/><path d="M128 128 C156 114 194 108 220 116 C196 116 164 122 138 136 Z" fill="#5cc4d3"/></g><path d="M112 162 C110 140 138 130 156 144 C172 158 166 184 148 194 C130 202 114 188 112 162 Z" fill="#27a9bd"/><path d="M112 162 C114 180 128 196 148 194 C160 188 166 176 166 166 C156 180 132 182 112 162 Z" fill="#1e92a6"/><path d="M132 188 C124 196 126 206 136 207 L166 207 C174 207 176 200 168 195 C160 190 146 186 132 188 Z" fill="#177c8e"/><path d="M164 207 L176 210 L168 201 Z M154 207 L164 211 L158 202 Z M144 207 L152 211 L148 202 Z" fill="#8fd5de"/><path d="M212 166 C222 162 234 168 236 180 L234 196 C232 202 222 204 214 200 C210 190 208 178 212 166 Z" fill="#27a9bd"/><path d="M214 200 C222 204 232 202 234 196 L235 186 C228 192 220 194 212 190 Z" fill="#1e92a6"/><path d="M210 196 C206 204 212 210 222 210 L240 208 C246 206 246 199 238 197 C230 194 218 193 210 196 Z" fill="#177c8e"/><path d="M238 208 L248 211 L242 202 Z M230 209 L238 213 L234 204 Z M222 210 L228 214 L226 205 Z" fill="#8fd5de"/><g class="kit-wingF"><path d="M196 116 L178 34 Q136 18 96 14 Q126 40 98 62 Q132 70 128 96 Q154 96 166 114 Z" fill="#f6a49a"/><path d="M196 116 L178 34 L128 96 Q154 96 166 114 Z" fill="#e48a84" opacity="0.55"/><path d="M178 34 L98 62 Q132 70 128 96 Z" fill="#e48a84" opacity="0.3"/><path d="M192 117 L174 35 L182 33 L200 115 Z" fill="#1e92a6"/><path d="M178 34 L96 13 L96 16 Z M178 34 L99 61 L100 64 Z M178 34 L127 95 L130 97 Z" fill="#1e92a6"/><path d="M170 30 C176 24 186 26 188 36 C180 40 172 38 170 30 Z" fill="#1e92a6"/><path d="M176 32 L184 14 L186 32 Z" fill="#177c8e"/></g><path d="M230 62 C220 46 214 28 216 8 C230 22 244 40 252 56 Z" fill="#177c8e"/><path d="M216 8 C230 22 244 40 252 56 L244 58 C236 42 226 26 216 8 Z" fill="#0f6878"/><path d="M220 38 L232 34 M223 48 L238 44" stroke="#0f6878" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M210 96 L176 76 Q186 90 178 100 Q190 106 182 118 Q198 118 212 120 Z" fill="#f6a49a"/><path d="M206 104 L182 84 M206 110 L184 108" stroke="#e48a84" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M300 62 C310 46 316 28 314 8 C300 22 286 40 278 56 Z" fill="#177c8e"/><path d="M314 8 C300 22 286 40 278 56 L286 58 C294 42 304 26 314 8 Z" fill="#0f6878"/><path d="M310 38 L298 34 M307 48 L292 44" stroke="#0f6878" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M320 96 L354 76 Q344 90 352 100 Q340 106 348 118 Q332 118 318 120 Z" fill="#f6a49a"/><path d="M324 104 L348 84 M324 110 L346 108" stroke="#e48a84" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M256 56 C256 44 260 34 268 26 C268 36 272 46 276 54 Z" fill="#177c8e"/><path d="M265 50 C296 50 318 66 324 90 C328 104 332 118 326 130 C320 140 308 146 300 150 C292 160 280 164 265 164 C250 164 238 160 230 150 C222 146 210 140 204 130 C198 118 202 104 206 90 C212 66 234 50 265 50 Z" fill="#27a9bd"/><g clip-path="url(#${P}${id}dhead)"><path d="M296 50 C318 70 326 100 320 126 C314 146 298 158 280 166 L344 170 L344 40 Z" fill="#1e92a6"/><path d="M226 72 C238 58 254 52 270 52 C254 60 240 68 232 82 Z" fill="#5cc4d3"/><path d="M238 140 C244 128 254 122 265 122 C276 122 286 128 292 140 C294 154 280 162 265 162 C250 162 236 154 238 140 Z" fill="#8fd5de"/><path d="M282 126 C290 132 294 142 290 152 C286 158 278 162 270 162 C282 152 286 140 282 126 Z" fill="#7cc7d1"/></g><path d="M222 104 C222 88 240 80 256 86 C264 90 264 100 262 106 C250 96 236 96 222 104 Z" fill="#8fd5de"/><path d="M244 95 C255 95 260 104 260 113 C260 123 253 128 244 128 C235 128 228 122 228 112 C228 103 234 95 244 95 Z" fill="#3a4047"/><path d="M244 104 C250 104 253 110 253 115 C253 121 249 124 244 124 C239 124 236 120 236 115 C236 109 239 104 244 104 Z" fill="#56636f"/><path d="M224 128 C230 124 240 126 244 132 C236 136 228 134 224 128 Z" fill="#f39a92" opacity="0.85"/><path d="M308 104 C308 88 290 80 274 86 C266 90 266 100 268 106 C280 96 294 96 308 104 Z" fill="#8fd5de"/><path d="M286 95 C275 95 270 104 270 113 C270 123 277 128 286 128 C295 128 302 122 302 112 C302 103 296 95 286 95 Z" fill="#3a4047"/><path d="M286 104 C280 104 277 110 277 115 C277 121 281 124 286 124 C291 124 294 120 294 115 C294 109 291 104 286 104 Z" fill="#56636f"/><path d="M306 128 C300 124 290 126 286 132 C294 136 302 134 306 128 Z" fill="#f39a92" opacity="0.85"/><circle cx="249" cy="105" r="6" fill="#fff"/><circle cx="291" cy="105" r="6" fill="#fff"/><circle cx="239" cy="118" r="2.4" fill="#fff"/><circle cx="281" cy="118" r="2.4" fill="#fff"/><path d="M256 134 C258 130 262 130 262 134 C261 136 258 137 256 134 Z M274 134 C272 130 268 130 268 134 C269 136 272 137 274 134 Z" fill="#155e6a"/><path d="M252 144 C258 151 272 151 278 144 C276 152 270 156 265 156 C260 156 254 152 252 144 Z" fill="#155e6a"/><path d="M258 151 C262 154 268 154 272 151 C270 155 260 155 258 151 Z" fill="#e48a84"/>`;
      const pop = (el, t, o) => {
        o = Object.assign({ dur: 0.42, sfx: "pop", hold: null, origin: "50% 50%", gain: 1 }, o);
        const og = /px/.test(o.origin) ? { svgOrigin: o.origin.replace(/px/g, "") } : { transformOrigin: o.origin };
        tl.fromTo(el, Object.assign({ scale: 0, opacity: 0 }, og), Object.assign({ scale: 1, opacity: 1, duration: o.dur, ease: "back.out(2.4)" }, og), t);
        if (o.sfx) TOON.cue(t, o.sfx, o.x || 0, o.gain);
        if (o.hold != null) tl.to(el, { scale: 0, opacity: 0, duration: 0.2, ease: "back.in(2)" }, t + o.dur + o.hold);
      };
      const stamp = (el, t, so) => {
        tl.fromTo(el, { scale: 2.4, opacity: 0, rotation: -6, svgOrigin: so }, { scale: 1, opacity: 1, rotation: 0, svgOrigin: so, duration: 0.32, ease: "back.out(1.8)" }, t);
        TOON.cue(t + 0.12, "stamp", 0, 0.8);
      };
      const eyesDown = (rig, t, dy, d) => rig.pupils.length && tl.fromTo(rig.pupils, { y: 0 }, { y: dy, duration: d || 0.2, ease: "sine.out" }, t);
      const walk = (rig, t0, t1, amp, step) => {
        const a = amp || 12, st = step || 0.28, O = TOON.ORIGIN;
        if (!rig.legL) { for (let t = t0; t < t1 - 0.08; t += 0.14) tl.fromTo(rig.char, { y: 0 }, { y: -a, duration: 0.07, ease: "sine.out", yoyo: true, repeat: 1 }, t); return; }
        let i = 0;
        for (let t = t0; t < t1 - st * 0.5; t += st, i++) {
          const s = i % 2 ? "R" : "L", h = st / 2, sg = s === "L" ? 1 : -1;
          tl.fromTo(rig["leg" + s], { y: 0, rotation: 0 }, { y: -a * 2.4, rotation: sg * 4, svgOrigin: O["leg" + s], duration: h, ease: "sine.out", yoyo: true, repeat: 1, immediateRender: false }, t);
          tl.fromTo(rig["shin" + s], { scaleY: 1 }, { scaleY: 0.86, svgOrigin: O["shin" + s], duration: h, ease: "sine.out", yoyo: true, repeat: 1, immediateRender: false }, t);
          tl.fromTo(rig.body, { y: 0 }, { y: -a, duration: h, ease: "sine.out", yoyo: true, repeat: 1, immediateRender: false }, t);
          tl.fromTo(rig.body, { rotation: 0 }, { rotation: -sg * 1.6, svgOrigin: O.body, duration: h, ease: "sine.out", yoyo: true, repeat: 1, immediateRender: false }, t);
        }
      };
      const hop = (el, t, h, d) => tl.fromTo(el, { y: 0 }, { y: -h, duration: d || 0.12, ease: "sine.out", yoyo: true, repeat: 1 }, t);
      const shake = (rig, t, n) => {
        tl.fromTo(rig.head, { rotation: 0 }, { rotation: -6, svgOrigin: "300 440", duration: 0.14, ease: "sine.out" }, t);
        tl.fromTo(rig.head, { rotation: -6 }, { rotation: 6, svgOrigin: "300 440", duration: 0.24, ease: "sine.inOut", yoyo: true, repeat: n * 2 - 2 }, t + 0.14);
        tl.to(rig.head, { rotation: 0, svgOrigin: "300 440", duration: 0.16, ease: "sine.inOut" }, t + 0.14 + 0.24 * (n * 2 - 1));
      };
      const sip = (rig, t) => {
        tl.fromTo(rig.foreR, { rotation: 104 }, { rotation: 128, svgOrigin: "450 712", duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 1, repeatDelay: 0.5 }, t);
        TOON.setMouth(tl, rig, t + 0.25, "round");
        TOON.setMouth(tl, rig, t + 1.0, "rest");
      };
      const STEAM = (x, y, s) => [0, 1, 2].map((k) => `<path class="kit-steam" d="M${x + (k - 1) * 26 * s} ${y} q${-14 * s} ${-30 * s} 0 ${-60 * s} q${14 * s} ${-30 * s} 0 ${-60 * s}" stroke="#ffffff" stroke-width="${9 * s}" fill="none" stroke-linecap="round" opacity="0.7"/>`).join("");
      const steam = (box, t0, t1) => box.querySelectorAll(".kit-steam").forEach((p, i) => {
        const per = 1.4, n = Math.max(1, Math.floor((t1 - t0) / per));
        tl.fromTo(p, { y: 10, opacity: 0 }, { y: -30, opacity: 0.75, duration: per, ease: "sine.out", repeat: n }, t0 + i * 0.4);
      });

      // ---- First-person (POV) layer: two forearms from the bottom edge, back of the hand to camera.
      // HANDS(id, o) → SVG markup for a 1080×1920 plane; arms are groups #<P><id>L / #<P><id>R with the wrist
      // at (0,0) and the forearm running down off-frame. Place with povArm(); o: { skin, sleeve, cuff }.
      const ARM = (gid, side, o) => {
        const sk = o.skin || "#f0c49c", sd = o.skinShade || "#d9a47c", sl = o.sleeve || "#3f6fa8", sls = o.sleeveShade || "#2f5687", cf = o.cuff || "#e9eef3";
        const m = side === "L" ? -1 : 1;
        const X = (x) => (x * m).toFixed(1);
        let g = `<g id="${gid}"><g class="kit-arm">`;
        g += `<path d="M${X(-92)} 70 C${X(-104)} 400 ${X(-130)} 760 ${X(-150)} 1200 L${X(170)} 1200 C${X(150)} 760 ${X(118)} 400 ${X(96)} 70 Z" fill="${sl}"/>`;
        g += `<path d="M${X(40)} 70 C${X(60)} 400 ${X(84)} 760 ${X(96)} 1200 L${X(170)} 1200 C${X(150)} 760 ${X(118)} 400 ${X(96)} 70 Z" fill="${sls}"/>`;
        g += `<path d="M${X(-60)} 330 C${X(-70)} 520 ${X(-84)} 760 ${X(-96)} 1100" stroke="${sls}" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.45"/>`;
        g += `<rect x="${Math.min(X(-100), X(104))}" y="30" width="204" height="62" rx="26" fill="${cf}"/>`;
        g += `<rect x="${Math.min(X(30), X(104))}" y="30" width="74" height="62" rx="20" fill="#000" opacity="0.1"/>`;
        // palm (back of the hand), knuckles up
        g += `<path d="M${X(-78)} 40 C${X(-96)} -40 ${X(-96)} -130 ${X(-84)} -186 C${X(-40)} -206 ${X(40)} -208 ${X(82)} -190 C${X(98)} -130 ${X(96)} -40 ${X(80)} 40 Z" fill="${sk}"/>`;
        g += `<path d="M${X(30)} 40 C${X(56)} -40 ${X(62)} -130 ${X(54)} -196 C${X(70)} -194 ${X(78)} -192 ${X(82)} -190 C${X(98)} -130 ${X(96)} -40 ${X(80)} 40 Z" fill="${sd}"/>`;
        // fingers: index → little
        const F = [[-60, -186, -72, -350, 25], [-20, -196, -22, -380, 26], [22, -196, 28, -366, 25], [62, -184, 74, -322, 22]];
        for (const [x0, y0, x1, y1, r] of F) {
          g += `<path d="M${X(x0 - r)} ${y0 + 10} L${X(x1 - r * 0.9)} ${y1 + r} A${r * 0.9} ${r * 0.9} 0 0 1 ${X(x1 + r * 0.9)} ${y1 + r} L${X(x0 + r)} ${y0 + 10} Z" fill="${sk}"/>`;
          g += `<path d="M${X(x0 + r * 0.25)} ${y0 + 10} L${X(x1 + r * 0.25)} ${y1 + r * 1.1} A${r * 0.9} ${r * 0.9} 0 0 1 ${X(x1 + r * 0.9)} ${y1 + r} L${X(x0 + r)} ${y0 + 10} Z" fill="${sd}" opacity="0.8"/>`;
          g += `<ellipse cx="${X(x1)}" cy="${y1 + r * 0.95}" rx="${r * 0.55}" ry="${r * 0.42}" fill="#f7dcc4" opacity="0.8"/>`;
          g += `<ellipse cx="${X(x0 + (x1 - x0) * 0.08)}" cy="${y0 - 8}" rx="${r * 0.6}" ry="${r * 0.32}" fill="#fff" opacity="0.18"/>`;
        }
        // thumb, tucked toward the body centre
        g += `<path d="M${X(-74)} -20 C${X(-130)} -60 ${X(-168)} -120 ${X(-176)} -176 C${X(-180)} -204 ${X(-140)} -214 ${X(-128)} -186 C${X(-118)} -150 ${X(-96)} -110 ${X(-66)} -96 Z" fill="${sk}"/>`;
        g += `<path d="M${X(-74)} -20 C${X(-130)} -60 ${X(-168)} -120 ${X(-176)} -176 C${X(-166)} -150 ${X(-130)} -96 ${X(-70)} -60 Z" fill="${sd}" opacity="0.7"/>`;
        return g + "</g></g>";
      };
      const HANDS = (id, o) => ARM(P + id + "L", "L", o || {}) + ARM(P + id + "R", "R", o || {});
      // povArm(arm, t, { x, y, rot, dur, ease, from }) moves one forearm group in plane px (wrist position).
      const povArm = (arm, t, o) => {
        o = Object.assign({ dur: 0.5, ease: "power2.inOut", rot: 0 }, o);
        const to = { x: o.x, y: o.y, rotation: o.rot, svgOrigin: "0 0", duration: o.dur, ease: o.ease };
        if (o.from) tl.fromTo(arm, Object.assign({ svgOrigin: "0 0", rotation: 0 }, o.from), Object.assign(to, { immediateRender: false }), t);
        else tl.to(arm, to, t);
      };
      // Eyelids for POV blinks: LIDS(id) → markup (1080×1920 plane); blink(id, t, { close, hold, open }).
      const LIDS = (id, col) => {
        const c = col || "#1b1622";
        return `<g id="${P}${id}T"><path d="M-200 -2200 L1280 -2200 L1280 0 C980 160 100 160 -200 0 Z" fill="${c}"/><path d="M-200 0 C100 160 980 160 1280 0 C980 230 100 230 -200 0 Z" fill="${c}" opacity="0.45"/></g>` +
          `<g id="${P}${id}B"><path d="M-200 4120 L1280 4120 L1280 1920 C980 1760 100 1760 -200 1920 Z" fill="${c}"/><path d="M-200 1920 C100 1760 980 1760 1280 1920 C980 1690 100 1690 -200 1920 Z" fill="${c}" opacity="0.45"/></g>`;
      };
      const lidState = {};
      const lids = (id, t, shut, dur) => {
        const T = document.getElementById(P + id + "T"), B = document.getElementById(P + id + "B");
        const from = lidState[id] == null ? 0 : lidState[id];
        const y = (k) => [{ y: -170 + k * 1130 }, { y: 170 - k * 1130 }];
        const [ft, fb] = y(from), [tt, tb] = y(shut);
        tl.fromTo(T, ft, Object.assign(tt, { duration: dur || 0.18, ease: shut > from ? "power2.in" : "power2.out", immediateRender: false }), t);
        tl.fromTo(B, fb, Object.assign(tb, { duration: dur || 0.18, ease: shut > from ? "power2.in" : "power2.out", immediateRender: false }), t);
        lidState[id] = shut;
      };
      const lidsInit = (id, shut) => {
        const T = document.getElementById(P + id + "T"), B = document.getElementById(P + id + "B");
        tl.set(T, { y: -170 + shut * 1130 }, 0); tl.set(B, { y: 170 - shut * 1130 }, 0);
        lidState[id] = shut;
      };
      const blink = (id, t, o) => {
        o = Object.assign({ hold: 0.05, dur: 0.09 }, o);
        lids(id, t, 1, o.dur);
        lids(id, t + o.dur + o.hold, 0, o.dur * 1.6);
      };
      // Close-up: frame an actor's face/eyes at (cx, cy) with face width w (px). Call before TOON.actor.
      const closeup = (el, o) => {
        o = Object.assign({ cx: 540, cy: 760, w: 900, part: "face" }, o);
        const sc = o.w / 330, fy = o.part === "eyes" ? 272 : o.part === "mouth" ? 360 : 305;
        Object.assign(el.style, { width: 600 * sc + "px", height: 920 * sc + "px", left: o.cx - 300 * sc + "px", top: o.cy - fy * sc + "px", bottom: "auto" });
      };

    return { HANDS, povArm, LIDS, lids, lidsInit, blink, closeup, sp, coat, CLOUD, TREE, GLOW, LAND, BAMBOO, PADDY, LANTERN, ARECA, JAR, HOUSE, COURT, BUF, HAT, hat, THINK, FACE, BANG, STAR, SPARK, PILL, CHECK, CUP, BOWL, DRAGON, pop, stamp, eyesDown, walk, hop, shake, sip, STEAM, steam };
  };
})();
