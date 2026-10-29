declare module 'troika-three-text' {
  import { Color, Material, Mesh } from 'three';
  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    anchorX: number | 'left' | 'center' | 'right' | string;
    anchorY: number | 'top' | 'top-baseline' | 'top-cap' | 'top-ex' | 'middle' | 'bottom-baseline' | 'bottom' | string;
    letterSpacing: number;
    lineHeight: number | 'normal';
    maxWidth: number;
    textAlign: 'left' | 'right' | 'center' | 'justify';
    whiteSpace: 'normal' | 'nowrap';
    color: string | number | Color | null;
    fillOpacity: number;
    outlineWidth: number | string;
    outlineColor: string | number | Color;
    sdfGlyphSize: number | null;
    material: Material;
    textRenderInfo: { blockBounds: [number, number, number, number]; visibleBounds: [number, number, number, number] } | null;
    sync(cb?: () => void): void;
    dispose(): void;
  }
  export function preloadFont(opts: { font?: string; characters?: string | string[]; sdfGlyphSize?: number }, cb: () => void): void;
  export function configureTextBuilder(cfg: { useWorker?: boolean; sdfGlyphSize?: number; defaultFontURL?: string }): void;
}
