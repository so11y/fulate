import { Intersection, Point } from "@fulate/util";
import type { Edge } from "@fulate/util";
import { Shape } from "@fulate/core";

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

  getEdgeSegment(edge: Edge): { start: Point; end: Point } {
    const w = this.width || 0, h = this.height || 0;
    switch (edge) {
      case "left":   return { start: new Point(w / 2, 0), end: new Point(0, h) };
      case "right":  return { start: new Point(w / 2, 0), end: new Point(w, h) };
      case "bottom": return { start: new Point(0, h),     end: new Point(w, h) };
      case "top":    return { start: new Point(w / 2, 0), end: new Point(w / 2, 0) };
    }
  }

  hasPointHint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  getAnchorSchema() {
    const fromSuper = super.getAnchorSchema();
    if (fromSuper?.length) return fromSuper;
    return [
      { id: "left",   localPosition: (el: any) => el.getEdgePosition("left", 0.5).pos },
      { id: "right",  localPosition: (el: any) => el.getEdgePosition("right", 0.5).pos },
      { id: "bottom", localPosition: (el: any) => el.getEdgePosition("bottom", 0.5).pos },
    ];
  }
}
