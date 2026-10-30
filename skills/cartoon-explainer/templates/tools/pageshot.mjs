// Screenshot a local HTML page (sheets/*.html) with the headless Chrome that HyperFrames installed.
//   node tools/pageshot.mjs <out.png> <page.html> [query] [width]
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(resolve("film/package.json"));
const puppeteer = require("puppeteer-core");
const [out, page, query = "", width = "1920"] = process.argv.slice(2);
if (!out || !page) { console.error("usage: node tools/pageshot.mjs <out.png> <page.html> [query] [width]"); process.exit(1); }
const base = homedir() + "/.cache/puppeteer/chrome-headless-shell";
const v = readdirSync(base).sort().reverse()[0];
const b = await puppeteer.launch({ executablePath: `${base}/${v}/chrome-headless-shell-mac-arm64/chrome-headless-shell`, args: ["--disable-gpu", "--allow-file-access-from-files"] });
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.setViewport({ width: +width, height: 600 });
await p.goto(pathToFileURL(resolve(page)).href + (query ? "?" + query : ""), { waitUntil: "load" });
await new Promise((r) => setTimeout(r, 500));
await p.screenshot({ path: out, fullPage: true });
await b.close();
if (errs.length) console.error("page errors:\n  " + errs.join("\n  "));
console.log("wrote " + out);
