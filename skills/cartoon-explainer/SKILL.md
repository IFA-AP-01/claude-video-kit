---
name: cartoon-explainer
description: Make a 16:9 Infographics-Show-style 2D cartoon explainer (flat vector puppets with lip-sync, speech bubbles, stat pills, bouncing kinetic titles, self-drawing charts, name cards, location pins, hard cuts every 2–4 s, slow camera push) from a voice-over file + script, built in HyperFrames (HTML/SVG + GSAP, deterministic 60 fps render). Characters and backgrounds are code-drawn SVG; word alignment, voice master, SFX and mix come from paper-vox-short. Use when the user wants an "Infographics Show" / cartoon explainer / animated explainer with talking characters, asks what tools that needs (Remotion, HyperFrames, GSAP, anime.js, Three.js), or continues a project with BRIEF.md + make.sh + film/compositions/.
---

# Cartoon Explainer

Input: `voice` (TTS or recording) + `script.txt`, optional brand name. Output: `out/explainer.mp4`
1920×1080, 60 fps CFR, −14 LUFS. Reference look: The Infographics Show (`references/style-dna.md`).
We copy the grammar, never their logo, characters or channel identity.

## Tool choice (decided — do not re-offer alternatives)
| Tool | Role |
|---|---|
| **HyperFrames** (Apache 2.0, `npm i hyperframes`) | compositions in HTML, Studio preview, lint/check, deterministic render |
| **GSAP** | every motion: rig poses, lip-sync swaps, letter bounce, chart draw-on, camera |
| **SVG drawn in code** | characters (`toon.js` + `cast.js`), backgrounds (`assets/bg/*.svg`) |
| paper-vox-short `audio/` + `analysis/` | voice master, tempo, word alignment, SFX synth, mix |
| Remotion, anime.js | not used (React layer / duplicate engine add nothing here) |
| Three.js | only for a rare 3D insert, via `threejs-music-video` |
| Paid AI images | only as an extra prop/background, quote the cost first |

## What the user does
1. Sends the voice file, `script.txt` (a `[Tag]` line starts each scene) and a brand name.
2. Answers one round of BRIEF questions.
3. Reviews two checkpoints in the live preview: style frame, then the full film.
4. Says "render" when happy.

## Workflow
1. **Scaffold** (installs nothing):
   ```bash
   skills/cartoon-explainer/scripts/new_explainer.sh "<project dir>" <voice> <script.txt>
   ```
   Copies `film/ tools/ sheets/`, `CLAUDE.md BRIEF.md TREATMENT.md make.sh` from this skill and
   `audio/ analysis/` from `paper-vox-short/templates`. Prints the sections and a `launch.json` line.
2. **Brief**: fill `BRIEF.md` with the user in one round (cast + setting per section, numbers on screen,
   brand). Write `TREATMENT.md` (one block per scene: shots, poses on words, overlays on words).
3. **Run**: `./make.sh setup` → `voice` → `align`. `align` ends with `film`, which writes
   `film/assets/data/words.js`, one host per section in `film/index.html` and a placeholder scene per
   section (random cast/background, lip-sync, cuts per sentence). Read `data/qa_report.md`.
   `align` also widens the voice's pauses (`PAUSE_SECTION/PARA/SENTENCE` in BRIEF.md, default 2.0/1.6/0.7 s)
   because a one-breath read overwhelms viewers. It rewrites the master in place: after `voice`, copy
   `audio/out/1.0x/voice_master.wav` to `out/` so the user can A/B the old read.
4. **Preview**: add the printed config to the workspace `.claude/launch.json`, `preview_start` →
   HyperFrames Studio on port 3002 (timeline, scrub, play).
5. **Scene 1** → `./make.sh check` (lint + craft + one snapshot per scene, read `out/check/contact-sheet.jpg`)
   → **checkpoint 1: style frame**.
6. All remaining scenes back to back, no stopping to ask between scenes (the user reviews them all at the
   end). Per scene: write → stills at each shot's midpoint (`cd film && nice -n 10 $HF snapshot --at t1,t2,…
   --no-browser-gpu -o ../out/<id>`, absolute film times) → fix → next. Then
   `./make.sh check` + `./make.sh sfx` → **checkpoint 2: full preview**, one round of notes, fix them all.
7. `./make.sh final` **only when told to render**: 3 s test, then full delivery render, ffprobe + loudness.

Ask once for `Bash(./make.sh:*)` so each step does not prompt.

## Writing a scene
Read `references/example-scene.html` (a finished 4-shot scene) and `references/rig.md` first.
- File: `film/compositions/<id>.html`; all markup inside `<template>`; root `data-composition-id="<id>"`;
  ids prefixed `<id>-`; timeline registered last as `window.__timelines["<id>"]`.
- Times only from `const S = TOON.scene(id)`: `S.at("word", nth)`, `S.phrase("a b c")`, `S.cut(n)`,
  `S.line(n)`, `S.dur`, `S.words`. Never hard-code seconds; randomness only via seeds.
- One shot = `.tz-shot > .tz-cam > (.tz-far > img.tz-bg[.soft.png]) + (.tz-mid > actors, props) +
  optional (.tz-near > img.tz-fg)`; overlays that must not zoom go outside `.tz-cam`.
  `TOON.cuts(tl, shots, times)` switches shots.
- Per shot: `idle`, `talk` (from/to = shot span), `pose` on key words, `parallax` (zoom + layer drift).
- No outlines anywhere (characters, props, inline SVG): separate shapes by a darker shade, not a stroke.
- Scene helpers: `const K = KIT(P, tl)` (`assets/lib/kit.js`, `P` = the scene's id prefix). Motion: `K.pop(el, t,
  {dur, hold, origin, sfx, x, gain})` (an origin in "px" becomes `svgOrigin`; `sfx: null` = silent), `K.stamp`,
  `K.hop`, `K.walk(rig, t0, t1)`, `K.shake(rig, t, n)` (head no), `K.sip`, `K.eyesDown`, `K.steam`. Art strings:
  `CLOUD TREE GLOW LAND THINK FACE BANG STAR SPARK PILL CHECK CUP BOWL DRAGON STEAM`, and East Asian village
  props `BAMBOO PADDY LANTERN ARECA JAR HOUSE COURT BUF HAT/hat(rig)`. `K.sp("me", {…})` derives a cast
  variant, `K.coat(a, b)` a coat colour pair. Extra poses `hold`, `phone`, `lift` are registered by `KIT`;
  add your own with `TOON.POSES.name = {armL, foreL, armR, foreR, head}` (keep the forearm angle of a pose
  that holds a prop, or the prop swings). Children: `class="tz-actor kid"`.
- Culture: when the story is set in a Vietnamese / East Asian family (village, Tết, death anniversary),
  show it in the art: tiled-roof houses, courtyard, bamboo, areca palms, paddies, red lanterns, ancestral
  altar with incense, red candles, fruit tray and chrysanthemums, conical hats, relatives gathered. Never
  write Vietnamese or Chinese characters in the art.
- Back-view actors have no pupils: skip `TOON.look`/`K.eyesDown` on them (both no-op now, but no stare).
- Overlays: `statPill` (numbers), `kinetic` (headline on `studio` bg), `bubble`, `nameCard`, `pin`,
  `chart`/`bars` on a `.tz-board`. Each helper registers its SFX cue.
- Split every scene into shots, one per line or beat, and illustrate what the line says with a small action
  (a wizard's fireball blowing up a rock, two gods' bolts clashing, a moth flying out of a wallet), never a
  narrator talking to camera. Action SFX kinds: `spell` (charge, pass dur), `blast` (impact), `thunder`
  (pass dur), `clang` (metal clash), `warp` (portal, pass dur), plus the UI kinds. Shake a dedicated wrapper
  div around `.tz-cam` (`TOON.shake` tweens x/y and would fight `parallax`/`whip`). Props held in a hand go
  inside `rig.foreR`/`foreL`; compute a held tip in stage px by rotating through `POSES[pose].armR/foreR`
  about the ORIGIN pivots (see `no_magic.html` `tip()` in the pilot).
- Hold every line long enough to read: 0.5 s + 0.3 s per word (`check` flags `line_unread`).
- Life ambience on every shot (the user wants each scene to feel lived-in): `TOON.amb(t, dur, file, db,
  { fi, fo, lp })` loops a bed from `audio/amb/<file>.mp3` over the shot span; `TOON.clip(t, file, db, x, dur)`
  plays a one-shot (laugh, door, gust) on an action. Beds sit 20 dB under the voice in pauses, dip 6 dB more
  under speech and crossfade at cuts; `db` trims a layer, `lp` dulls it (distance, behind a wall).
  Keep one-shots at ≤ −16 dB vs speech (`db` about −7 for a laugh, −19 for a wind gust) or they mask the line.
- Synth beds when no recording fits: `TOON.cue(t, kind, x, gain, dur)` with kind `night`, `traffic`,
  `crowd`, `family`, `office`, `room` (long beds, pass `dur`) or `laugh`, `cackle` (one-shots); `audio/sfx.py`
  draws them, `mix.py` LEVEL sets their dB. Keep gain low (0.06–0.25): they sit under the real beds.
- Sourcing ambience: search real recordings first (Magnific library `magnific.com/audio/sound-effects/search?q=…`,
  then the web), shortlist name/source/licence/length/size, ask before downloading, save as
  `audio/amb/<short_name>.mp3` and list each item URL in `audio/amb/SOURCES.md`. Magnific Free needs the
  credit "Sounds: Magnific" in the video description. Listen-check `out/ab/amb_only.wav` after `./make.sh sfx`.
- Music follows the story (the user wants a bed per plot phase, not one track): group scenes into phases
  (setup, grind, nostalgia, loneliness, turning point, fear, hopeful end), pick one real track per phase, list
  them in `audio/music/plan.json` (`{"xfade": 2, "phases": [{"from": scene, "to": scene, "file": stem,
  "db": 0, "start": 0}]}`) and set `MUSIC=audio/music/plan.json`, `MUSIC_DB=-22` in BRIEF.md. `mix.py`
  levels each phase K-weighted to MUSIC_DB under speech (+6 dB in pauses), high-passes 60 Hz, dips 2.5 kHz
  3 dB for the voice, crossfades 2 s at phase boundaries and prints each phase's level. Sources: incompetech.com
  (Kevin MacLeod, CC BY 4.0, direct download; catalogue `/music/royalty-free/pieces.json`), Magnific Tunes
  (free tracks `?premium=0`, 2 downloads/day on Free, the user downloads them with their account). Credits go
  in `audio/music/SOURCES.md`. Listen-check `out/ab/music_only.wav`.
- Sound has three layers: SFX (cues from the scenes), situational stingers, and phase music. Stingers are short
  musical/comic cues on story beats (sad sting on a let-down line, record scratch on an ironic one, twinkle on a
  warm one, low hit on a fear line); keep them sparse (about one per scene at most). List them in
  `audio/sting/plan.json` (`{"cues": [{"t": <end of the line>, "file": stem, "db": 0}]}`, t from
  `data/words.json`) and set `STINGS=audio/sting/plan.json`. `mix.py` starts each one in the first pause
  after t, levels it to STING_DB (-12) vs the voice with a peak cap, softens it like the SFX bus, ducks it
  under speech and dips the music 4 dB under it. Generic sounds from MyInstants are usable (ask before
  downloading); never a rip from a film, game or song (e.g. its "Sad Piano Tune" is Pixar's Up score):
  match that mood with a licensed track instead. Listen-check `out/ab/sting_only.wav`.

## HyperFrames rules (break these and the render differs from the preview)
- `fromTo`, never `from`; no `repeat: -1`; no CSS `transform` on tweened elements; never tween
  `display`/`visibility` of clips.
- Every `<audio>` has an `id` and `data-volume`.
- A font is fetched and embedded only when its `font-family` appears in the HTML itself: keep the
  `"Nunito"` declaration in `index.html` (external CSS alone renders a fallback font).
- Keep non-composition HTML (sheets, tests) outside `film/`; Studio lints every `.html` there.
- `render` has no time range: `make.sh test` renders a copy whose root duration is 3 s.

## Machine safety (required)
Software GL only (`--no-browser-gpu`), `nice -n 10`, one heavy job at a time (`make.sh` checks
`pgrep`), telemetry off (`HYPERFRAMES_NO_TELEMETRY=1 DO_NOT_TRACK=1 HYPERFRAMES_SKIP_SKILLS=1`).
Never run `snapshot --describe` (uploads frames), `publish`, `cloud`, `lambda`, `cloudrun`, `feedback`,
`auth`. Never render before the user asks.

## Parts
```
templates/
  BRIEF.md TREATMENT.md CLAUDE.md make.sh
  film/        HyperFrames project: index.html (scene hosts, one bottom-right channel logo, mix audio),
               hyperframes.json, assets/lib/toon.js (rig, lip-sync, overlays, camera, cues) · cast.js ·
               kit.js (scene helpers, props, extra poses) · toon.css,
               assets/bg/*.svg (rooms, fg_* foreground props, grain) → `make.sh bake` → *.soft.png
  tools/       build_film.mjs (words.json → words.js + hosts + placeholders) · cues.mjs (headless
               cue export → data/sfx_cues.json) · scene-template.html (placeholder scene) ·
               bake_bg.mjs (blurred PNG of an SVG) · shot.mjs / pageshot.mjs (screenshots) ·
               art/ (kit · props · props_work · presets: illustrated backgrounds) ·
               draw_bg_art.mjs (writes presets into film/assets/bg)
  sheets/      cast.html (every cast member × pose, every background) · rig.html (close-up rig check)
scripts/       new_explainer.sh · draw_backgrounds.mjs (regenerates templates/film/assets/bg from templates/tools/art)
references/    style-dna.md · rig.md · example-scene.html · lessons.md
```
Log every defect and its fix in `references/lessons.md`, then fix the template, not only the project.
