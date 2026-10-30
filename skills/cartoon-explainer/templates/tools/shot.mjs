// Screenshot local SVG/PNG files with the headless Chrome that HyperFrames installed.
//   node tools/shot.mjs <out.png> <file> [file ...]    several files are tiled 2 per row at half size
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

const require = createRequire(resolve("film/package.json"));
const puppeteer = require("puppeteer-core");
const [out, ...files] = process.argv.slice(2);
if (!out || !files.length) { console.error("usage: node tools/shot.mjs <out.png> <file> [file ...]"); process.exit(1); }

const base = homedir() + "/.cache/puppeteer/chrome-headless-shell";
const v = readdirSync(base).sort().reverse()[0];
const b = await puppeteer.launch({ executablePath: `${base}/${v}/chrome-headless-shell-mac-arm64/chrome-headless-shell`, args: ["--disable-gpu"] });
const p = await b.newPage();
const one = files.length === 1;
const cols = one ? 1 : 2, rows = Math.ceil(files.length / cols), w = one ? 1920 : 960, h = one ? 1080 : 540;
await p.setViewport({ width: w * cols, height: h * rows });
const src = (f) => `data:${f.endsWith(".svg") ? "image/svg+xml" : "image/png"};base64,${readFileSync(f).toString("base64")}`;
const cells = files.map((f) => `<img src="${src(f)}" style="width:${w}px;height:${h}px;display:block;float:left">`).join("");
await p.goto("about:blank");
await p.setContent(`<body style="margin:0;background:#111">${cells}</body>`, { waitUntil: "load" });
await p.screenshot({ path: out });
await b.close();
console.log("wrote " + out);
