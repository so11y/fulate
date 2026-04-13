import { Intersection, Point } from "@fulate/util";
import type { Edge } from "@fulate/util";
import { ShapeOption, Shape } from "@fulate/core";

export class Circle extends Shape {
  type = "circle";

  constructor(options?: ShapeOption & { radius?: number }) {
    super(options);
    this.radius =
      options?.radius ?? Math.min(this.width ?? 0, this.height ?? 0) / 2;
  }

  protected buildPath(ctx: CanvasRenderingContext2D) {
    const r = Math.min(this.width || 0, this.height || 0) / 2;
    ctx.beginPath();
    ctx.arc(
      (this.width || 0) / 2,
      (this.height || 0) / 2,
      r,
      0,
      Math.PI * 2
    );
  }

  protected buildBorderPath(ctx: CanvasRenderingContext2D) {
    const r = Math.min(this.width || 0, this.height || 0) / 2;
    const half = this.borderWidth / 2;
    const outset = this.getBorderOutset();
    const offset = outset > 0 ? half : -half;
    ctx.beginPath();
    ctx.arc(
      (this.width || 0) / 2,
      (this.height || 0) / 2,
      r + offset,
      0,
      Math.PI * 2
    );
  }

  getEdgePosition(edge: Edge, ratio: number): { pos: Point; nx: number; ny: number } {
    const w = this.width || 0, h = this.height || 0;
    const r = Math.min(w, h) / 2;
    const cx = w / 2, cy = h / 2;

    const startAngles: Record<Edge, number> = {
      top:    -3 * Math.PI / 4,
      right:  -Math.PI / 4,
      bottom: Math.PI / 4,
      left:   3 * Math.PI / 4,
    };
    const startAngle = startAngles[edge];

    const angle = startAngle + (Math.PI / 2) * ratio;
    return {
      pos: new Point(cx + r * Math.cos(angle), cy + r * Math.sin(angle)),
      nx: Math.cos(angle),
      ny: Math.sin(angle)
    };
  }

  hasPointHint(point: Point) {
    const localPoint = this.getGlobalToLocal(point);
    let r = Math.min(this.width || 0, this.height || 0) / 2;
    const expand = this.getBorderOutset();
    if (expand > 0) r += expand;
    const cx = (this.width || 0) / 2;
    const cy = (this.height || 0) / 2;
    return Intersection.isPointInCircle(localPoint, new Point(cx, cy), r);
  }
}
