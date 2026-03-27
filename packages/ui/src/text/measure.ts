const charWidthCache = new Map<string, Map<string, number>>();
let _lastFont = "";
let _lastFontCache = new Map<string, number>();
let _measureCtx: CanvasRenderingContext2D | null = null;

export function getMeasureContext(): CanvasRenderingContext2D {
  if (_measureCtx) return _measureCtx;
  const canvas = document.createElement("canvas");
  _measureCtx = canvas.getContext("2d")!;
  return _measureCtx;
}

function getFontCache(font: string): Map<string, number> {
  if (font === _lastFont) return _lastFontCache;
  let map = charWidthCache.get(font);
  if (!map) {
    map = new Map();
    charWidthCache.set(font, map);
  }
  _lastFont = font;
  _lastFontCache = map;
  return map;
}

export function preCalculateChars(
  ctx: CanvasRenderingContext2D,
  font: string
) {
  const cache = getFontCache(font);
  if (cache.size > 0) return;
  ctx.font = font;
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:!?-()，。、；：！？（）\u201C\u201D\u2018\u2019";
  for (let i = 0; i < chars.length; i++) {
    cache.set(chars[i], ctx.measureText(chars[i]).width);
  }
}

export function getCharWidth(
  ctx: CanvasRenderingContext2D,
  char: string,
  font: string
): number {
  const cache = getFontCache(font);
  let w = cache.get(char);
  if (w !== undefined) return w;
  ctx.font = font;
  w = ctx.measureText(char).width;
  cache.set(char, w);
  return w;
}

export function measureStringWidth(
  ctx: CanvasRenderingContext2D,
  str: string,
  font: string,
  letterSpacing = 0
): number {
  const cache = getFontCache(font);
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    let w = cache.get(str[i]);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(str[i]).width;
      cache.set(str[i], w);
    }
    width += w;
    if (letterSpacing && i < str.length - 1) {
      width += letterSpacing;
    }
  }
  return width;
}
