#!/usr/bin/env node
// Collect the SFX cues that the scene helpers push to window.__toonCues -> data/sfx_cues.json.
// Each scene file is mounted on its own in a headless page (software GL, no GPU), the same way the
// runtime does: template content into a stage, then its scripts in order.
//   node tools/cues.mjs
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILM = join(ROOT, "film");
const require = createRequire(join(FILM, "package.json"));
const puppeteer = require("puppeteer-core");

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = join(homedir(), ".cache/puppeteer/chrome-headless-shell");
  if (existsSync(base)) {
    const v = readdirSync(base).sort().reverse();
    for (const d of v) {
      const p = join(base, d, "chrome-headless-shell-mac-arm64/chrome-headless-shell");
      if (existsSync(p)) return p;
      const l = join(base, d, "chrome-headless-shell-linux64/chrome-headless-shell");
      if (existsSync(l)) return l;
    }
  }
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (existsSync(mac)) return mac;
  throw new Error("no Chrome found: set CHROME_PATH");
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const index = readFileSync(join(FILM, "index.html"), "utf8");
const head = index.match(/<head>([\s\S]*?)<\/head>/)[1];
const [SW, SH] = (index.match(/id="root"[^>]*data-width="(\d+)" data-height="(\d+)"/) || [0, 1920, 1080]).slice(1).map(Number);
const hosts = [...index.matchAll(/data-composition-src="compositions\/([^"]+)\.html"/g)].map((m) => m[1]);

const bodyTag = (index.match(/<body[^>]*>/) || ["<body>"])[0];
const harness = `<!doctype html><html><head>${head}</head>${bodyTag}
<div id="stage" style="position:absolute;inset:0;width:${SW}px;height:${SH}px" data-width="${SW}" data-height="${SH}"></div>
<script>
window.__timelines = {};
window.mountScene = async function (id) {
  const html = await (await fetch("compositions/" + id + ".html")).text();
  const t = document.createElement("template");
  t.innerHTML = html.replace(/^[\\s\\S]*?<template>/, "").replace(/<\\/template>[\\s\\S]*$/, "");
  const stage = document.getElementById("stage");
  stage.innerHTML = "";
  const scripts = [];
  for (const n of [...t.content.childNodes]) {
    if (n.nodeName === "SCRIPT") scripts.push(n.textContent); else stage.appendChild(n);
  }
  for (const s of scripts) (0, eval)(s);
  await new Promise((r) => requestAnimationFrame(() => r()));
};
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/__cues.html") { res.writeHead(200, { "content-type": "text/html" }); return res.end(harness); }
  const p = normalize(join(FILM, url));
  if (!p.startsWith(FILM) || !existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: chromePath(),
  headless: true,
  args: ["--disable-gpu", "--use-gl=swiftshader", "--use-angle=swiftshader", "--no-first-run", "--mute-audio"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: SW, height: SH });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/__cues.html`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (const id of hosts) await page.evaluate((id) => window.mountScene(id), id);
  if (errors.length) throw new Error("scene errors:\n  " + errors.join("\n  "));
  const cues = (await page.evaluate(() => window.__toonCues)).sort((a, b) => a.t - b.t);
  const D = await page.evaluate(() => window.TOON_DATA.duration);
  writeFileSync(join(ROOT, "data/sfx_cues.json"), JSON.stringify({ duration: D, cues }, null, 1) + "\n");
  const count = {};
  for (const c of cues) count[c.kind] = (count[c.kind] || 0) + 1;
  console.log(`data/sfx_cues.json: ${cues.length} cues (${Object.entries(count).map(([k, v]) => k + " " + v).join(", ")})`);
} finally {
  await browser.close();
  server.close();
}
