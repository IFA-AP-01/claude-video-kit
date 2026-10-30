#!/usr/bin/env node
// Writes illustrated background presets from tools/art/presets.mjs.
//   node tools/draw_bg_art.mjs <out-dir> [name ...]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetIds } from "./art/kit.mjs";
import { BG } from "./art/presets.mjs";

const [outDir, ...names] = process.argv.slice(2);
if (!outDir) { console.error("usage: draw_bg_art.mjs <out-dir> [name ...]\npresets: " + Object.keys(BG).join(" ")); process.exit(1); }
mkdirSync(outDir, { recursive: true });
for (const n of names.length ? names : Object.keys(BG)) {
  if (!BG[n]) { console.error("unknown preset " + n); process.exit(1); }
  resetIds(n.replace(/[^a-z]/g, "").slice(0, 4));
  writeFileSync(join(outDir, n + ".svg"), BG[n]());
  console.log("wrote " + join(outDir, n + ".svg"));
}
