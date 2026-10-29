// playcheck.mjs <outdir> <start_s> <seconds> [shots]: plays the PREVIEW page (not the render path) in real time,
// reports rAF fps, film-time vs wall-clock and page errors, and saves screenshots taken during playback.
// Run from the film folder with the film served at FILM_URL and STAGE set like render.py.
import fs from 'fs';
import { launch, FILM_URL, SW, SH } from '../../scenario-kinetic-film/scripts/browser.mjs';
const [OUT, START = '0', SECS = '4', SHOTS = '8'] = process.argv.slice(2);
if (!OUT) { console.error('usage: node playcheck.mjs <outdir> <start_s> <seconds> [shots]'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const b = await launch();
const pg = await b.newPage({ viewport: { width: SW, height: SH + 220 } });
const errs = [];
pg.on('pageerror', e => errs.push('PAGE ' + e.message));
pg.on('console', m => { if (m.type() === 'error' && !/favicon|404|save power/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
await pg.goto(`${FILM_URL}index.html?t=${START}`);
await pg.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await pg.waitForTimeout(2000);
const t = () => pg.evaluate(() => parseFloat(document.querySelector('.scrubt').textContent));
await pg.evaluate(() => { window.__n = 0; const f = () => { window.__n++; requestAnimationFrame(f); }; requestAnimationFrame(f); document.querySelector('.scrubp').click(); });
const dur = await pg.evaluate(() => window.__film.dur);
const w0 = Date.now(), f0 = await t(), n0 = await pg.evaluate(() => window.__n), log = [];
let prev = f0, adv = 0;
for (let i = 0; i < +SHOTS; i++) {
  await pg.waitForTimeout(+SECS * 1000 / +SHOTS);
  const ft = await t();
  adv += ft >= prev ? ft - prev : ft - prev + dur; prev = ft;
  await pg.screenshot({ path: `${OUT}/play_${String(i).padStart(2, '0')}_${ft.toFixed(2)}.png`, clip: { x: 0, y: 0, width: SW, height: SH } });
  log.push(ft.toFixed(2));
}
const wall = (Date.now() - w0) / 1000, f1 = await t(), n1 = await pg.evaluate(() => window.__n);
adv += f1 >= prev ? f1 - prev : f1 - prev + dur;
const fps = (n1 - n0) / wall, speed = adv / wall;
console.log(`rAF ${fps.toFixed(0)} fps | film time ${speed.toFixed(2)}x wall clock | shots at ${log.join(' ')}`);
console.log(errs.length ? errs.slice(0, 8).join('\n') : 'no page errors');
await b.close();
process.exit(fps < 50 || speed < .9 || speed > 1.1 || errs.length ? 1 : 0);
