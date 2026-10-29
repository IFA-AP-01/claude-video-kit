# Aesthetic judgment (what "beautiful" means for this user)

## Principles
1. **Reference first.** Study what the user sent before designing: reference apps (Nudges Me), collages, real device photos, Apple/Google sample assets, real store listings, GitHub implementations. The bar is fidelity to the reference, not personal taste.
2. **One focal point.** One device (or subject) plus one popped-out real feature output. Everything else stays quiet: the background is pale and the glow is soft.
3. **Readable at thumbnail size.** Cover the headline: you should still know the feature. Ask "would I download it looking at this?". Passing margin or count checks does not make it good.
4. **Balance.** No big empty black or white areas. The gaps around the device are equal (measure the px). The template or layout fits the photo shape.
5. **Restraint.** No decoration without meaning:
   - no random tilted prints
   - no sine sway
   - no frost
   - no ghost zoom copies over the same component
   - no colour change per screen without reason
   - fewer text specs on header images; Apple's own look is calm and premium
6. **Real over fake.**
   - Device screens are real captures in real device frames (Apple Design Resources bezels, Android Studio device art).
   - Never draw fake UI, fake status bars or fake hands, and never use crossfaded stills where a screen recording belongs.
   - Only a popped-out element may be HTML-drawn, with the real fonts and photos.
7. **Adjust by degree.** "Too strong" means one step softer, not off. "Missing" means back to the last approved level. See `TROUBLESHOOTING.md` §3.
8. **Consistency across a set or film.** Keep material, palette and font. Don't swing between style extremes from scene to scene.

## Type
- iOS assets use SF:
  - Headline weight 600 on one line, tracking 0, one accent word in the brand colour.
  - Subline regular.
  - Never negative tracking, bold-heavy or faded text.
- Motion graphics may mix one serif with one sans.
- Web/landing pages: Instrument Sans reads better than Inter. Text is never faded.
- Use contrast, not drop shadows, to separate text from the image.

## Colour and texture
- Backgrounds have texture: 3–4 soft tones, fine grain or paper, never flat.
- Match the brand. Darker backgrounds when the brand is dark (Saveo).
- Example palette (MetaCam):
  - slate/charcoal with a warm amber glow that moves per screen
  - never pink, copper, rose or muddy brown
- Never use the generic blue→purple "aurora" gradient.
- Retro-but-modern with paper texture works for explainers.
- A raw 3D engine look is never acceptable. Add a texture or toon layer.

## Photos inside assets
- Choose photos that are artistic and striking: golden-hour backlight, bokeh, light and shadow, simple compositions.
- Prefer objects, food, architecture, landscapes, vehicles and animals.
- Never:
  - people in revealing clothing
  - smoking, alcohol, or suggestive content
  - generic stock or busy black-and-white street scenes
  - the same photo on adjacent screens
- Shortlist candidates on a contact sheet. Credit stock photographers exactly (Pexels name).
- The crop fills the frame height while the width matches the screen; judge each layout by eye.

## Motion
- Every move has a purpose: entrance, reveal, slow orbit, push-in, close. Ease in and out. No aimless drift or jitter.
- Prefer one-shot camera moves and pans over cuts. Use fewer shakes.
- Transitions hide inside motion or blur. Never pop on a still screen.
- Use motion blur on fast moves.
- Zoom modestly (×1.6, not ×2). Don't crowd the device.
- Real-device behaviour (example: iPhone Duo):
  - Project the UI on the screens.
  - Only the moving leaf blurs, from the hinge out to the edge.
  - Dark UI stays dark.
  - A 24° lens keeps the proportions true.
- 3D text lives in space:
  - mild tilt
  - thin borders
  - cute, soft materials
  - no blocky characters
  - no overlapping objects

## Sound
- Sound sits under the picture. Build the music bed to the exact film length.
- SFX are short, soft, low-mid and decisive. Whooshes are quiet and smooth, ≲1.6 kHz, ~1–1.3 s.
- SFX must still be audible: check the mix level. "Too quiet" happened before.
- Voice-over is clean studio quality: enhance it first, splice out glitches, keep the music low under the voice.
