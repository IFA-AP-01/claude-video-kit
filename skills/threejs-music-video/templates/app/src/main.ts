// Preview + export entry. Preview clock = <audio>.currentTime; export renders exact t = n/fps.
import songUrl from '../../song.mp3?url';
import { Engine } from './engine/engine';
import { W, H, PORTRAIT, type TimelineEntry } from './engine/scene';

const FPS = 60;
const qs = new URLSearchParams(location.search);
const exportMode = qs.has('export');
const canvas = document.getElementById('gl') as HTMLCanvasElement;
const engine = new Engine(canvas, { exportMode });

const fmt = (t: number) => {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
};

declare global {
  interface Window {
    __mv?: {
      ready: boolean; duration: number; fps: number; width: number; height: number;
      timeline: TimelineEntry[];
      prepare(from: number, to: number): Promise<void>;
      still(t: number): Promise<string>;
      stream(url: string, from: number, to: number, fps: number): Promise<number>;
    };
  }
}

if (exportMode) setupExport(); else setupPreview();

// ---------------------------------------------------------------------------------- export
function setupExport() {
  document.body.classList.add('export');
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const gl = engine.renderer.getContext();
  const buf = new Uint8Array(W * H * 4);
  const mv: NonNullable<Window['__mv']> = {
    ready: false, duration: engine.duration, fps: FPS, width: W, height: H, timeline: engine.timeline,
    async prepare(from, to) {
      await Promise.all(engine.timeline.filter((e) => e.end > from && e.start < to).map((e) => engine.scene(e)));
    },
    async still(t) {
      await engine.render(t, 1 / FPS);
      return canvas.toDataURL('image/png');
    },
    // Render frames [from*fps, to*fps) and push raw RGBA (bottom-up rows) over a WebSocket.
    // The server acks each frame once ffmpeg has accepted it; at most 4 frames in flight.
    stream(url, from, to, fps) {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        ws.binaryType = 'arraybuffer';
        const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
        let n = n0, acked = n0, busy = false;
        const pump = async () => {
          if (busy) return;
          busy = true;
          try {
            while (n < n1 && n - acked < 4) {
              await engine.render(n / fps, 1 / fps);
              gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, buf);
              ws.send(buf);
              n++;
            }
          } catch (err) { reject(err); ws.close(); }
          busy = false;
        };
        ws.onopen = () => void pump();
        ws.onmessage = () => {
          acked++;
          if (acked >= n1) { ws.close(); resolve(n1 - n0); } else void pump();
        };
        ws.onerror = () => reject(new Error('websocket error'));
      });
    },
  };
  window.__mv = mv;
  // fonts + the first scene before ready (render.ts prepares the requested range itself)
  engine.scene(engine.timeline[0]).then(() => { mv.ready = true; });
}

// --------------------------------------------------------------------------------- preview
function setupPreview() {
  const audio = new Audio(songUrl);
  audio.preload = 'auto';
  const hud = document.getElementById('hud')!;
  const help = document.getElementById('help')!;
  const scrub = document.getElementById('scrub')!;
  const head = document.getElementById('scrub-head')!;
  const marks = document.getElementById('scrub-sections')!;
  const dur = engine.duration;

  let t = Math.max(0, Math.min(dur, parseFloat(qs.get('t') ?? '0') || 0));
  // the portrait cut is one entry: open on it rather than on silence before it
  if (PORTRAIT) { const e = engine.timeline[0]; if (t < e.start || t >= e.end) t = e.start; }
  let loop = false;
  let hudOn = qs.get('hud') !== '0';

  help.innerHTML = [
    ['Space', 'play / pause'], ['← →', '±1 s (Shift ±5 s)'], [', .', '±1 frame'],
    ['[ ]', 'prev / next scene'], ['L', 'loop scene'], ['H', 'HUD'], ['C', 'copy reference'],
  ].map(([k, v]) => `<b>${k}</b> ${v}`).join('<br>');

  for (const e of engine.timeline) {
    const d = document.createElement('div');
    d.className = 'mark';
    d.style.left = `${(e.start / dur) * 100}%`;
    d.style.width = `${((e.end - e.start) / dur) * 100}%`;
    d.textContent = e.id;
    marks.appendChild(d);
  }

  const fit = () => {
    const s = Math.min(innerWidth / W, (innerHeight - 28) / H);
    canvas.style.width = `${W * s}px`;
    canvas.style.height = `${H * s}px`;
  };
  addEventListener('resize', fit);
  fit();

  const seek = (x: number) => {
    t = Math.max(0, Math.min(dur - 1e-3, x));
    audio.currentTime = t;
  };
  seek(t);

  const entry = () => engine.entryAt(t);
  const toast = (msg: string) => {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  };

  addEventListener('keydown', (ev) => {
    const e = entry();
    const i = engine.entryIndex(e);
    const frame = 1 / FPS;
    switch (ev.key) {
      case ' ': ev.preventDefault(); if (audio.paused) void audio.play(); else audio.pause(); break;
      case 'ArrowLeft': seek(t - (ev.shiftKey ? 5 : 1)); break;
      case 'ArrowRight': seek(t + (ev.shiftKey ? 5 : 1)); break;
      case ',': audio.pause(); seek((Math.round(t * FPS) - 1) * frame); break;
      case '.': audio.pause(); seek((Math.round(t * FPS) + 1) * frame); break;
      case '[': seek(t - e.start > 1 || i === 0 ? e.start : engine.timeline[i - 1].start); break;
      case ']': if (i + 1 < engine.timeline.length) seek(engine.timeline[i + 1].start); break;
      case 'l': case 'L': loop = !loop; toast(loop ? `loop ${e.id}` : 'loop off'); break;
      case 'h': case 'H': hudOn = !hudOn; break;
      case 'c': case 'C': {
        const ref = `scene ${e.id}, ${fmt(t)}, `;
        void navigator.clipboard.writeText(ref).then(() => toast(`copied: ${ref}`), () => toast(ref));
        break;
      }
      default: return;
    }
  });

  const seekFromMouse = (ev: MouseEvent) => {
    const r = scrub.getBoundingClientRect();
    seek(((ev.clientX - r.left) / r.width) * dur);
  };
  let dragging = false;
  scrub.addEventListener('mousedown', (ev) => { dragging = true; seekFromMouse(ev); });
  addEventListener('mousemove', (ev) => { if (dragging) seekFromMouse(ev); });
  addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('click', () => { if (audio.paused) void audio.play(); else audio.pause(); });

  void engine.prepareAll();

  let lastUrlT = -1;
  const tick = () => {
    if (!audio.paused) t = audio.currentTime;
    const e = entry();
    if (loop && !audio.paused && t >= e.end - 1 / FPS) seek(e.start);
    if (audio.ended) t = dur;
    const ok = engine.renderIfReady(t, 1 / FPS);

    head.style.left = `${(t / dur) * 100}%`;
    hud.style.display = hudOn ? '' : 'none';
    help.style.display = hudOn ? '' : 'none';
    if (hudOn) {
      const f = engine.frame(t, 1 / FPS, e);
      hud.innerHTML =
        `<div class="id">${e.id}${loop ? ' <span class="loop">LOOP</span>' : ''}${ok ? '' : ' <span class="loop">loading…</span>'}</div>` +
        `<div>${fmt(t)} · bar ${f.bar + 1}.${f.beatInBar + 1} · ${f.section.name}</div>` +
        `<div class="ly">${f.line ? escapeHtml(f.line.text) : '—'}</div>`;
    }
    // keep ?t= in the URL so a reload (or HMR full reload) resumes here
    const ut = Math.round(t * 100) / 100;
    if (audio.paused && ut !== lastUrlT) {
      lastUrlT = ut;
      qs.set('t', String(ut));
      history.replaceState(null, '', `?${qs}`);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
