// Phase-1 sync check: lyrics light up word by word on black, beat dots pulse.
// Debug scene — not part of the final look. Red = low-confidence word (listen to it).
import * as THREE from 'three';
import type { Text } from 'troika-three-text';
import { Scene, pixelCamera, W, H, type Frame } from '../engine/scene';
import { makeText, syncAll, textWidth } from '../engine/text';
import { C, FONT } from '../engine/palette';
import { clamp, expoOut } from '../engine/ease';
import type { Line } from '../engine/lyrics';

const SIZE = 84;
const MAX_W = 1600;
const LOW_CONF = 0.6;

interface WordMesh { text: Text; bar: THREE.Mesh; x: number; y: number; w: number; start: number; end: number; low: boolean }
interface LineMesh { line: Line; group: THREE.Group; words: WordMesh[]; small: Text }

export default class SyncScene extends Scene {
  private scene = new THREE.Scene();
  private cam = pixelCamera();
  private lines: LineMesh[] = [];
  private dots: THREE.Mesh[] = [];
  private extras: { start: number; end: number; text: Text }[] = [];
  private label!: Text;
  private clock!: { canvas: HTMLCanvasElement; tex: THREE.CanvasTexture; mesh: THREE.Mesh };

  async init() {
    this.scene.background = new THREE.Color(C.night);
    const { entry, lyrics } = this.ctx;
    const a = entry.start - 4, b = entry.end + 4;
    const texts: Text[] = [];

    for (const line of lyrics.lines.filter((l) => l.end >= a && l.start <= b)) {
      const group = new THREE.Group();
      const words: WordMesh[] = line.words.map((wd) => {
        const text = makeText(wd.w, { size: SIZE, font: FONT.display, anchorY: 'middle' });
        const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 6), new THREE.MeshBasicMaterial({ color: C.paper }));
        group.add(text, bar);
        texts.push(text);
        return { text, bar, x: 0, y: 0, w: 0, start: wd.start, end: wd.end, low: wd.conf < LOW_CONF };
      });
      const small = makeText(line.text, { size: 34, font: FONT.display, color: C.muted, anchorX: 'center' });
      texts.push(small);
      this.scene.add(group, small);
      this.lines.push({ line, group, words, small });
    }
    for (const e of lyrics.extras.filter((x) => x.end >= a && x.start <= b)) {
      const text = makeText(`(${e.text})`, { size: 30, font: FONT.mono, color: C.muted, anchorX: 'center' });
      text.position.set(0, -330, 0);
      texts.push(text);
      this.scene.add(text);
      this.extras.push({ start: e.start, end: e.end, text });
    }
    this.label = makeText(entry.id.toUpperCase(), { size: 28, font: FONT.mono, color: C.muted });
    this.label.position.set(-W / 2 + 80, H / 2 - 80, 0);
    texts.push(this.label);
    this.scene.add(this.label);
    await syncAll(texts);

    // word layout: wrap into rows of at most MAX_W, rows centred
    for (const lm of this.lines) {
      const space = SIZE * 0.28;
      const rows: WordMesh[][] = [[]];
      let rowW = 0;
      for (const wm of lm.words) {
        wm.w = textWidth(wm.text);
        if (rows[rows.length - 1].length && rowW + space + wm.w > MAX_W) { rows.push([]); rowW = 0; }
        rowW += (rows[rows.length - 1].length ? space : 0) + wm.w;
        rows[rows.length - 1].push(wm);
      }
      rows.forEach((row, ri) => {
        const total = row.reduce((s, wm) => s + wm.w, 0) + space * (row.length - 1);
        let x = -total / 2;
        const y = (rows.length - 1) * 0.6 * SIZE - ri * 1.2 * SIZE;
        for (const wm of row) {
          wm.x = x; wm.y = y;
          wm.text.position.set(x, y, 0);
          wm.bar.position.set(x, y - SIZE * 0.62, 0);
          x += wm.w + space;
        }
      });
    }

    // beat dots: 4 per bar, the downbeat one larger
    for (let i = 0; i < 4; i++) {
      const r = i === 0 ? 16 : 10;
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: C.paper, transparent: true }));
      m.position.set((i - 1.5) * 70, -H / 2 + 110, 0);
      this.dots.push(m);
      this.scene.add(m);
    }

    // burned-in timecode (2D canvas) so exported videos can be checked against the audio
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 64;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(512, 64), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    mesh.position.set(W / 2 - 80 - 256, -H / 2 + 110, 0);
    this.scene.add(mesh);
    this.clock = { canvas, tex, mesh };
  }

  render(f: Frame, target: THREE.WebGLRenderTarget | null) {
    const t = f.t;
    // current line = active, else the next upcoming line (so it is visible before it starts)
    const cur = this.lines.find((l) => t >= l.line.start && t <= l.line.end)
      ?? this.lines.find((l) => l.line.start > t && l.line.start - t < 1.5);
    const next = cur ? this.lines[this.lines.indexOf(cur) + 1] : this.lines.find((l) => l.line.start > t);

    for (const lm of this.lines) {
      const isCur = lm === cur;
      lm.group.visible = isCur;
      lm.small.visible = !isCur && lm === next;
      lm.small.position.set(0, -260, 0);
      if (!isCur) continue;
      for (const wm of lm.words) {
        const sung = t >= wm.end, singing = t >= wm.start && t < wm.end;
        const base = wm.low ? C.accent : C.paper;
        wm.text.color = singing || sung ? base : (wm.low ? '#5a2620' : '#30343c');
        // small pop when the word starts
        const pop = singing ? 1 + 0.08 * (1 - expoOut(clamp((t - wm.start) / 0.15))) : 1;
        wm.text.scale.setScalar(pop);
        wm.text.position.set(wm.x, wm.y + (singing ? 6 : 0), 0);
        // timing bar under the word fills during [start, end]
        const k = clamp((t - wm.start) / Math.max(0.01, wm.end - wm.start));
        wm.bar.visible = t >= wm.start;
        wm.bar.scale.x = Math.max(0.001, wm.w * k);
        wm.bar.position.x = wm.x + (wm.w * k) / 2;
        (wm.bar.material as THREE.MeshBasicMaterial).color.set(wm.low ? C.accent : singing ? C.paper : C.muted);
      }
    }
    for (const e of this.extras) e.text.visible = t >= e.start && t <= e.end;

    this.dots.forEach((d, i) => {
      const on = i === f.beatInBar;
      const flash = on ? Math.exp(-f.beatPhase * 5) : 0;
      (d.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.82 * flash;
      (d.material as THREE.MeshBasicMaterial).color.set(i === 0 && on ? C.accent : C.paper);
      d.scale.setScalar(1 + 0.35 * flash);
    });

    const g = this.clock.canvas.getContext('2d')!;
    g.clearRect(0, 0, 512, 64);
    g.fillStyle = C.muted;
    g.font = '600 30px ui-monospace, Menlo, monospace';
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    const m = Math.floor(t / 60), s = t - m * 60;
    g.fillText(`${m}:${s.toFixed(2).padStart(5, '0')}  b${f.bar + 1}.${f.beatInBar + 1}`, 508, 32);
    this.clock.tex.needsUpdate = true;

    const r = this.ctx.renderer;
    r.setRenderTarget(target);
    r.render(this.scene, this.cam);
  }
}
