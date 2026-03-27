import { Intersection, Point, makeBoundingBoxFromPoints } from "@fulate/util";
import { Shape, ShapeOption, AnchorPoint } from "@fulate/core";

export interface PolygonOption extends ShapeOption<Polygon> {
  /** 局部坐标顶点（相对于 left/top，至少 3 个） */
  points?: { x: number; y: number }[];
}

export class Polygon extends Shape {
  type = "polygon";
  points: { x: number; y: number }[] = [];

  constructor(options?: PolygonOption) {
    super(options);
    if (options?.points) {
      this._initPoints(options.points);
    }
  }

  setOptions(options?: PolygonOption, syncCalc = false) {
    if (options?.points) {
      this._initPoints(options.points);
    }
    return super.setOptions(options, syncCalc);
  }

  private _initPoints(pts: { x: number; y: number }[]) {
    this.points = pts.map((p) => ({ x: p.x, y: p.y }));
    if (pts.length < 2) return;
    const { width, height } = makeBoundingBoxFromPoints(pts);
    this.width = width || 1;
    this.height = height || 1;
  }

  applyTransformMatrix(
    targetMatrix: DOMMatrix,
    worldCenter: Point,
    snap?: { width: number; height: number; scaleX: number; scaleY: number }
  ): void {
    const oldW = this.width || 1;
    const oldH = this.height || 1;
    super.applyTransformMatrix(targetMatrix, worldCenter, snap);
    const sx = (this.width || 1) / oldW;
    const sy = (this.height || 1) / oldH;
    if (sx !== 1 || sy !== 1) {
      for (const p of this.points) {
        p.x *= sx;
        p.y *= sy;
      }
    }
  }

  protected buildPath(ctx: CanvasRenderingContext2D) {
    const pts = this.points;
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.closePath();
  }

  protected buildBorderPath(ctx: CanvasRenderingContext2D) {
    this.buildPath(ctx);
  }

  getLocalPoints() {
    return this.points.map((p) => new Point(p.x, p.y));
  }

  getLocalSnapPoints() {
    const pts = this.points;
    const snaps: Point[] = pts.map((p) => new Point(p.x, p.y));
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      snaps.push(new Point((a.x + b.x) / 2, (a.y + b.y) / 2));
    }
    return snaps;
  }

  hasPointHint(point: Point): boolean {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  getAnchorSchema(): AnchorPoint[] {
    return this.points.map((_, i) => {
      const next = (i + 1) % this.points.length;
      return {
        id: `edge_${i}`,
        localPosition: (el: any) => {
          const poly = el as Polygon;
          const a = poly.points[i];
          const b = poly.points[next];
          return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
        }
      };
    });
  }

  toJson(includeChildren = false): PolygonOption {
    const json = super.toJson(includeChildren) as any;
    json.points = this.points.map((p) => ({ x: p.x, y: p.y }));
    return json;
  }
}
