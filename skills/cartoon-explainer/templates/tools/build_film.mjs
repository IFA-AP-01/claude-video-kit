#!/usr/bin/env node
// data/words.json -> film/assets/data/words.js, scene hosts in film/index.html, missing scene files,
// film/assets/audio/mix.wav (final_mix.wav when present, else voice_master.wav).
//   node tools/build_film.mjs [--lead 0.12] [--brand NAME] [--format landscape|vertical] [--captions 0|1]
//                             [--outro SECONDS] [--chapters "id|Title|mood,..."]
// --outro adds a closing `outro` scene (tools/outro-template.html) over the last SECONDS after the last word.
// --chapters: an entry with a Title starts a chapter (its scene opens right after the previous scene's last
// word, so the longer chapter pause belongs to the chapter card); mood picks the grade tint from that scene on.
// Chapters go to TOON_DATA.chapters and out/youtube_chapters.txt.
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
const OUTRO = +opt("--outro", 0);
const CHAPTERS = opt("--chapters", "").split(",").map((c) => c.split("|").map((x) => x.trim())).filter((c) => c[0]).map(([id, title = "", mood = ""]) => ({ id, title, mood }));

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
  const isChapter = CHAPTERS.some((c) => c.id === id && c.title);
  const start = k === 0 ? 0 : +(isChapter ? Math.min(prevEnd + 0.35, ls[0].start - LEAD) : Math.max(prevEnd, ls[0].start - LEAD)).toFixed(3);
  return { id, start };
});
if (W.intro > 0 && order[0] !== "intro") {
  sections[0].start = +Math.max(0, Math.min(...W.lines.filter((l) => l.section === order[0]).map((l) => l.start)) - LEAD).toFixed(3);
  sections.unshift({ id: "intro", start: 0 });
}
if (OUTRO > 0 && order.at(-1) !== "outro") {
  const lastEnd = Math.max(...W.lines.map((l) => l.end));
  sections.push({ id: "outro", start: +Math.max(lastEnd + 0.5, duration - OUTRO).toFixed(3) });
}
sections.forEach((s, k) => (s.end = k + 1 < sections.length ? sections[k + 1].start : duration));

const r3 = (x) => +(+x).toFixed(3);
const chapters = CHAPTERS.filter((c) => sections.some((s) => s.id === c.id)).map((c, k, a) => ({
  ...c, n: a.slice(0, k + 1).filter((x) => x.title).length, start: sections.find((s) => s.id === c.id).start,
}));
const data = {
  duration,
  sections,
  chapters,
  lines: W.lines.map((l) => ({
    i: l.i, section: l.section, text: l.text, start: r3(l.start), end: r3(l.end),
    words: l.words.map((w) => ({ w: w.w, start: r3(w.start), end: r3(w.end) })),
  })),
};
mkdirSync(join(FILM, "assets/data"), { recursive: true });
writeFileSync(join(FILM, "assets/data/words.js"), "window.TOON_DATA = " + JSON.stringify(data) + ";\n");

const tpl = readFileSync(join(ROOT, "tools/scene-template.html"), "utf8");
const introTpl = join(ROOT, "tools/intro-template.html");
const outroTpl = join(ROOT, "tools/outro-template.html");
const created = [];
const capTpl = join(ROOT, "tools/captions-template.html");
const capFile = join(FILM, "compositions/captions.html");
if (CAPTIONS && !existsSync(capFile) && existsSync(capTpl)) { writeFileSync(capFile, readFileSync(capTpl, "utf8")); created.push("captions"); }
for (const s of sections) {
  const f = join(FILM, "compositions", s.id + ".html");
  if (!existsSync(f)) {
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, (s.id === "intro" && existsSync(introTpl) ? readFileSync(introTpl, "utf8") : s.id === "outro" && existsSync(outroTpl) ? readFileSync(outroTpl, "utf8") : tpl.replaceAll("__ID__", s.id)).replace(/data-width="1920" data-height="1080"/, `data-width="${SW}" data-height="${SH}"`));
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

if (chapters.some((c) => c.title)) {
  const ts = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  const rows = [`0:00 ${sections[0].id === "intro" ? "Intro" : "Start"}`, ...chapters.filter((c) => c.title).map((c) => `${ts(c.start)} ${c.title}`)];
  if (sections.at(-1).id === "outro") rows.push(`${ts(sections.at(-1).start)} Outro`);
  mkdirSync(join(ROOT, "out"), { recursive: true });
  writeFileSync(join(ROOT, "out/youtube_chapters.txt"), rows.join("\n") + "\n");
}
console.log(`film: ${FORMAT} ${SW}×${SH}${CAPTIONS ? " + captions" : ""}, ${duration} s, ${sections.length} scenes, audio ${mixSrc.replace(ROOT + "/", "")}`);
for (const s of sections) console.log(`  ${s.id.padEnd(16)} ${s.start.toFixed(2).padStart(7)} – ${s.end.toFixed(2).padStart(7)}${created.includes(s.id) ? "   (new: placeholder scene)" : ""}`);
