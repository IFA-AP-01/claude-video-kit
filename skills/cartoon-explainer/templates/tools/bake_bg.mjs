// Bake soft (depth-of-field) PNG copies of background SVGs, so the camera never re-runs a blur filter.
// Output size = the SVG viewBox (1920×1080 presets, any size for vertical or wide one-shot worlds).
//   node tools/bake_bg.mjs <blur px> <file.svg> [file.svg ...]   writes <name>.soft.png next to each SVG
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const require = createRequire(resolve("film/package.json"));
const puppeteer = require("puppeteer-core");
const [blur, ...files] = process.argv.slice(2);
if (!blur || !files.length) { console.error("usage: node tools/bake_bg.mjs <blur px> <file.svg> [file.svg ...]"); process.exit(1); }

const base = homedir() + "/.cache/puppeteer/chrome-headless-shell";
const v = readdirSync(base).sort().reverse()[0];
const b = await puppeteer.launch({ executablePath: `${base}/${v}/chrome-headless-shell-mac-arm64/chrome-headless-shell`, args: ["--disable-gpu"] });
const p = await b.newPage();
for (const f of files) {
  const svg = readFileSync(f, "utf8");
  const vb = (svg.match(/viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/) || [0, 1920, 1080]).slice(1).map(Number);
  const [W, H] = vb;
  await p.setViewport({ width: Math.round(W), height: Math.round(H) });
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const pad = +blur * 3;
  await p.setContent(`<body style="margin:0;overflow:hidden;background:transparent"><img src="${src}" style="position:absolute;left:${-pad}px;top:${-pad}px;width:${W + pad * 2}px;height:${H + pad * 2}px;filter:blur(${blur}px)"></body>`, { waitUntil: "load" });
  const out = f.replace(/\.svg$/, ".soft.png");
  await p.screenshot({ path: out, omitBackground: true });
  console.log("wrote " + out);
}
await b.close();
