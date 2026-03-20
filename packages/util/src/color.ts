import { colord } from "colord";

function resolve(val: string) {
  return !val || val === "transparent" ? "rgba(0,0,0,0)" : val;
}

export function parseColor(val: string) {
  return colord(resolve(val)).toRgb();
}

export function formatColor(rgba: { r: number; g: number; b: number; a: number }) {
  return colord(rgba).toRgbString();
}

export function blendColor(base: string, overlay: string, ratio: number): string {
  const b = colord(resolve(base)).toRgb();
  const o = colord(resolve(overlay)).toRgb();
  return colord({
    r: b.r * (1 - ratio) + o.r * ratio,
    g: b.g * (1 - ratio) + o.g * ratio,
    b: b.b * (1 - ratio) + o.b * ratio,
    a: b.a * (1 - ratio) + o.a * ratio,
  }).toRgbString();
}

export function colorWithAlpha(color: string, alpha: number): string {
  return colord(resolve(color)).alpha(alpha).toRgbString();
}
