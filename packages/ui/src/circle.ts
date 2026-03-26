import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { ShapeOption, Shape, AnchorPoint } from "@fulate/core";

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

  getAnchorSchema(): AnchorPoint[] {
    return [
      { id: "top", localPosition: (el) => new Point(el.width / 2, el.height / 2 - Math.min(el.width, el.height) / 2) },
      { id: "right", localPosition: (el) => new Point(el.width / 2 + Math.min(el.width, el.height) / 2, el.height / 2) },
      { id: "bottom", localPosition: (el) => new Point(el.width / 2, el.height / 2 + Math.min(el.width, el.height) / 2) },
      { id: "left", localPosition: (el) => new Point(el.width / 2 - Math.min(el.width, el.height) / 2, el.height / 2) }
    ];
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
