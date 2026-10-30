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
