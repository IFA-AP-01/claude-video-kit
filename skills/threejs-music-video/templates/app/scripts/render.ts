// Headless export: Chrome renders t = n/fps, raw RGBA frames stream over a WebSocket into
// ffmpeg's stdin (nothing is written to disk but the final file).
//   npm run render -- [--from 10] [--to 30] [--out ../out/x.mp4] [--crf 16]
//   npm run still  -- --t 72.5 [--out ../out/still_72.50.png]   (or --t 72.5,80,91.25)
//   npm run render -- --portrait         (the vertical 1080×1920 cut, its own range → ../out/portrait.mp4)
//   npm run still  -- --portrait --t 115.4
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { WebSocketServer, type WebSocket } from 'ws';

process.env.MV_NO_HMR = '1';
const { createServer } = await import('vite');

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(APP, '..');
const SONG = resolve(ROOT, 'song.mp3');

const argv = process.argv.slice(2);
const flag = (k: string) => argv.includes(`--${k}`);
const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const isStill = flag('still');
const FPS = Number(opt('fps') ?? 60);
const isPortrait = flag('portrait');

const server = await createServer({ root: APP, logLevel: 'warn', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls!.local[0];

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu', '--autoplay-policy=no-user-gesture-required'],
});
const done = async (code = 0) => { await browser.close(); await server.close(); process.exit(code); };

try {
  const page = await browser.newPage({ viewport: isPortrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page] ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));
  await page.goto(`${base}?export=1${isPortrait ? '&portrait=1' : ''}`);
  await page.waitForFunction(() => window.__mv?.ready, null, { timeout: 180_000 });
  const info = await page.evaluate(() => ({
    duration: window.__mv!.duration,
    width: window.__mv!.width, height: window.__mv!.height,
    range: [window.__mv!.timeline[0].start, window.__mv!.timeline[window.__mv!.timeline.length - 1].end],
    gpu: (() => {
      const gl = (document.getElementById('gl') as HTMLCanvasElement).getContext('webgl2')!;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    })(),
  }));
  console.log(`renderer: ${info.gpu}`);

  if (isStill) {
    // --t 72.5 or --t 72.5,80,91.25 (several stills, one browser)
    const ts = (opt('t') ?? '0').split(',').map(Number);
    for (const t of ts) {
      const out = resolve(APP, (ts.length === 1 && opt('out')) || `../out/${isPortrait ? 'portrait_' : 'still_'}${t.toFixed(2)}.png`);
      await page.evaluate(([a, b]) => window.__mv!.prepare(a, b), [t, t + 0.01]);
      const url = await page.evaluate((x) => window.__mv!.still(x), t);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
      console.log(`wrote ${out}`);
    }
    await done();
  }

  // the portrait cut renders its own entry's range by default
  const from = Number(opt('from') ?? (isPortrait ? info.range[0] : 0));
  const to = Math.min(Number(opt('to') ?? (isPortrait ? info.range[1] : info.duration)), info.duration);
  const out = resolve(APP, opt('out') ?? (isPortrait ? '../out/portrait.mp4' : '../out/mv.mp4'));
  mkdirSync(dirname(out), { recursive: true });
  const nFrames = Math.round(to * FPS) - Math.round(from * FPS);
  console.log(`rendering ${from}s → ${to}s (${nFrames} frames @ ${FPS}) → ${out}`);
  await page.evaluate(([a, b]) => window.__mv!.prepare(a, b), [from, to]);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-stats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.width}x${info.height}`, '-r', String(FPS), '-i', 'pipe:0',
    '-ss', String(Math.round(from * FPS) / FPS), '-t', String(nFrames / FPS), '-i', SONG,
    '-map', '0:v', '-map', '1:a', '-vf', 'vflip',
    // a clip cut out of the song: an 80 ms fade hides a word that starts right on the last downbeat
    ...(isPortrait ? ['-af', `afade=t=out:st=${(nFrames / FPS - 0.08).toFixed(3)}:d=0.08`] : []),
    '-c:v', 'libx264', '-preset', opt('preset') ?? 'slow', '-crf', opt('crf') ?? '16', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise<number>((res) => ff.on('close', (c) => res(c ?? 1)));

  const wss = new WebSocketServer({ port: 0 });
  const port = (wss.address() as { port: number }).port;
  let got = 0;
  const t0 = Date.now();
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer) => {
      ff.stdin.write(data, () => {
        got++;
        ws.send('k');
        if (got % 120 === 0 || got === nFrames) {
          const fps = got / ((Date.now() - t0) / 1000);
          process.stdout.write(`\r  frame ${got}/${nFrames}  ${fps.toFixed(1)} fps  eta ${((nFrames - got) / fps).toFixed(0)}s   `);
        }
      });
    });
  });
  await page.evaluate(([u, a, b, f]) => window.__mv!.stream(u as string, a as number, b as number, f as number),
    [`ws://127.0.0.1:${port}`, from, to, FPS] as const);
  ff.stdin.end();
  const code = await ffDone;
  wss.close();
  console.log(`\n${code === 0 ? 'wrote' : 'ffmpeg failed:'} ${out} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await done(code);
} catch (e) {
  console.error(e);
  await done(1);
}
