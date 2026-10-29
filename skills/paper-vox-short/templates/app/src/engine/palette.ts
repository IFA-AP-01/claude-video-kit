// "Paper Vox" palette and fonts (see TREATMENT.md). One flat beat colour per story beat.
export const C = {
  paper: '#F2EADB',     // warm paper (strips, clippings base)
  ink: '#1A1A1A',
  white: '#FBF8F0',     // cut-out border / torn-edge core
  newsprint: '#EAE1CC',
  tape: '#EFE6CB',
  shadow: '#24180F',    // drop shadows: warm, never pure black
  muted: '#6B6559',
  // beat colours
  red: '#E8372C',
  blue: '#2F5BEA',
  yellow: '#F2C230',
  teal: '#1E9E8F',
  orange: '#F07A2A',
  green: '#2E6B3F',
} as const;

export type Hex = string;

/** CSS families (from @fontsource, see fonts.ts). All carry full Vietnamese diacritics. */
export const CFONT = {
  head: '"Anton"',            // big cut-out headlines (400 only)
  cap: '"Be Vietnam Pro"',    // captions (800)
  serif: '"Noto Serif"',      // newspaper body (400) / headlines (700)
  mono: '"IBM Plex Mono"',    // data labels (500, 700)
} as const;
