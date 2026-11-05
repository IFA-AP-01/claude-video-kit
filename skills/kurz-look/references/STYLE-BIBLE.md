# Kurz-look style bible (vivid semi-3D glow science animation)

Intent: an original visual language with the craft of Kurzgesagt / Star Birds (flat vector, glowing,
deep space, cute geometric creatures) for explainers, films and music videos. We copy the grammar,
never their characters (the birds, the duck, the dog), logos, music or shots.

Sources studied (2026-11-05): kurzgesagt.org hero SVGs (earth, rocket, engine, star glints),
Star Birds reveal trailer (Toukana, 60 s, 1920×1080), frames at 1, 4, 7.4, 9.8, 12.6, 16–58 s.

## 1. Construction (what the SVGs really do)
- Pure flat fills. **No outlines, no SVG blur filters** in their source art. Every soft effect is
  built from stacked translucent shapes and radial gradients.
- Shapes are geometric primitives with big radii: circles, capsules, rounded rects, superellipses.
  No sharp corners except deliberate spikes (crystals, stars).
- Shading is two flat tones per form, never a smooth gradient:
  - **shadow crescent**: same shape offset away from the light, clipped to the form, `multiply`
    or a darker, more saturated, cooler hue (hue shifts toward blue/violet, not toward black).
  - **light cap**: a smaller offset copy toward the light, `screen` or a lighter warmer hue.
  - **rim light**: a thin bright sliver on the edge facing a back light (sun, engine, planet glow).
- Texture = small shape scatter (craters, dots, specks, short dashes), 2–3 sizes, same hue family.
- Glints / stars: a 4-point cross (two thin tapered lines) + a core dot with 3–5 concentric
  translucent rings (white core → hot hue → cool outer). Sizes vary 1:10.

## 2. Colour
- Background space: near-black indigo `#050029` → `#0C0640` → `#1B0F5E` radial, never pure black.
- Per scene: one dominant hue family + one complementary accent (lavender interior + orange
  porthole; blue jungle + magenta character; orange asteroid on navy).
- Saturation high in mid-tones, values stepped. Shadows go cooler and more saturated, never grey.
- Atmospheric perspective: each depth plane further back is lighter, bluer, lower contrast;
  the nearest plane is a dark saturated silhouette (indigo/teal, not black) with one rim light.
- Glow colours: white core → cyan `#17F0FF`/`#9EFAFF` or warm `#FFF4D1`→`#FFCB22`→`#FF5F14`.
- Reference swatches seen in source: `#3FAFE4 #009F79 #2659A5 #D1EAF4` (earth),
  `#3000CC #63CCFF #BC40FF #17F0FF` (rocket), `#FF9500 #CF0075 #367CFF` (stars).

## 3. Characters (original cast only)
- Body = one bean / pear / capsule silhouette that reads at thumbnail size. Head and body merge.
- Eyes = big white disc with a dark pupil disc or "D" crescent; the eye carries all the emotion.
- Limbs = thin noodle tubes with round caps, no joints drawn; hands = mitten or 3 round fingers.
- 2 tones + 1 accent per character, plus a light cap and shadow crescent. Gear (helmet glass,
  backpack) is a translucent ring + one white highlight arc.
- Small: characters occupy 10–25 % of frame height in wide shots; the world is the star.

## 4. Layout and depth
- 5–7 planes: sky/space gradient, far stars, far bodies, mid world, subject, near FG, out-of-focus FG.
- The out-of-focus FG object (CSS blur 8–20 px is allowed only here, at render) frames the shot.
- Clouds: flat bottoms, bubbly tops, one lighter top cap.
- Horizon glow band (yellow-white) between sky gradient and far hills.
- One focal point per shot, usually off-centre on thirds; big negative space of starfield.

## 5. Light effects
- Engine / sun: white core + 2–4 rings of decreasing opacity (0.6, 0.3, 0.15, 0.06), additive.
- Lens flare: a few translucent discs and one thin ring along the line through frame centre.
- Motion trail: tapered streak, white → cyan → transparent, slight blur.
- Planet: body, terminator shadow crescent, atmosphere rim (thin bright stroke-like sliver) and an
  outer halo (3 large rings at low opacity).

## 6. Motion grammar
- Nothing is ever fully still: stars twinkle (seeded), bodies rotate slowly, characters float/bob
  (sine 2–4 s, 4–10 px), particles drift.
- Camera: slow push or drift every shot (scale 1.00→1.06 over the shot), layers parallax by depth.
- Entrances: scale 0 → 1.08 → 1 with back-out (overshoot 1.4–1.7), 0.35–0.6 s, staggered 40–80 ms.
- Exits: quick scale-down with back-in, 0.25 s. Squash & stretch on landings and pops.
- Secondary action: antennae, tails and limbs lag 2–4 frames behind the body (overlap).
- Edits: hard cuts on the beat or word; occasional match cut or morph (circle → planet → eye).
- Text: geometric rounded sans, bold, white on a dark navy pill with a cyan border; pops in with
  overshoot, fades out.
- Timing at 60 fps; ease `power2.inOut` for camera, `back.out` for pops, `sine.inOut` for idles.

## 7. Type
- Geometric sans: Montserrat (site) / Avenir Next / Nunito as fallback; titles bold, tight tracking
  only at very large sizes.

## 8. Checks before showing a frame
- [ ] No outlines anywhere. Separation by value/hue only.
- [ ] Every form has a shadow crescent + light cap; back-lit forms have a rim light.
- [ ] Depth planes stepped in value and hue; FG silhouette not black.
- [ ] Every glow is layered rings, not a single blurred blob.
- [ ] Something moves in every layer; camera drifts.
- [ ] Character is original and reads as a silhouette.

## 9. Borrowed motion patterns (BusyBee3333/animated-explainer-skills, MIT)
Take the motion craft, not the look or runtime (its look is warm sticker + ink drop shadow, and it
plays on setTimeout + screen recording, which cannot give a deterministic 60 fps render).
- **Drop with weight**: CustomBounce `{strength:.58, squash:2.4}`; y tween + paired
  scaleX 1.45 / scaleY .55 squash, origin at the feet.
- **Fuse**: N objects land in a row, then MorphSVG them into the concept they represent.
- **Settle**: CustomWiggle `{wiggles:4, type:'easeOut'}` returns to rest, nothing accumulates.
- **Anticipation**: one pre-move the other way (scale .86 / rotation −6) before every slam.
- **Payoff light**: a screen-blended glow blooms behind the hero object at each scene's peak;
  sync the glow's peak, not its start, to the word.
- **Population as characters**: quantities are small creatures, not dots.
- **Say it = show it**: the named object moves on its word (±0.3 s with our word alignment);
  enumerations reveal with the roll-call; payoffs land with their reasoning.
- **Sequential occupancy**: a zone is vacated (an exit beat) before it is reused; no text on text.
- SVG transforms on wrapper `<g>`s only; fixed pivots via `svgOrigin`; seeded randomness only.


## Revision 2026-11-05: vivid, detailed, semi-3D (overrides "flat two tones")

- Forms read as 2.5D volumes: radial-gradient shading from the light side through the terminator to a
  dark core, plus a thin rim/bounce light opposite the key light and a small specular on glossy parts.
  Kit: `shaded()` (volume), `box3d()` (front + top + side faces), `ao()` (contact shadow).
- Every prop and character gets secondary detail: panel lines, rivets, texture specks, bands,
  small accessories, LEDs. No plain single-shape props.
- Colour: bright saturated mid-tone scenes (blue-violet, magenta, cobalt), never near-black.
  `spaceBg` boosts its palette (HSL sat x1.5, light x1.72); `raw:true` opts out.
- Depth: blurred foreground bokeh per shot (`bokeh()`), contact shadows under grounded objects.
- Large planets: no specular (`spec:false`); clouds are thin streaks, offset from the continents.
- Change by one step at a time; keep the existing composition.
