// Minimal typing for the parts of opentype.js used by the logo studio.
declare module "opentype.js" {
  export type PathCommand = { type: string; x?: number; y?: number; x1?: number; y1?: number; x2?: number; y2?: number };
  export interface Path {
    commands: PathCommand[];
    toPathData(decimalPlaces?: number): string;
    getBoundingBox(): { x1: number; y1: number; x2: number; y2: number };
  }
  export interface Glyph {
    index: number;
    advanceWidth?: number;
    unicode?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }
  export interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    hasChar(c: string): boolean;
    charToGlyphIndex(c: string): number;
    charToGlyph(c: string): Glyph;
    getKerningValue(left: Glyph, right: Glyph): number;
  }
  export function parse(buffer: ArrayBuffer): Font;
  const opentype: { parse: typeof parse };
  export default opentype;
}
