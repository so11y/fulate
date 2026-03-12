import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { Shape } from "@fulate/core";
import { AnchorPoint } from "./line/anchor";

export class Triangle extends Shape {
  type = "triangle";

  protected buildPath(ctx: CanvasRenderingContext2D) {
    const w = this.width || 0;
    const h = this.height || 0;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
  }

  getLocalSnapPoints() {
    const dim = this._getTransformedDimensions();
    const w = dim.x, h = dim.y;
    return [
      new Point(w / 2, 0),
      new Point(w, h),
      new Point(0, h),
      new Point(w * 0.25, h * 0.5),
      new Point(w * 0.75, h * 0.5),
      new Point(w * 0.5, h)
    ];
  }

  getLocalPoints() {
    const dim = this._getTransformedDimensions();
    return [
      new Point(dim.x / 2, 0),
      new Point(dim.x, dim.y),
      new Point(0, dim.y)
    ];
  }

  hasPointHint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  getAnchorSchema(): AnchorPoint[] {
    return [
      { id: "left", localPosition: (_el, dim) => new Point(dim.x * 0.25, dim.y * 0.5) },
      { id: "right", localPosition: (_el, dim) => new Point(dim.x * 0.75, dim.y * 0.5) },
      { id: "bottom", localPosition: (_el, dim) => new Point(dim.x * 0.5, dim.y) }
    ];
  }
}
