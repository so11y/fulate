import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { Element } from "@fulate/core";

export class Rectangle extends Element {
  type = "rectangle";

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    ctx.save();
    ctx.beginPath();
    this.applyTransformToCtx(ctx);
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }
    ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
    if (this.backgroundColor) {
      ctx.fill();
    }
    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }

  hasPointHint(point: Point): boolean {
    if (!this.radius) {
      return super.hasPointHint(point);
    }
    const localPoint = this.getGlobalToLocal(point);
    return Intersection.isPointInRoundRect(
      localPoint,
      this.width,
      this.height,
      this.radius
    );
  }
}
