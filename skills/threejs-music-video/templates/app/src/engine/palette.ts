// Project palette and fonts. Placeholders: replace with the project's own (see TREATMENT.md).
// Font files live in public/fonts/ (e.g. copied from @fontsource/<family>/files/*.woff) and
// must be licensed for video (OFL is fine). Every entry is preloaded before `ready`.
export const C = {
  paper: '#F2EFE6',
  ink: '#141414',
  accent: '#E8412C',
  muted: '#6B6A66',
  night: '#0E1116',
  shadow: '#3A2F22',   // SoftShadow default (warm, not black)
} as const;

/** SDF fonts for troika-three-text (3D text). Keys are free; every value is preloaded. */
export const FONT = {
  display: '/fonts/display-800.woff',
  mono: '/fonts/mono-400.woff',
} as const;

/** The same files as CSS faces for 2D-canvas text: [family, url, weight, style?]. */
export const CSS_FACES: [string, string, string, string?][] = [
  ['MV Display', FONT.display, '800'],
  ['MV Mono', FONT.mono, '400'],
];

/** CSS families registered by preloadFonts() for canvas text. */
export const CFONT = { display: '"MV Display"', mono: '"MV Mono"' } as const;
