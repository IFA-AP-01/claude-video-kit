# Lessons — defect → root cause → rule

Add one entry per defect, newest last. Fix the template, not only the project.

## Skill build (2026-10-29, demo on the Tesla Roadster voice)
1. **Bun floated above the head.** The bun circle was centred at y=30, above the skull top (y=110).
   Rule: hair pieces must overlap the skull outline; bun centre y=66 r=58. Check every cast change on
   `sheets/cast.html`.
2. **Curly hair read as spikes.** Zig-zag points. Rule: curls are arc bumps (`A r r 0 0 1`, r ≈ 0.56 ×
   segment) along the hairline.
3. **Render used a fallback font while preview/snapshot used Nunito.** The render compiler injects web
   fonts only for `font-family` names found in the HTML; ours lived only in `toon.css`.
   Rule: declare `font-family: "Nunito"` in `index.html`; compare one rendered frame against a snapshot.
4. **Studio showed a lint error for `sheets/cast.html`.** Studio lints every `.html` under `film/`.
   Rule: non-composition pages live outside `film/` (`sheets/`).
5. **`check` flagged a 3-word kinetic title as 16 words.** The checker joins separate text nodes with
   spaces, so a per-letter split counts letters. Rule: judge `.tz-kinetic` holds by the real word count
   (0.5 s + 0.3 s a word); the warning on letter-split titles is expected.
6. **Bubble on screen 1.37 s for 6 words.** It appeared on its own phrase, near the shot end.
   Rule: a bubble enters with the shot (`cut + 0.4`) or ≥ 0.5 s + 0.3 s/word before the next cut.
7. **`make.sh` refused to run ("another heavy job").** The guard matched HyperFrames' idle
   `warmCheck` Chrome and the calling shell, whose command line contained "hyperframes check".
   Rule: match only the job processes; drop shells and grep from the `pgrep` output.
8. **`make.sh check` printed no findings.** It read keys that do not exist. The JSON has one section per
   checker (`lint runtime layout motion contrast craft audio …`), each with `findings[]`.
   Rule: iterate every section, print non-info findings. `layout container_overflow` (info) comes from
   the camera push and is expected.

## Pilot "My Boring Life in a Boring World" (2026-10-29)
9. **Title card left a black gap.** The scene placeholder ended before the next host started.
   Rule: scene hosts tile the timeline end to end; `check` frames must show no `#ground` colour.
10. **`make.sh … | head` killed the job.** SIGPIPE stopped the pipeline after a few lines.
    Rule: log to a file (`> out/x.log 2>&1`) and read the tail.
11. **Characters looked like separate parts.** Ink outlines on every part (head, torso, upper arm,
    forearm, hand) drew seams at each joint. The reference has no outlines.
    Rule: no strokes on characters, props or backgrounds; separation by a shade crescent (`seg()`
    offset capsule clipped by the shape); forearm start radius = upper-arm end radius so the elbow is
    seamless.
12. **Colours too saturated next to the reference.** Raw palette hexes. Rule: `mute()` every outfit,
    skin, hair and background colour.
13. **Flat, stage-like shots.** One image + actors zoomed together has no depth. Rule: three layers
    with `TOON.parallax`, blurred background baked to PNG (a live CSS blur on a zooming layer costs every
    frame), a blurred foreground prop on some shots.
14. **Window mullions vanished** after outlines became translucent. Rule: frames and mullions are
    filled light shapes, never outline strokes.

15. **Burst transition invisible in snapshots.** Cause: `svgOrigin` passed inside `fromTo` vars on `<g>` children of a freshly appended SVG made GSAP bake translations of 30–90k px, so the stars rendered far off-screen. Fix: `gsap.set(g, { svgOrigin: "0 0" })` once right after appending, never inside the tweens. Debug fast with an isolated headless page (gsap + toon.js + one overlay div, `tl.seek`), reading the `transform` attribute.
16. **Burst painted a flat colour over the cut instead of revealing the next shot.** The user wants the jagged burst to *contain* the incoming scene. A proxy tween with `onUpdate` writing `style.clipPath` never fired because `tl.seek()` (how HyperFrames renders) suppresses callbacks. Fix: put an SVG `<clipPath clipPathUnits="userSpaceOnUse">` with the star polygon in the burst SVG, set `clip-path:url(#id)` on the incoming shot at t0, tween the polygon's `scale` (svgOrigin set once with `gsap.set`), and clear `clipPath` just after the cut. Never rely on GSAP callbacks for frame-accurate visuals.

17. **Characters built from circles, ellipses and tubes looked like toy assemblies.** Fix: draw each part as a
    sculpted silhouette: head path with temple, cheekbone, jaw corner and chin; limbs from width profiles along
    a bone (`limb()`), with elbow creases and hem bands; hands with knuckle scallops and a separate thumb.
    Shade with one clipped plane per part. Faceted triangles look shattered, and bracket-shaped chest folds or
    zigzag shine look like noise. Back views need their own hair shapes: a front-view hair path reused at the
    back shows its hidden edges (the bald side-hair read as a face mask). Draw a back fringe with a wispy top edge
    that reaches the nape.

18. **Backgrounds looked like diagrams.** Rooms built from bare rectangles and circles with outlines read as
    clip art next to illustrated characters. Fix: a shared art kit (`tools/art/`): every prop is a sculpted
    silhouette with one clipped shade plane, a highlight strip, a contact shadow and a glow for each light;
    walls get wallpaper or a vertical shade gradient, floors get planks, carpet, tiles or perspective lines.
    Presets live in `presets.mjs` so the skill and every project share them; a scene-specific background is a
    new preset built from the same props. Clouds drawn as round bumps on a flat base looked like a circle
    assembly; `dayCloud()` uses overlapping `blob()` lumps with a shaded underside. Door wood grain drawn at
    0.3 opacity read as cracks; keep grain ≤ 0.16 opacity, 2 px.

19. **Ambience sourcing.** The user wants real recordings rather than synthesised beds. Pixabay sound effects sit
    behind a Cloudflare captcha (never bypass it); the Magnific MCP's AI SFX generation needs credits (Free plan
    has 0). What worked: Magnific's web library search, item page → the preview MP3 on its CDN. Two Magnific CDN
    names (`comedic-laughter.mp3`, `laughing-hysterically.mp3`) were identical 17 KB stubs; check size/duration
    after download and take the `_v2` file from the item page.
20. **A wind gust masked a voice line.** At −10 dB vs speech the empty-hall gust swallowed "Nobody showed up";
    a laugh at −6 dB did the same to the next words. Rule: one-shots under speech ≤ −16 dB vs the voice, beds
    20 dB under in pauses with a 6 dB duck under speech; measure per shot (bed RMS vs speech RMS) after `sfx`.
21. **Loop seams and edge thumps in beds.** Library clips start/end with fades or handling bumps (a balcony
    recording peaked at 9.99 s). Rule: trim 0.3 s off both ends, loop with a 0.5 s equal-power crossfade from a
    seeded random start, crossfade beds 0.15 s across a cut.
22. **Music sourcing.** MyInstants (which the user suggested) only holds 1–18 s meme buttons with no licence, many
    ripped from copyrighted works: unusable for beds. Magnific Tunes free tracks are limited to 2 downloads/day on
    the Free plan and need the credit "Music by Magnific"; never pull the stream URL to get round the limit, let
    the user download them. incompetech (CC BY 4.0) downloads directly.
23. **Tracks differ ~12 dB in loudness; plain RMS levelling still left a 6 dB spread.** One gain for all tracks
    buried Past Sadness and Promises to Keep. Levelling each phase on RMS above 150 Hz still left Autumn Day
    5 dB hotter than Promises to Keep (energy in the low mids). Fix: level each phase on K-weighted RMS
    (BS.1770 shelf + 38 Hz high-pass) against the voice's K-weighted speech RMS; all phases then land within
    ±0.7 dB of MUSIC_DB.
24. **The voice stayed bright although the master "cut" 6–12 dB at 5–9 kHz.** Three causes stacked: (a)
    `scipy.signal.minimum_phase(method="homomorphic")` returns roughly the square root of the FIR's magnitude, so
    every EQ cut landed at half depth; (b) the low-mid cut lowered the 1 kHz reference, so the highs read ~2 dB
    hotter relative to it; (c) the compressor and loudnorm lifted quiet consonants against vowels, adding ~5 dB
    at 2–9 kHz to the long-term spectrum after the EQ. Fix: square the gains before `minimum_phase`, then repeat
    the tonal EQ after the dynamics (3 passes) and finish with a static gain and a TP limiter. Result on "My Boring
    Life": the final mix fell 5.4 dB at 7.1 kHz and 4.9 dB at 9 kHz; it now lies within ~2 dB of the target curve.
    Rule: after every voice master, measure the spectrum of the *output* against the target. A printed
    correction is not a result.
25. **SFX and ambience piled up at 2–6 kHz** (clicks, whooshes, crickets at ~4.5 kHz). Fix: `BUS_DIP` (−3.5 dB at
    3.8 kHz, Q 0.8) and a 13 kHz low-pass on both buses before ducking.
26. **Necks looked pasted onto the shirt; elbows showed a V-notch; raised arms showed a square shoulder corner.**
    Cause: the neck lived in the head group with a flat bottom drawn *over* the collar, and the collar U was
    filled with shirt shade; the two limb segments met with round caps and nothing behind the joint. Fix (toon.js
    `makeChar`): the neck moved to the body layer, drawn inside `torso()` after the torso fill and before the
    collar pieces, so the collar overlaps its bottom; its shade stripe is clipped to the neck path; the chin cast
    shadow stays in the head group so it moves with the chin; long `hairBack` has a notch so hair does not cover
    the neck; a sleeve-coloured circle (r 36) sits under the shoulder and the elbow. Rule: review rigs on zoomed
    stills (`sheets/rig.html?zoom=2&nod=16`) at bent and raised poses with a head nod, not only at rest.
27. **A stinger landed on the tail of the spoken word.** The aligner's word end for "travel" was 19.82 s but the
    voice ran to ~20.4 s, so a record scratch at t+0.15 s sat under speech and was ducked away. Fix: `mix.py`
    starts each stinger in the first pause (speech activity < 0.5) within 1 s after t + gap. Also: MyInstants'
    "Sad Piano Tune" is `_up_-sad-scene.mp3`, a rip of Pixar's Up score; use the mood, not the file
    (opening bed became Kevin MacLeod "Heartbreaking", CC BY).
28. **The voice sounded boomy.** A deep male TTS (median f0 ~100 Hz) mastered down to the textbook speech LTASS
    still carried +13 dB at 100–315 Hz against 1 kHz, which reads as heavy and tiring. Fix (paper-vox-short
    `master.py`): `LOW_TARGET` sits ~3–4 dB lower at 60–200 Hz and the high-pass moved from 70 to 80 Hz.
    Result: 80 Hz +9.8 → +6.0, 100 Hz +12.5 → +8.6, 160 Hz +13.2 → +10.1, 250 Hz +13.2 → +11.0 dB vs 1 kHz;
    above 500 Hz unchanged, loudness unchanged.
29. **First pass of an action scene ("no magic, no gods, no time travel") had five readable-frame defects.**
    (a) The record-scratch freeze caught the falling character at 16 % scale, too small to read: end motion that
    a freeze frame lands on at a readable size (≥ 40 %). (b) A top-down bifold wallet showed its inside while
    closed: hide the inner half and unfold it (scaleX 0 → 1 about the hinge) after the flap folds away.
    (c) Continents from point arrays looked low-poly: draw `Q` curves through edge midpoints with a same-colour
    round-join stroke. (d) Price tags were placed on dots behind the foreground character: place overlays only
    in the free part of the frame. (e) `TOON.shake` on the camera fought the parallax tween: shake a wrapper div.
30. **First pass of the office scene ("work") had four readable-frame defects.** (a) A prop parked off-frame
    before its drop (`y: -700`) still peeked in at the top: park drop-ins further than their own height plus the
    distance to the frame edge. (b) Scissors tweened with `rotation: 180` on an SVG group rotated about the group's
    bbox corner and drifted off the cut line: draw the prop already facing the right way and tween only x/y.
    (c) Bust-only characters standing on top of stair blocks read as floating torsos: draw the steps in front of
    the climbers and sink each body ~150 px below the step lip, so the riser hides the cut. (d) Rapid pose swaps
    (`TOON.pose` every 0.13 s) left `gsap_tween_tail` warnings from the body-lean tween: pass `dur ≤ 0.05` for
    run cycles so no lean is added. Also: stacked calendar pages need `data-layout-allow-overlap` on their SVG.
31. **Voice read in one breath overwhelms viewers** (My Boring Life, 2026-10-30). The user found the continuous
    read too dense: scene changes had 0.4–1.7 s gaps, paragraph breaks no more than sentence ends. Fix:
    `audio/pauses.py` (run by `make.sh align`, or `make.sh pauses`) widens gaps to PAUSE_SECTION / PAUSE_PARA /
    PAUSE_SENTENCE (2.0 / 1.6 / 0.7 s) with the voice's own room tone and shifts words.json + stinger times;
    scenes follow because their times come from `TOON.scene`. Also `make.sh sfx` mixed against a stale
    `words.js` (music phases kept the old section times): it now runs `film` first.
32. **new_job defects** (2026-10-30): querySelector with a template literal fails lint
    (`template_literal_selector`) — build selectors with `+`; props inserted into `rig.body` cover the arms —
    insert before `rig.armL`; near-layer fog drawn over faces — keep fog out of the actors' head band; a drop
    must travel past the frame edge; a fast vehicle pass-by needs linear ease and an earlier start; scene-wide
    `S.at(word, nth)` counts every occurrence in the scene — check the nth; clip actors with a wrapper's
    `clip-path: inset(...)`, not a shorter container.
33. **village defects** (2026-10-30): (a) `tools/build_film.mjs` matched `<div id="root"` literally; Studio had
    inserted `data-hf-id` before `id`, so the root kept a stale `data-duration` and the lint said the last scene
    was cut off — match attributes in any order. (b) A `fromTo` with `y` on an SVG `<g>` that carries
    `transform="translate(...)"` replaced the translate (GSAP parses the attribute into x/y), so a buffalo jumped
    to the top of the frame — put the transform attribute on an inner `<g>` and tween an outer wrapper without
    one. (c) The bald back view drew a white zigzag band over the lower head that read as a beard or face mask —
    it now draws the full back hair cap in the hair colour with a smaller skin dome on top. (d) Hiding actors
    with `y: 900` before an `enter` still let a tall head peek in at the frame edge — hide with opacity until
    the enter time. (e) Props at x > 1800 get cut by the camera push — keep them inside x ≤ 1830 after zoom.
34. **mangoes … the_letter defects** (2026-10-30): (a) Bust actors need a near-layer desk or counter, or they
    read as floating torsos. (b) Never run a pose head tween and `K.shake` on the head in the same window, and
    keep `TOON.pose` calls ≥ 0.5 s apart; an entry `x` tween plus a lean-in on the same actor also leaves a
    `gsap_tween_tail`. (c) Don't shake and camera-tween the same element — shake the shot, push the cam.
    (d) A white icon on a white disc is invisible; give icons a colour. (e) Duplicate element ids break actors —
    always prefix with the scene's `P`. (f) Reading text ≥ 28 px, even labels inside props. (g) A fixed-height
    `BODY()` leaks out of scaled icons — pass `h` scaled too. (h) Mouth shapes are only rest/closed/open/round/
    wide — "smile" or "o" silently do nothing (kit `sip` still uses "o"). (i) Fog or overlays meant to sit behind
    a back-view actor go in `tz-far`; in the overlay they cut the head. (j) Keep stamps clear of label text.
    (k) A prop in the hand (`rig.foreR`) is counter-rotated for one pose; switching to a pose with another
    forearm angle swings it sideways — define a custom pose (e.g. `askHold`) that keeps the forearm angle.
    (l) `TOON.look`/`eyesDown` on a back-view actor targets an empty pupil NodeList and logs "GSAP target
    [object NodeList] not found" — skip them for back views. (m) `mix.py` LEVEL lacked the synth beds
    (night, traffic, crowd, family, office, room, laugh, cackle) → `KeyError` in `make.sh sfx`; levels added.
    (n) The white logo bug vanished on cream/paper backgrounds — added a soft dark glow to `.tz-logo`.
    (o) Heredocs containing `${` are blocked by the shell guard — write scene files with the Write tool.
35. **Skill sync after My Boring Life** (2026-10-30): scene helpers grown in the project (`kit.js`) never
    reached the template, so the next project would have rebuilt them; the template still had two logo bugs
    after the user asked for one channel name. Now `templates/film/assets/lib/kit.js` ships (project cast
    removed, `sip` uses the `round` mouth, `eyesDown` skips back views), `TOON.look` skips back views, the
    template has one bottom-right logo with a glow, `.tz-actor.kid`, all 19 background presets, and the synth
    beds live in `paper-vox-short/templates/audio`. Rule: at the end of each project, diff `film/assets/lib`,
    `tools`, `audio`, `index.html` against the templates and port anything generic.
36. **Studio export at 4K failed** (My Boring Life, 2026-10-30): the Renders panel at 4K 60 fps with 3 workers
    stores every frame on disk first (~2.8 MB per 4K frame → ~85 GB for 497 s) and aborted with
    "Disk capture may need … MB" on a disk with 80 GB free. With more than one worker HyperFrames defaults to
    disk capture (`explainStreamingEncodeGate` → `multi_worker`). Fix: `make.sh` renders with
    `HF_DE_PARALLEL_STREAM=true`, so every worker streams frames into the encoder and nothing is stored, at any
    worker count or resolution. Deliver from `./make.sh final`, not the Studio Renders panel (it has no such
    switch). Verified: 497 s film at 1080p60, 2 workers, 34.5 min, free disk unchanged. Check `df -h /` first.

## the art of debate (2026-10-30)
- `TOON.pop` on an SVG `<g>` scales about (0,0), so the prop flies in from the top-left. Use `K.pop(el, t, {origin: "x ypx"})` (svgOrigin).
- A `y` tween and a `K.pop` svgOrigin tween on the same `<g>` fight: the prop landed ~280 px low. Nest two groups: the outer one for `y`, the inner one for the pop.
- SFX kinds `boing` and `spark` do not exist; use `whoosh` (low gain) or `pop`, or the `cartoon-boing` stinger.
- `TOON.amb` `lp` is in Hz (e.g. 1200), not a 0–1 amount.
- A prop centred above the middle actor covers their head; place it between two actors and move the watcher aside.
- `kinetic` counts each letter as a word for `line_unread`: start a title at the shot start, not on its spoken word.
- Parallel scene agents: a `pgrep -f 'hyperframes snapshot'` wait loop matches the other agents' waiting shells
  (their command line holds the same text) and deadlocks. Wait on `pgrep -f '^node .*hyperframes (render|snapshot|check)'`.
- Two `fromTo` on the same property of one element: the later one renders immediately at build time and
  overrides the earlier start state (a mountain showed before its rise). Nest a group or pass `immediateRender: false`.
- `svgOrigin` inside a transformed group is in that group's local coordinates.
- Art helpers used more than once need an id parameter, or ids duplicate.
- Overlays outside `.tz-cam` do not follow parallax: check on stills that arrows/pointers still reach props inside the cam.
- Two arguing actors: keep their left positions ≥ 580 px apart, or a pointing arm crosses the other's torso.
  Unflipped `point` aims right; an actor on the right side points with `pointL`.
- Dropped/fallen props: dy 900–1150 to leave the frame fully (glow radius + parallax zoom), or they linger at the bottom.
- Infographic props (pendulum, dial labels) over a busy room bg need a paper panel/pill behind them; dial labels at ≥ R+210.
- `K.pop` on an `<svg>` root does nothing: pop an inner `<g>`.
- A bottom pill (top ≈ 890) collides with `shrug` hands: place it mid-frame between heads.
- Pop a bubble ≈ 0.1 s before its keyword; a late pop leaves an empty-looking frame.
- Hush pose: `{armL:0, foreL:0, armR:100, foreR:105, head:-4}` (hand over mouth).
- `K.PILL` height is fixed at 88 px: space labels around it. `K.STEAM` does not follow a cup during `K.sip`: place it at rest.
- A stamp over bubble text kills readability: put it beside the text. A pointing pose reaches ≈ 250 px past the actor: keep pills out.
- A kinetic title can wrap to two lines: leave ≥ 120 px before a pill under it.
- `snapshot --at` always adds a frame at the film end; ignore it.
- `meeting` bg: wall clock at top right (x1780–1880, y90–180) and chair backs cover the board below y400:
  keep overlays left of x1760 / below y190 and board content at y ≤ 400.
- `S.at(word)` takes the first match in the whole section: common words (that, can, more, sure, people, this) need `nth`.
- Hair "long" reads female on a period man: use "side" under a hat. Keep a speaker's bubbles near the speaker.
- `hyperframes lint` rewrites files (adds data-hf-id): Read again before Edit.
- Mix went to a constant full-scale tone from a laugh one-shot on: `uniform_filter1d` of squares can dip below 0,
  `np.sqrt` gave NaN, the clip's gain became NaN and the limiter turned it into DC for the rest of the film.
  mix.py now clamps before sqrt, falls back when no active part, zeroes non-finite layers and asserts a finite mix.
  After `sfx`, scan the mix per second (no 1 s RMS above −8 dBFS) before calling the audio done.

- **Render looks paler than the preview (the art of debate).** The encode is correct: decoded as bt709 tv-range, the frame matches the Chrome still (same saturation, ~2 levels apart). The shift is in playback: QuickTime/macOS colour-manages a `transfer=bt709` file with the camera curve, so it shows lighter and washed out next to Chrome's sRGB. Fix: `make.sh render()` calls `srgb_tag`, a lossless remux (`-c copy`, frames bit-identical) that sets the H.264 VUI (`h264_metadata=transfer_characteristics=13`) and the MP4 `colr` atom (`-color_trc iec61966-2-1`) to sRGB. Check with `ffprobe ... color_transfer` and the `colrnclx` bytes `0001 000d 0001`.

## Vertical Shorts (teleport, 2026-10-31)
- Defect: the template was hard-wired to 1920×1080 (hosts, index root, `.tz-bg`, burst viewBox and centre, whip
  bars, enter/exit offsets, `panOf`). Fix: `FORMAT` in BRIEF → `build_film --format`, `TOON.stage()` reads the
  root size, vertical CSS under `body[data-format="vertical"]`, `bake_bg` sizes from the viewBox.
- Captions belong in one global composition, not per scene, so they never cut with the shots.
- The bottom-right channel bug sits under the Shorts like/comment buttons; vertical moves it top-right.
- GSAP on an SVG `<g transform="translate(x y)">` replaces that transform (the badge or prop jumps to 0,0). Put the
  translate on an outer `<g>` and animate an inner `<g id>`; pop it with `origin: "0px 0px"`. WORLD.NO does this now.
- The rig ends at the waist (flat cut at the bottom of the 600×920 box). In wide/medium vertical shots keep the actor's
  box bottom at or below the frame edge (e.g. `bottom: -60px`), or hide the cut behind a near prop.
- Karaoke captions: white words with only a soft shadow vanish on white coats, sky and sand (check flags
  contrast). `.tz-cap` now has a dark `-webkit-text-stroke` with `paint-order: stroke fill`; the vertical logo a
  lighter one. The word un-highlight now starts no earlier than 0.09 s after its highlight (gsap_tween_tail).

## Hidden FX flash at scene start (teleport, 2026-10-31)
- Defect: light rings meant to appear only during the booth charge showed from the first frame of the shot.
- Cause: `tl.fromTo(el, { opacity: 0.9 }, …, laterTime)` renders its from-state immediately, so scrubbing anywhere
  before `laterTime` shows the element at 0.9.
- Fix: `tl.set(el, { opacity: 0 }, 0)` plus `immediateRender: false` on any fromTo whose from-state is visible and
  starts after the shot begins.

## Showing a waist-up rig enter a doorway (teleport, 2026-10-31)
- The rig has no legs, so "steps into the booth" is staged as: OTS back view walking toward the open doors (box bottom
  off-frame, scaled toward the door point), cut to the front of the booth where the actor sits in a div clipped to
  the door rect (`clip-path: inset(...)` from the art's door rect) and the doors are drawn in a layer above him.
  Split the booth art so doors can be drawn separately (`booth(..., { doors: false })` + `doors(...)`).

## Characters need legs (teleport, 2026-10-31)
- The user wants full-body characters; waist-up cut-outs read as fake when someone walks or steps through a door.
  The rig now draws legs, shoes and a shadow below the 920 viewBox (sole y 1392) and `K.walk` swings them; the idle
  sway pivots at the feet so they stay planted. The doorway trick above is still useful for occlusion, but clip only
  the sides/top of the door rect (inset bottom 0) so the legs show on the threshold.

## Voice too fast (teleport, 2026-10-31)
TEMPO 0.95 (~199 wpm) still read as rushed. Template default is now TEMPO=0.88 (~185 wpm); re-run `voice` + `align`, scenes re-time from words.json.

## K.pop / svgOrigin on a group with its own transform attribute (teleport, 2026-10-31)
- Defect: `<g id=x transform="translate(...)">` popped with `origin: "Xpx Ypx"` lost its translate and jumped to the top-left corner.
- Fix: give the tweened id to an outer `<g>` without a transform and put the translate on an inner `<g>`. Never tween an element that carries its own `transform` attribute.

## SVG attr tween on an element without that attribute (teleport, 2026-10-31)
- Defect: `tl.to(circle, { attr: { cx, cy } })` on a `<circle>` created without `cx`/`cy` threw
  `<circle> attribute cx: Unexpected end of attribute` on every seek (`check` console_error).
- Fix: give every attr-tweened shape its start attributes in markup, and chain with `fromTo` (explicit start,
  `immediateRender: false`) instead of `to`.

## Labels shorter than the read floor at shot ends (teleport, 2026-10-31)
- Defect: overlays popped on the last word of a line (`S.at("atoms")`) sat on screen < 1 s before the cut.
- Fix: clamp the pop time so the label gets 0.5 s + 0.3 s/word before the next cut:
  `Math.min(S.at(word), S.cut(n) - floor)`, or key it to an earlier word of the same phrase (`S.at("same", 2)`).
- White text over a light wall: give HUD labels (progress bars) their own dark plate.

## Vertical captions covered the picture (teleport, 2026-10-31)
- Defect: karaoke captions at 82 px, top 1250 px sat over the mid-frame action (hands, faces, props).
- Fix (toon.css `.tz-caps`/`.tz-cap`): 66 px, top 1430 px, height 200 px, 11 px stroke. Keeps them just above the
  Shorts bottom UI zone (last 380 px) and clear of the action band.

## Film-wide grade layer (2026-11-01, "Nobody Ever Asks Married People Why")
- Defect: every frame washed with a pink/peach haze. Two causes. (1) `fromTo` defaults to
  `immediateRender: true`, so the fade-OUT tween of every chapter tint applied its `from` opacity at build
  time and all five tints stacked at once. (2) `mix-blend-mode` (soft-light, saturation) on the tint layers
  blends only within the scene hosts' stacking context, so it fell back to a flat overlay.
- Fix: `tl.set(".tz-tint", {opacity: 0}, 0)` then `fromTo(..., {immediateRender: false})` for every tint
  tween; normal-blend tints at low opacity (warm 0.06, others 0.10–0.12), no desat layer, keep the vignette.
  Rule: any overlay driven by several `fromTo` tweens on one target needs `immediateRender: false`.

## Vocal fry treated with EQ/pitch made the voice fatiguing (2026-11-01, "Nobody Ever Asks Married People Why")
- Defect: the English TTS read had vocal fry (creaky, burp-like pulses at 30–60 Hz at phrase ends). It was
  "fixed" with PITCH +1.2 st, LOW_TRIM −4 and WARMTH −1. The fry stayed, and the voice turned bright and thin
  (2–5 kHz presence p90 +5.3 dB vs +2.5, body −4 dB), which gave the listener a headache.
- Fix: `audio/defry.py`, run by `make.sh voice` before `master.py` (`DEFRY` in BRIEF.md). Praat detects fry:
  low-floor cc pitch < 0.62× the modal median, or modal-unvoiced with low pulses, or jitter > 4 %. Each span
  ≥ 25 ms is re-voiced by pulse-train PSOLA at a contour joined to the neighbouring modal F0, sub-F0 rumble is
  high-passed and 12 ms crossfades are applied. Praat's own overlap-add can't do it, because it treats pulses
  slower than 50 Hz as unvoiced and copies fry unchanged.
  On this voice, fry spans ≥ 25 ms dropped 87 % (spans ≥ 40 ms 96 %), repaired spans hit the target F0
  (43 → 94 Hz), 40–80 Hz rumble fell 3.6 dB in those spans, no added brightness, 0 samples changed outside them.
- Rule: froggy/throaty = check for fry first, then repair it; keep PITCH/LOW_TRIM/WARMTH for taste only.

## Voice master muffled the voice; defry resynthesised fricatives into hiss (married-why, 2026-11-01)
- Defect: per-stage listening showed master.py at WARMTH 1 much worse than the raw voice (5-12 kHz cut ~15 dB,
  three post-dynamics EQ passes stacked); defry was inaudible as a benefit and raised sibilance p95 +6 -> +19 dB
  because "s"/breath frames (modal tracker unvoiced, low tracker finds "pulses") were flagged as fry and PSOLA'd.
- Fix: WARMTH 0 = transparent corrective master (neutral LTASS target, every cut bounded to 4 dB, one pass,
  light de-harsh, 1.5:1 compressor, no post-dynamics EQ), now the default. defry.py gates fry frames to voiced
  frames (energy < 1 kHz more than 6 dB over 3 kHz+). Sibilance unchanged by defry now.
- Process: every voice stage gets a 15 s matched-loudness clip (out/ab/steps*) and must beat the original by ear
  before it touches the film. In-voice grain from a TTS vocoder is not background noise: denoisers/gates do
  nothing for it; use the Resemble Enhance step (paper-vox-short ENHANCE).

## Premium TTS: the original read beat every processing chain (married-why, 2026-11-01)
- Defect: nine versions (defry, corrective/dark master, low cut, Resemble Enhance at two strengths, soft top)
  all sounded worse than the raw voice to the user; only declick + loudness kept the read.
- Fix: `MASTER=light` (default) = `audio/light_master.py`: soxr 48 kHz, ffmpeg adeclick, static gain, TP limiter,
  no EQ/compressor/de-ess. `DEFRY=0` and `PITCH=0` by default (rubberband adds artifacts on TTS); tempo uses atempo.
  `MASTER=full` keeps the old master.py chain for raw recordings that need it.
- Process: start from the original; add one stage at a time only if the user prefers it by ear on a 15 s clip.

## Gemini TTS crackle and vocal fry: targeted repair, not filters (married-why, 2026-11-01)
- Defect: the user heard crackle ("lách tách") and a heavy, froggy throat (vocal fry, worst on phrase ends like
  "the world") in a Gemini TTS voice. Twelve chains (EQ masters, low cut, ffmpeg adeclick, Resemble Enhance,
  dynamic EQ, de-ess, room tone) each sounded worse than the original.
- Audit (do this first): Gemini outputs 24 kHz natively (not a bad export). Spectrogram + event counts found
  ~84 broadband vocoder clicks per minute at word edges, short static bursts after words (a known Gemini bug),
  and F0 dropping under 80 Hz on ~9 % of voiced frames; no background noise, no drift, normal brightness.
- A hand-written pulse-train PSOLA over many fry regions smeared the formants ("lụp bụp, vỡ"). Pop and wobble
  metrics missed it; the spectrogram showed it. Check a spectrogram before sending any resynthesised clip.
- Praat's overlap-add copies pulse gaps over 20 ms unchanged, so deep fry survived until the pulses were refilled
  at 12.5 ms or less. Creak under 60 Hz cannot be re-pitched cleanly; turn it down 14 dB instead.
- Fix: `defry.py` (wide reach, Praat repair, deep tails softened) → `declick.py` (high band only, 8 ms per click)
  → `light_master.py` (loudness only). The user approved this as clip 14 (fry share 14.8 % → 3.3 %).

- **SVG group lands far off-centre after a `fromTo` with `svgOrigin` + `y`/`scale`/`rotation` (married-why Korea map).**
  GSAP's smoothOrigin compensates for the from-state transform and leaves a permanent `xOffset/yOffset`
  (here +363, −555 px); nesting groups alone does not fix it. Fix: pass `smoothOrigin: false` in both the from
  and to vars. Clean pattern: a static `<g transform="translate(px py)">` pivot wrapper, then the tweened group
  with `svgOrigin: "0 0", smoothOrigin: false`, then `<g transform="translate(-px -py)">`. Use one tweened group
  per transform role (drop, squash, slide, wobble).

## Walks faced the camera; staging ignored the action (married-why, 2026-11-02)
- Defect: 13 walking shots slid actors sideways while they faced the lens; a wheelchair was pushed from the front,
  sacks floated over heads, a box sat above the chest.
- Fix: depth walk (`references/rig.md`): back-view actor in a mover div receding to a vanishing point, front view
  when approaching, opacity swap for a turn; loads on shoulders/back; pushers behind. Check one still per walk.

## Comic SFX broke touching scenes; canned laughs read as cringe (married-why, 2026-11-02)
- Defect: pops, slaps and stamps on emotional lines played like a sitcom; laugh cues sounded cringe.
- Fix: `mix.py` tone policy with `SFX_LIGHT=` (light scenes listed, all others tender): tender scenes drop comic
  kinds (28 cues) and soften pop/stamp to paper (136 cues); light scenes keep them one step softer. Laugh cues and
  beds removed from every scene; the skill no longer offers them.

## Silence before the first word (married-why, 2026-11-02)
- Defect: the opening sat at −54 dB until the voice began; the first track also had ~1 s of leading silence.
- Fix: the first music phase covers the intro and starts at `"start": 1.15` (silencedetect); second 0 now −36 dB.

## Loudness on request (married-why, 2026-11-02)
- The user asked for the whole film a bit louder for easier listening: `LOUDNESS=-17` (was −20), still gain + TP
  limiter only; `mix.py --loudness` now takes the BRIEF value instead of a fixed target.

## check: overlaps and short holds from texture text (married-why, 2026-11-02)
- Defect: 20 findings; content_overlap on numbers of tiles receding in depth, line_unread on year/value tickers,
  sub-28 px on panel labels, short stat pills that popped on the key word, a red seal on a mauve wall (1.18:1).
- Fix: `data-layout-ignore` on texture/ticker text, labels sized for their scaled panel (38 → 44 px), pills pop
  0.5–0.8 s earlier (on the lead-in word), seal darkened. The letter-split title card is a false positive
  (`check` counts each letter as a word).
