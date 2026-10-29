// "example": the generic placeholder every section plays until `scenes/<section>.ts` exists
// (see timeline.ts). It reads only the narration, so the whole video previews with captions,
// pops, camera glides and SFX right after alignment, before any real scene is written.
//   one beat per narration line (short lines merged so a beat lasts ≥ MIN_BEAT s)
//   headline = the beat's first content words (function words skipped), each strip slapping on its word start
//   halftone disc behind it, section tag below; beat colours cycle through BEAT_COLORS
// Copy this file to `scenes/<section>.ts` as the starting point of a real scene.
import * as THREE from 'three';
import { BeatScene, popCut, type Beat } from '../engine/beats';
import { C } from '../engine/palette';
import { Cutout } from '../engine/cutout';
import { Headline } from '../engine/headline';
import { Rig, Z, place } from '../engine/parallax';
import { discCanvas, tag } from '../engine/art';
import type { Line, Word } from '../engine/words';

const BEAT_COLORS = [C.red, C.blue, C.yellow, C.teal, C.orange, C.green];
const MIN_BEAT = 2.5;      // s; shorter lines join the previous beat
const HEAD_WORDS = 4;      // headline words per beat (2 rows of 2)
const HEAD_W = 820;        // px a headline row may span

/** Function words never make a headline strip (same list as LEAN in analysis/captions.py). */
const WEAK = new Set(('của ở tại là do và các những một bị được sẽ đã mà rồi với cho từ vào lên khi nên lại còn theo ' +
  'hoặc chứ trong trên dưới bằng nhờ dựa khiến cả cũng vẫn đạt đặt chưa rất thường chỉ lúc khoảng tự này đó ' +
  'thì như nhưng có không').split(' '));
const clean = (w: Word) => w.w.replace(/[.,!?;:"“”()…]/g, '');
const strong = (w: Word) => clean(w).length > 1 && !WEAK.has(clean(w).toLowerCase());

export default class Example extends BeatScene {
  async init() {
    this.base([]);
    const e = this.ctx.entry;
    const lines = this.ctx.words.lines.filter((l) => l.start >= e.start - 0.05 && l.start < e.end);
    const groups: Line[][] = [];
    for (const l of lines) {
      const g = groups[groups.length - 1];
      if (g && l.start - g[0].start < MIN_BEAT) g.push(l); else groups.push([l]);
    }
    // the colour sequence carries over between entries so neighbouring sections never repeat
    const offset = Math.round(e.start * 7) % BEAT_COLORS.length;
    this.addBeats(groups.length ? groups.map((g, i) => this.beat(g, i, offset)) : [this.empty()]);
  }

  private beat(group: Line[], i: number, offset: number): Beat {
    const e = this.ctx.entry;
    const t0 = i === 0 ? e.start : (this.prevEnd(group[0]) + group[0].start) / 2;
    const color = BEAT_COLORS[(i + offset) % BEAT_COLORS.length];
    const seed = 1000 + Math.round(group[0].start * 100);
    const g = new THREE.Group();

    const all = group.flatMap((l) => l.words);
    let words = all.filter(strong).slice(0, HEAD_WORDS);
    if (!words.length) words = all.slice(0, HEAD_WORDS);
    const rows = [words.slice(0, 2), words.slice(2)].filter((r) => r.length);
    const chars = Math.max(...rows.map((r) => r.reduce((n, w) => n + clean(w).length + 1, 0)));
    const head = new Headline(rows.map((r) => r.map((w) => clean(w).toUpperCase())), {
      size: Math.min(150, Math.floor(HEAD_W / (chars * 0.5))), seed,
      strips: [{ bg: C.white, fg: C.ink }, { bg: C.ink, fg: C.white }],
    });
    head.times = words.map((w) => w.start);
    place(head.group, 0, 380, Z.DIAGRAM + 20);

    const disc = new Cutout(discCanvas(600), {
      torn: 7, tornFreq: 1 / 40, rim: 5, paper: C.paper, lift: 10, shadow: 0.22, jitter: 0.8, seed: seed + 1,
      halftone: { color, ink: C.ink, cell: 16, angle: 20, contrast: 1 },
    });
    place(disc.group, -40, -120, Z.CLIP);

    const label = tag(e.id.toUpperCase(), C.ink, C.yellow, 34, { seed: seed + 2, lift: 14 });
    place(label.group, -230, 640, Z.FRONT);
    label.group.rotation.z = -0.04;

    g.add(disc.group, head.group, label.group);
    const end = group[group.length - 1].end;
    const rig = new Rig([{ t: t0, x: -10, y: 30, roll: -0.3 }, { t: end, x: 15, y: 60, push: 50, roll: 0.3 }]);
    const db = disc.group.scale.x, lb = label.group.scale.x;
    const tLabel = words[words.length - 1]?.end ?? t0 + 0.5;

    return {
      t0, color, group: g, rig,
      update: (t) => {
        popCut(disc, t, t0, db);
        head.update(t);
        popCut(label, t, tLabel, lb);
        return {};
      },
    };
  }

  /** End of the line before `l` (or l.start when it is the first). */
  private prevEnd(l: Line): number {
    const ls = this.ctx.words.lines, i = ls.indexOf(l);
    return i > 0 ? ls[i - 1].end : l.start;
  }

  /** No aligned lines in this entry (no words.json yet): one plain beat so the frame isn't blank. */
  private empty(): Beat {
    const e = this.ctx.entry, g = new THREE.Group();
    const head = new Headline([['PAPER', 'VOX'], ['SHORT']], { size: 150, seed: 7 });
    head.times = [e.start + 0.3, e.start + 0.6, e.start + 0.9];
    place(head.group, 0, 200, Z.DIAGRAM);
    g.add(head.group);
    return {
      t0: e.start, color: C.red, group: g, rig: new Rig([{ t: e.start, x: 0, y: 0 }]),
      update: (t) => { head.update(t); return {}; },
    };
  }
}
