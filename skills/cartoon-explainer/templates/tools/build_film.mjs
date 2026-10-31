#!/usr/bin/env node
// data/words.json -> film/assets/data/words.js, scene hosts in film/index.html, missing scene files,
// film/assets/audio/mix.wav (final_mix.wav when present, else voice_master.wav).
//   node tools/build_film.mjs [--lead 0.12] [--brand NAME] [--format landscape|vertical] [--captions 0|1]
// --format sets the stage size everywhere (index.html root/viewport/body, scene hosts, data-format);
// --captions 1 adds a full-length karaoke caption layer (compositions/captions.html).
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILM = join(ROOT, "film");
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LEAD = +opt("--lead", 0.12);
const BRAND = opt("--brand", null);
const FORMAT = opt("--format", "landscape");
const [SW, SH] = FORMAT === "vertical" ? [1080, 1920] : [1920, 1080];
const CAPTIONS = opt("--captions", "0") === "1";

const wordsPath = join(ROOT, "data/words.json");
if (!existsSync(wordsPath)) throw new Error("no data/words.json: run ./make.sh align");
const W = JSON.parse(readFileSync(wordsPath, "utf8"));

const mixSrc = ["audio/out/final_mix.wav", "audio/out/voice_master.wav"].map((p) => join(ROOT, p)).find(existsSync);
if (!mixSrc) throw new Error("no audio/out/voice_master.wav: run ./make.sh voice");
mkdirSync(join(FILM, "assets/audio"), { recursive: true });
const mixDst = join(FILM, "assets/audio/mix.wav");
if (!existsSync(mixDst) || statSync(mixSrc).mtimeMs > statSync(mixDst).mtimeMs || statSync(mixSrc).size !== statSync(mixDst).size) copyFileSync(mixSrc, mixDst);
const audioDur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mixDst]).toString().trim();
const duration = +Math.max(W.duration || 0, audioDur).toFixed(3);

const order = [];
for (const l of W.lines) if (!order.includes(l.section)) order.push(l.section);
const sections = order.map((id, k) => {
  const ls = W.lines.filter((l) => l.section === id);
  const prevEnd = k ? Math.max(...W.lines.filter((l) => l.section === order[k - 1]).map((l) => l.end)) : 0;
  const start = k === 0 ? 0 : +Math.max(prevEnd, ls[0].start - LEAD).toFixed(3);
  return { id, start };
});
if (W.intro > 0 && order[0] !== "intro") {
  sections[0].start = +Math.max(0, Math.min(...W.lines.filter((l) => l.section === order[0]).map((l) => l.start)) - LEAD).toFixed(3);
  sections.unshift({ id: "intro", start: 0 });
}
sections.forEach((s, k) => (s.end = k + 1 < sections.length ? sections[k + 1].start : duration));

const r3 = (x) => +(+x).toFixed(3);
const data = {
  duration,
  sections,
  lines: W.lines.map((l) => ({
    i: l.i, section: l.section, text: l.text, start: r3(l.start), end: r3(l.end),
    words: l.words.map((w) => ({ w: w.w, start: r3(w.start), end: r3(w.end) })),
  })),
};
mkdirSync(join(FILM, "assets/data"), { recursive: true });
writeFileSync(join(FILM, "assets/data/words.js"), "window.TOON_DATA = " + JSON.stringify(data) + ";\n");

const tpl = readFileSync(join(ROOT, "tools/scene-template.html"), "utf8");
const introTpl = join(ROOT, "tools/intro-template.html");
const created = [];
const capTpl = join(ROOT, "tools/captions-template.html");
const capFile = join(FILM, "compositions/captions.html");
if (CAPTIONS && !existsSync(capFile) && existsSync(capTpl)) { writeFileSync(capFile, readFileSync(capTpl, "utf8")); created.push("captions"); }
for (const s of sections) {
  const f = join(FILM, "compositions", s.id + ".html");
  if (!existsSync(f)) {
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, (s.id === "intro" && existsSync(introTpl) ? readFileSync(introTpl, "utf8") : tpl.replaceAll("__ID__", s.id)).replace(/data-width="1920" data-height="1080"/, `data-width="${SW}" data-height="${SH}"`));
    created.push(s.id);
  }
}

const hosts = sections
  .map((s) =>
    `      <div id="${s.id}" data-composition-id="${s.id}" data-composition-src="compositions/${s.id}.html" data-start="${s.start}" data-duration="${r3(s.end - s.start)}" data-track-index="1" data-track-kind="graphics" data-width="${SW}" data-height="${SH}"></div>`)
  .join("\n") +
  (CAPTIONS ? `\n      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${duration}" data-track-index="8" data-track-kind="graphics" data-width="${SW}" data-height="${SH}"></div>` : "");
const indexPath = join(FILM, "index.html");
let html = readFileSync(indexPath, "utf8");
html = html.replace(/<!-- scenes:begin -->[\s\S]*?<!-- scenes:end -->/, `<!-- scenes:begin -->\n${hosts}\n      <!-- scenes:end -->`);
html = html.replace(/(<(?:div|audio|img)\b[^>]*\bid="(?:root|grain|logo-l|logo-r|mix)"[^>]*data-duration=")[^"]*"/g, `$1${duration}"`);
html = html.replace(/<meta name="viewport" content="[^"]*"/, `<meta name="viewport" content="width=${SW}, height=${SH}"`);
html = html.replace(/(html, body \{[^}]*?)width: \d+px; height: \d+px;/, `$1width: ${SW}px; height: ${SH}px;`);
html = html.replace(/<body[^>]*>/, `<body data-format="${FORMAT}">`);
html = html.replace(/(<div id="root"[^>]*?)data-width="\d+" data-height="\d+"/, `$1data-width="${SW}" data-height="${SH}"`);
if (BRAND) html = html.replace(/(<div\b[^>]*\bid="logo-[lr]"[^>]*>)[^<]*(<\/div>)/g, `$1${BRAND}$2`);
writeFileSync(indexPath, html);

console.log(`film: ${FORMAT} ${SW}×${SH}${CAPTIONS ? " + captions" : ""}, ${duration} s, ${sections.length} scenes, audio ${mixSrc.replace(ROOT + "/", "")}`);
for (const s of sections) console.log(`  ${s.id.padEnd(16)} ${s.start.toFixed(2).padStart(7)} – ${s.end.toFixed(2).padStart(7)}${created.includes(s.id) ? "   (new: placeholder scene)" : ""}`);
