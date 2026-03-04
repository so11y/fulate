import { Intersection } from "../../util/Intersection";
import { Point } from "../../util/point";
import { Element } from "../node/element";

export class Rectangle extends Element {
  type = "rectangle";

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.notInDitry()) {
      return;
    }
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
