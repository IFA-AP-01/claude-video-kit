# Style DNA — Infographics-Show-style explainer

Observed in frames sampled 0:05–16:50 of "The AI bubble is about to pop…" (The Infographics Show,
https://www.youtube.com/watch?v=MgngwkPAuqQ). Rules, not a copy: no channel logo, no their characters.

## Look
- Flat 2D vector with **no outlines**. Shapes separate by tone only: one fill, one shade crescent on the
  side away from the light, one small highlight. Limbs are one continuous tapered capsule (shoulder →
  elbow → hand), never parts joined by ink lines.
- Muted pastel colours: every hex passes through `mute()` (≈16 % desaturation toward luminance). Settings
  in muted blue-grey or warm beige; accents orange, yellow, red, green slightly greyed.
- Texture: mottled walls, light pools under lamps, contact shadows under furniture, a fine film grain
  over the whole frame (`grain.soft.png`, soft-light, 0.32).
- Characters: big head (~45 % of height), dot-and-ellipse eyes with white highlight, blush circles,
  simple torso in a suit, lab coat, hi-vis vest or casual top; hands are circles.
- Backgrounds and props are illustrations, not geometry: organic silhouettes (`blob`, tapered leaves,
  sculpted furniture), each form = base fill + one clipped shade plane (`#1a1020`, 0.15–0.25) + one
  highlight strip, a soft contact shadow under every object, glows for every light source, a vignette
  over every room. Build them from `tools/art/` (see "Backgrounds" below), never from bare rects and
  circles.
- Type: one heavy rounded sans with Vietnamese glyphs (Nunito 800/900), uppercase for titles, pills,
  name cards and pins; sentence case in bubbles.

## Overlays (all in `toon.css` / `toon.js`)
| Overlay | Look | When |
|---|---|---|
| Kinetic title | white 150 px caps on the blue `studio` card, letters drop in one by one with rotation | the hook, a topic change |
| Stat pill | white capsule, black 104 px caps, drop shadow | every spoken number/date/money figure |
| Speech bubble | white, no border, 44 px radius, soft drop shadow, white tail to the speaker | a quote or the character's reaction |
| Name card | white card bottom-left, blue round icon, small blue role line + big name | first appearance of a person/place/company |
| Location pin | white tag top-left, red pin icon, caps | a place is named |
| Line chart / bars | drawn on a `.tz-board` whiteboard, line draws itself, dot pops at the end | trends, comparisons |
| Logo bug | channel name, one bug bottom-right, all film long (soft dark glow so it reads on cream) | always |

## Rhythm
- Hard cut on every sentence or two: shots 2–4 s. No crossfades.
- Every shot moves with depth: `TOON.parallax(tl, shot, t0, t1, { dx, from, to, origin })` zooms
  `.tz-cam` 1.03 → 1.08 and slides three layers: `.tz-far` (background, 0.3 × dx), `.tz-mid` (actors,
  1 ×), `.tz-near` (blurred foreground prop, 1.8 ×). dx 50–90 px, alternate direction between shots.
- Depth of field: the background behind actors is the baked `<bg>.soft.png` (blur 3), actors are sharp,
  a foreground prop (`fg_plant`, `fg_lamp`, blur 9) crosses a corner in about one shot in three.
- The speaker always talks (lip-sync), breathes and blinks; pose changes land on key words
  (point at the overlay, shrug on doubt, hands up on excitement, think on a question).
- Overlays land 0.1–0.3 s before their word; a pop/stamp/whoosh on each entrance.
- Every reading line holds 0.5 s + 0.3 s per word.

## Safe areas (1920×1080)
- Keep text inside 96 px margins; bottom 120 px reserved for the logo bug and name cards.
- Characters stand on the bottom edge (`.tz-actor` bottom −70 px), left ~300 or right ~1060–1180.
- Bubble above the speaker's head, tail toward the mouth (`data-tail="right"` for a speaker on the right).

## Backgrounds (`tools/art/`)
- `kit.mjs`: primitives (`P R C E L G poly`), `svg()` (mutes every hex), `glow`, `shadow`, `fillLin`,
  `clip`, `vignette`, `rrect`, `blob`, `scallopLine`, `form`, `tone(hex, ±k)` (lighten / darken).
- `props.mjs`: home and night-town props (windows, curtains, shelves, beds, lamps, plants, trees,
  town houses, street lamps, fences, cats, wall art, fairy lights, coat rack…).
- `props_work.mjs`: work, city, industry and lab props (day window with blinds, monitor, desk, chair,
  whiteboard, server rack, cable tray, perspective floor, shop building, car, bench, traffic light,
  truss, industrial lamp, machine, crate, barrel, conveyor, flask, beaker, test tubes, microscope, lab
  bench, sofa, door, floor lamp, day cloud).
- `presets.mjs`: `BG.<name>()` → full SVG. Rooms: office, server, street, factory, lab, studio,
  apartment, bedroom, night_town, desk_night, hallway. Mid layers (`mid_*`, sharp, not baked):
  mid_desk, mid_door_close, mid_doorframe, mid_house (static, from `art/static/house.py`).
  Foreground (`fg_*`, blur 9): fg_plant, fg_lamp, fg_branch. `grain`.
- New scene background: add a `BG.<name>` in `presets.mjs` from kit + props (new props go in the props
  files, reusable), `node tools/draw_bg_art.mjs film/assets/bg <name>`, `./make.sh bake`, check a tile
  with `node tools/shot.mjs out/x.png film/assets/bg/<name>.svg`.
- Leave the middle third below y≈400 clear of tall props: actors stand there.

