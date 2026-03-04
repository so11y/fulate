import { Point } from "../../util/point";
import { Element } from "../node/element";

export class Triangle extends Element {
  type = "triangle";

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

    const w = this.width || 0;
    const h = this.height || 0;

    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    if (this.backgroundColor) {
      ctx.fill();
    }
    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }

  getLocalSnapPoints() {
    return super.getLocalPoints();
  }

  getLocalPoints() {
    const dim = this._getTransformedDimensions();
    return [
      new Point(dim.x / 2, 0),
      new Point(dim.x, dim.y),
      new Point(0, dim.y)
    ];
  }
}
