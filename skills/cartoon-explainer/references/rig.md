# Puppet rig (`film/assets/lib/toon.js`)

## Cast
`cast.js` maps a key to a spec; `<div class="tz-actor" data-cast="exec">` + `TOON.actor(el)` draws it.
```js
TOON.CAST.exec = { outfit: "suit", skin: "light", hair: "side", hairColor: "brown" };
```
| Field | Values |
|---|---|
| `outfit` | `suit`, `labcoat`, `worker` (hi-vis vest + hard hat, `hat: false` to drop it), `casual` |
| `skin` | `light`, `tan`, `brown`, `dark`, or a hex |
| `hair` | `side`, `bun`, `curly`, `long`, `grey`, `bald` |
| `hairColor` | `black`, `brown`, `blond`, `red`, `grey`, `white`, or a hex |
| extras | `glasses`, `beard`, `moustache`, `flip` (mirror), `colors: { coat, shade, shirt, tie, vest }` |

Starter cast: `exec`, `scientist`, `worker`, `analyst`, `guy`. Add new members in `cast.js`; check them
on `sheets/cast.html` (served from the project root, needs `film/assets/lib/gsap.min.js` from setup).
Sizes: `.tz-actor` 560×859, `.sm`, `.lg`.

## Drawing (no outlines)
Every part is filled, never stroked. Limbs are tapered capsules from `seg(ax, ay, bx, by, ra, rb, fill,
shade, side)`: the fill plus a shade crescent (the capsule offset 1.4 × r toward `side`, clipped by the
capsule). Upper arm ends at r 36 and the forearm starts at r 36, so the elbow has no seam. Head, torso,
hair and hands follow the same pattern: base fill, shade crescent away from the light, one highlight.
Colours pass through `mute()`; shades come from `mix(colour, dark, t)`. Check changes on `sheets/rig.html`.

## SVG groups and pivots (viewBox 600×920)
| Group | Pivot (`svgOrigin`) | Driven by |
|---|---|---|
| `.tz-body` | 300 920 | `idle` breathing (scaleY 1.012, 1.7 s yoyo, finite repeat) |
| `.tz-head` | 300 440 | `pose` head tilt |
| `.tz-eyes` | 300 270 | `idle` blinks (seeded 2.2–4.6 s apart) |
| `.tz-pupil` | — | `look(dx)` |
| `.tz-brows` | — | `brows(dy, hold)` (negative = raised) |
| `.tz-armL/R` | 182 520 / 418 520 | `pose` upper arm |
| `.tz-foreL/R` | 150 712 / 450 712 | `pose` forearm + hand |
| `.tz-m-{rest,closed,open,round,wide}` | — | `talk` (opacity swaps via `tl.set`) |

Poses (`TOON.POSES`, degrees): `rest`, `explain`, `explain2`, `point` (to the right), `pointL`,
`shrug`, `handsUp`, `think`, `cross`. `pose(tl, rig, t, name, dur=0.35)` tweens from the rig's last
pose, so call poses in time order per actor.

## Lip-sync
`talk(tl, rig, S.words, { from, to })` maps each aligned word to visemes from its folded spelling
(Vietnamese diacritics stripped): initial `m/b/p/ph` → closed; each vowel group → `a` open, `o/u`
round, else wide; final `m/p/b` → closed; digits → 1–3 open/wide/round. Mouth leads the audio by
40 ms and rests in gaps over 0.12 s. Restrict `from/to` to the shot so only the visible actor talks.

## Scene helpers
| Call | Notes |
|---|---|
| `TOON.scene(id)` | `S.at(word, nth)`, `S.phrase(text, nth)` → `{start, end}`, `S.cut(n, lead=0.12)`, `S.line(n)`, `S.words`, `S.dur`; throws if a word is missing |
| `idle(tl, rig, t0, t1, seed)` | breathing + blinks for the shot span |
| `gestures(tl, rig, words, seed)` | seeded automatic pose changes every ~2.6 s (placeholder scenes) |
| `enter/exit(tl, el, t, {from/to})` | slide from an edge |
| `pop`, `bubble`, `statPill`, `pin` | `{ hold }` to leave again; default stays |
| `kinetic(tl, el, t, { seed, stagger, hold })` | splits into `.tz-word > .tz-ch` |
| `nameCard(tl, el, t, { hold: 2.5 })` | slides in from the left and out |
| `chart(tl, path, t, { dur, dots })` | stroke draw-on + dots pop |
| `bars(tl, els, t)` | grow from the bottom |
| `camera(tl, cam, t0, t1, { to, origin, x1, y1 })` | linear push/pan |
| `parallax(tl, shot, t0, t1, { dx, dy, from, to, origin, far, near })` | zoom `.tz-cam` + drift `.tz-far/.tz-mid/.tz-near` at 0.3/1/1.8 × dx |
| `shake(tl, el, t, { amp })` | seeded impact shake |
| `cuts(tl, shots, times)` | hard cuts by opacity |
| `cue(t, kind, x, gain, dur)` | extra SFX: stamp, slap, paper, tape, whoosh, tick, type, cross, fan, hiss, pop |
