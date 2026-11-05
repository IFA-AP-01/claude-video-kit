# Kurz-look lessons

From the 2026-11-05 lab (`video maker/_kurz-lab`: pilot + teleport chunk).

- **Flat read as dull.** First teleport pass used two-tone flat fills on dark indigo; the user said
  the real style is more vivid, more detailed and semi-3D. Rule: saturated mid-tone backgrounds,
  volume shading on every form, secondary detail on every prop (STYLE-BIBLE revision).
- **Over-boost goes pastel.** Background boost at light ×1.95 washed the centre out; ×1.72 with
  sat ×1.5 is the approved level. Adjust such dials one step at a time.
- **Specular on huge bodies.** `shaded()` places a specular ellipse; on a planet bigger than the
  frame it lands as a giant white blob. Use `spec:false` for planets/ground masses.
- **Clouds on continents.** Cloud blobs at continent positions read as white spots on land. Use thin
  elongated streaks on separate rows, scrolling faster than the continents (parallax).
- **Seeking audio.** `python -m http.server` has no Range support, so `<audio src>` cannot seek.
  Load audio via `fetch → blob → URL.createObjectURL`.
- **Stale kit.js.** Chrome cached the old kit and threw "x is not defined". Load kit with a
  `Date.now()` cache-buster (`document.write`). Console errors may be stale from an earlier URL;
  judge on a fresh load.
- **Negative modulo.** `arr[(a-b)%n]` is undefined for negatives and blanks the whole frame;
  use `((x%n)+n)%n`.
- **Caption spacing.** Inline-block word spans need `margin:0 17px` at 66 px or words glue together.
- **Intentional wash-out.** A shot whose story is "body turns to energy" fades the character on
  purpose; do not "fix" it as a contrast bug.
