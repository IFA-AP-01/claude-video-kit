// Bake soft (depth-of-field) PNG copies of background SVGs, so the camera never re-runs a blur filter.
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
await p.setViewport({ width: 1920, height: 1080 });
for (const f of files) {
  const src = `data:image/svg+xml;base64,${readFileSync(f).toString("base64")}`;
  const pad = +blur * 3;
  await p.setContent(`<body style="margin:0;overflow:hidden;background:transparent"><img src="${src}" style="position:absolute;left:${-pad}px;top:${-pad}px;width:${1920 + pad * 2}px;height:${1080 + pad * 2}px;filter:blur(${blur}px)"></body>`, { waitUntil: "load" });
  const out = f.replace(/\.svg$/, ".soft.png");
  await p.screenshot({ path: out, omitBackground: true });
  console.log("wrote " + out);
}
await b.close();
