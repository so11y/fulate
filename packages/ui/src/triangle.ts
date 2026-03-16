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
    const w = this.width!, h = this.height!;
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
    const w = this.width!, h = this.height!;
    return [
      new Point(w / 2, 0),
      new Point(w, h),
      new Point(0, h)
    ];
  }

  hasPointHint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  getAnchorSchema(): AnchorPoint[] {
    return [
      { id: "left", localPosition: (el) => new Point(el.width * 0.25, el.height * 0.5) },
      { id: "right", localPosition: (el) => new Point(el.width * 0.75, el.height * 0.5) },
      { id: "bottom", localPosition: (el) => new Point(el.width * 0.5, el.height) }
    ];
  }
}
