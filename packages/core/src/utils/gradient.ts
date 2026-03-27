export type GradientType = "linear" | "radial";

export interface GradientStop {
  color: string;
  position: number;
}

export interface GradientOption {
  type: GradientType;
  stops: GradientStop[];
  /** Linear: start point (0~1 relative to element size) */
  from?: { x: number; y: number };
  /** Linear: end point */
  to?: { x: number; y: number };
  /** Linear shorthand: angle in degrees (overrides from/to) */
  angle?: number;
  /** Radial: center point (0~1) */
  center?: { x: number; y: number };
  /** Radial: radius (0~1, relative to max(width, height)) */
  radius?: number;
}

export type BackgroundColor = string | GradientOption;

export function isGradient(bg: BackgroundColor): bg is GradientOption {
  return typeof bg === "object" && bg !== null && "type" in bg && "stops" in bg;
}

export function createCanvasGradient(
  ctx: CanvasRenderingContext2D,
  g: GradientOption,
  w: number,
  h: number
): CanvasGradient {
  let grad: CanvasGradient;

  if (g.type === "radial") {
    const cx = (g.center?.x ?? 0.5) * w;
    const cy = (g.center?.y ?? 0.5) * h;
    const r = (g.radius ?? 0.5) * Math.max(w, h);
    grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  } else {
    let fx: number, fy: number, tx: number, ty: number;
    if (g.angle !== undefined) {
      const rad = ((g.angle - 90) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      fx = w * (0.5 - cos * 0.5);
      fy = h * (0.5 - sin * 0.5);
      tx = w * (0.5 + cos * 0.5);
      ty = h * (0.5 + sin * 0.5);
    } else {
      fx = (g.from?.x ?? 0) * w;
      fy = (g.from?.y ?? 0) * h;
      tx = (g.to?.x ?? 1) * w;
      ty = (g.to?.y ?? 0) * h;
    }
    grad = ctx.createLinearGradient(fx, fy, tx, ty);
  }

  for (const stop of g.stops) {
    grad.addColorStop(stop.position, stop.color);
  }
  return grad;
}
