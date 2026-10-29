# Store assets (Apple App Store, Google Play)

Check the current official pages before each job; the sizes below were verified in 2026-10:
- Apple: <https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications>, app previews, and the "creative assets" best practices (header and search videos).
- Google Play: <https://support.google.com/googleplay/android-developer/answer/9866151>.

## Apple
| Asset | Sizes (px) | Notes |
|---|---|---|
| iPhone screenshots | 1206×2622 / 2622×1206, 1179×2556 / 2556×1179 | real captures in an Apple bezel |
| iPhone app preview | 886×1920 / 1920×886 | 15–30 s |
| iPhone Duo screenshots | 1398×2034 / 2034×1398 (folded outer), 2007×2853 / 2853×2007 (inner) | the folded outer screen reads best |
| iPad screenshots | 2064×2752 / 2752×2064, 2048×2732 / 2732×2048 | landscape if the app's home is designed for it |
| iPad app preview | 1200×1600 / 1600×1200 | |
| Header (creative) | 5244×2950 or 3840×1646 | video 5–30 s plus a static image |
| Search result card | 5244×2950, 3840×2560, 1920×1280 | must show the device with real app animation, text on one side; keep the subject inside the safe band |
- Every video is 60 fps CFR, within the duration limits, with a static thumbnail.

## Google Play
| Asset | Spec |
|---|---|
| Phone screenshots | 2–8, 16:9 or 9:16, 320–3840 px per side, ≤ 8 MB, PNG/JPEG |
| 7" and 10" tablet screenshots | same limits |
| Feature graphic | 1024×500 |
- Use only real device frames (Android Studio device-art resources). Never invent a frame.

## Device frames
- Apple: Apple Design Resources bezels (iPhone 17, iPad Pro M5, iPhone Duo), downloaded as DMGs. Licensing: don't vendor them into public repos.
- Android: Android Studio `plugins/android/resources/device-art-resources/`.

## Board rules (screenshots, header, search card)
- Study real listings of the category first (screenshots of top apps), then the user's references.
- Layout:
  - one device, whole, at ≈ .78–.80 of the board height
  - equal measured gaps
  - one popped-out real feature output
  - the background shows pale prints of real output (not dark, not removed)
- Headline:
  - short, on one line, the brand's font
  - one accent word
  - readable at thumbnail size
- Vary the background glow or position per screen within one palette. Never repeat the same photo on adjacent screens.
- Show different features on each screen. Don't repeat the camera view (this also applies to landing pages).
- A layout fix found on one board goes into the shared layout for every board.
- Localize when asked (JA, KO, VI, ES…). Ask once which Spanish market (e.g. Mexico).
- Landing pages: convert images to WebP; text is never faded.
- Deliver the full set only after 1–2 samples are approved.
