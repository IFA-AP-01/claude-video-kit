---
name: kurz-look
description: Kurzgesagt / Star Birds-grade look for science explainers, films and music videos — vivid saturated space palettes, semi-3D (2.5D) volume-shaded vector art, glows, multi-plane parallax, blurred foreground bokeh, an original chibi critter cast ("Momo"), karaoke captions and stat pills, all in one deterministic SVG HTML film driven by render(t). Use when the user wants the "Kurzgesagt style", "Star Birds style", "kurz-look", a glowing cosmic science explainer, or to restyle a voice + script film in this look. Original characters only — never copy Kurzgesagt's birds, characters or logos.
---

# Kurz-look

Output: one self-contained `film.html` (SVG, 60 fps-deterministic, `?t=` / `?render` / `window.seek(t)`)
synced to a voice mix, with karaoke captions, stat pills and the channel bug. Default 1080×1920
vertical; set `CFG.W/H` for 16:9.

Read first:
- `references/STYLE-BIBLE.md` — construction, colour, cast, depth, light, motion, borrowed patterns,
  and the 2026-11-05 revision (vivid + detailed + semi-3D), which overrides "flat two tones".
- `references/lessons.md` — every gotcha hit while building the reference films.
- `references/examples/teleport.html` — worked example: 14 shots, 53 s, every kit helper in use
  (pods, dishes, satellite, Earth, lab bench, parcel, pills with live counters). Copy shot patterns
  from here. `examples/pilot.html` is the first 12 s style pilot (older flat look, GSAP timeline).
  To run an example, put it next to `kit.js` + `vendor/` (teleport also expects `tp/` → a
  cartoon-explainer `film/assets` folder).

## Pipeline

1. **Voice + timing** come from the `cartoon-explainer` pipeline (`./make.sh align` there produces
   `film/assets/data/words.js` = `window.TOON_DATA` with `lines[].words[{w,start,end}]`, and the
   mix in `film/assets/audio/mix.wav`). Do not rebuild alignment here.
2. **Scaffold**:
   ```bash
   skills/kurz-look/scripts/new_film.sh "<project>/kurz" <words.js> <mix.wav>
   ```
   Add the printed entry to `.claude/launch.json` and `preview_start` it.
3. Set `CFG` (`T0/T1` for a chunk, caption/pill tops, bug text). Replace the two sample shots.
4. **Shot list**: one shot per spoken line or beat, each
   staged as action, varied camera (top-down, close-up, wide, POV once). Write it as a comment-free
   table in the project's notes, not in code.
5. Build shot 1 → **checkpoint 1: style frame**. Then build every remaining shot back to back,
   screenshot-check each at its key time (no console errors, nothing clipped, captions readable)
   → **checkpoint 2: full HTML preview**.
6. Render only when the user asks (60 fps CFR, real frames from `?render&t=`). No render script
   ships with this skill yet; frame capture follows `video-playbook/PIPELINE.md`.

## Shot framework (in film.html)

- `shot(t0,t1,g=>{ build…; return t=>{ per-frame… } })` — group shown only inside `[t0,t1)`;
  a blurred foreground `bokeh` layer is added automatically.
- `camG(g,p,s0,s1,cx,cy,dx,dy)` — slow dolly/push on a group; `p = seg(t,t0,t1)`.
- `PILLS=[[t0,t1,'text' | t=>'live text'], …]` — consecutive pills chain with a bump.
- Captions: ≤3 words / ≤15 chars per chunk, break on punctuation or gaps > .45 s, active word yellow.
- Everything is a pure function of `t`: seeded `rng(seed)`, no `setTimeout`, no `Math.random`.

## kit.js API

- Core: `el(tag,attrs,parent)`, `defs`, `rng(seed)`, `clamp`, `lerp`, `seg(t,a,b)`, easing `E.out/io/back`,
  `pop(t,at,dur)`, `tf(node,x,y,s)`, `blob(R,cx,cy,r,n,jitter)`, `circ`, `rrect`, `layer`, `cam`.
- Colour: `hx`, `mix(a,b,k)`, `boost(c,sat,light)`.
- Volume (semi-3D): `shaded(g,{d,cx,cy,r,base,shade,light,rim,lx,ly,spec,tex,seed})` radial volume +
  rim bounce + specks + specular; `box3d(g,x,y,w,h,depth,{front,top,side,r,tex})` front/top/side
  faces; `ao(g,x,y,rx,op)` contact shadow; `rivets(g,pts,col,r,op)`.
- Light: `glow(g,x,y,r,cols)` (palette `CY`, `WARM`, `PINK`), `glint`, `soft`.
- World: `spaceBg(g,seed,{W,H,c0,c1,c2,neb:[[x,y,r,col,op]],n,g,pl,raw})` returns `bg(t)`;
  colours auto-boosted (sat ×1.5, light ×1.72) unless `raw:true`. `planet(g,x,y,r,{…,ring,halo})`,
  `bokeh(g,seed,n,cols,blur)`.
- Cast: `momo(parent,{helmet,cap,cup,…colours})` → `{root,update(t),wave,look:[x,y],space,energy,sweat,shrug}`.
  Place with `m.root.setAttribute('transform',…)`, call `m.update(t)` every frame; `m.space=false`
  turns on its ground contact shadow. Recolour for new cast members; keep proportions.
- Text: `txt(g,x,y,s,size,fill,o)`.

## Rules

- Vivid, saturated mid-tone scenes; never near-black backgrounds.
- Every form has volume (light side → terminator → dark core + rim) and secondary detail
  (rivets, panel lines, specks, LEDs, bands). No plain single-shape props.
- 5–7 depth planes, blurred foreground, contact shadows under grounded things.
- Change by one step when the user says "more/less"; keep composition.
- Original cast and props only.
