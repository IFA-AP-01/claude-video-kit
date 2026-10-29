// Headless export: Chrome renders t = n/fps, raw RGBA frames stream over a WebSocket into
// ffmpeg's stdin (nothing is written to disk but the final file).
//   npm run render -- [--from 10] [--to 30] [--out ../out/x.mp4] [--crf 16]
//   npm run still  -- --t 72.5 [--out ../out/still_72.50.png]   (or --t 72.5,80,91.25)
//   npm run cues   [-- --from 0 --to 74]   → ../data/sfx_cues.json (SFX cue times for audio/)
// Native frame is the vertical 1080×1920 Short at 30 fps (src/engine/scene.ts).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { WebSocketServer, type WebSocket } from 'ws';

process.env.MV_NO_HMR = '1';
const { createServer } = await import('vite');

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(APP, '..');
// audio muxed under the picture: the final mix once audio/ produces it, else the raw voice
const AUDIO = [resolve(ROOT, 'audio/out/final_mix.wav'), resolve(ROOT, 'audio/out/voice_master.wav'),
  resolve(ROOT, 'voice.mp3')].find((p) => existsSync(p))!;

const argv = process.argv.slice(2);
const flag = (k: string) => argv.includes(`--${k}`);
const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const isStill = flag('still');
const isCues = flag('cues');
const FPS = Number(opt('fps') ?? 30);

const server = await createServer({ root: APP, logLevel: 'warn', server: { port: 5199, strictPort: false } });
await server.listen();
const base = server.resolvedUrls!.local[0];

// --soft: software GL (SwiftShader, CPU only). Slower, but never touches the GPU — use it for
// test stills/clips while other heavy jobs run (this Mac has hard-reset from GPU hangs).
// (cues never render: always software GL)
const GL_ARGS = flag('soft') || isCues
  ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [...GL_ARGS, '--autoplay-policy=no-user-gesture-required'],
});
const done = async (code = 0) => { await browser.close(); await server.close(); process.exit(code); };

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page] ${m.text()}`); });
  page.on('pageerror', (e) => console.log(`[page error] ${e.message}`));
  await page.goto(`${base}?export=1`);
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
  console.log(`renderer: ${info.gpu}\naudio: ${AUDIO}`);

  if (isCues) {
    // scene updates only, on the 30 fps grid; same T values the animations use
    const from = Number(opt('from') ?? info.range[0]);
    const to = Math.min(Number(opt('to') ?? info.range[1]), info.duration);
    const cues = await page.evaluate(([a, b]) => window.__mv!.cues(a, b), [from, to]);
    const out = resolve(APP, opt('out') ?? '../data/sfx_cues.json');
    const body = cues.map((c) => `    ${JSON.stringify(c)}`).join(',\n');
    writeFileSync(out, `{\n  "duration": ${+info.duration.toFixed(3)},\n  "cues": [\n${body}\n  ]\n}\n`);
    const per: Record<string, number> = {};
    for (const c of cues) per[c.kind] = (per[c.kind] ?? 0) + 1;
    console.log(`wrote ${out}: ${cues.length} cues (${from.toFixed(2)} → ${to.toFixed(2)} s)`);
    console.log(Object.entries(per).sort((a, b) => b[1] - a[1]).map(([k, n]) => `  ${k.padEnd(7)} ${n}`).join('\n'));
    await done();
  }

  if (isStill) {
    // --t 72.5 or --t 72.5,80,91.25 (several stills, one browser)
    const ts = (opt('t') ?? '0').split(',').map(Number);
    for (const t of ts) {
      const out = resolve(APP, (ts.length === 1 && opt('out')) || `../out/still_${t.toFixed(2)}.png`);
      await page.evaluate(([a, b]) => window.__mv!.prepare(a, b), [t, t + 0.01]);
      const url = await page.evaluate((x) => window.__mv!.still(x), t);
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
      console.log(`wrote ${out}`);
    }
    await done();
  }

  const from = Number(opt('from') ?? info.range[0]);
  const to = Math.min(Number(opt('to') ?? info.range[1]), info.duration);
  const out = resolve(APP, opt('out') ?? '../out/short.mp4');
  mkdirSync(dirname(out), { recursive: true });
  const nFrames = Math.round(to * FPS) - Math.round(from * FPS);
  console.log(`rendering ${from}s → ${to}s (${nFrames} frames @ ${FPS}) → ${out}`);
  await page.evaluate(([a, b]) => window.__mv!.prepare(a, b), [from, to]);

  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-stats',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${info.width}x${info.height}`, '-r', String(FPS), '-i', 'pipe:0',
    '-ss', String(Math.round(from * FPS) / FPS), '-t', String(nFrames / FPS), '-i', AUDIO,
    '-map', '0:v', '-map', '1:a', '-vf', 'vflip',
    // a clip cut out of the middle: an 80 ms fade hides a word cut off at the end
    '-af', `afade=t=out:st=${Math.max(0, nFrames / FPS - 0.08).toFixed(3)}:d=0.08`,
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
        if (got % 60 === 0 || got === nFrames) {
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
