import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { BaseElementOption, Element } from "@fulate/core";

export class Circle extends Element {
  type = "circle";

  constructor(options?: BaseElementOption & { radius?: number }) {
    super(options);
    this.radius =
      options?.radius ?? Math.min(this.width ?? 0, this.height ?? 0) / 2;
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    ctx.save();
    ctx.beginPath();
    this.applyTransformToCtx(ctx);

    const w = this.width || 0;
    const h = this.height || 0;
    const cx = w / 2;
    const cy = h / 2;

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }

    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);

    if (this.backgroundColor) {
      ctx.fill();
    }
    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }

  hasPointHint(point: Point) {
    const localPoint = this.getGlobalToLocal(point);
    return Intersection.isPointInCircle(
      localPoint,
      new Point(this.radius, this.radius),
      this.radius
    );
  }
}
