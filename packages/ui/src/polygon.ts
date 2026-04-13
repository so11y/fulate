import { Intersection, Point, makeBoundingBoxFromPoints } from "@fulate/util";
import type { Edge } from "@fulate/util";
import { Shape, ShapeOption } from "@fulate/core";

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

  getEdgeSegment(edge: Edge): { start: Point; end: Point } {
    const pts = this.points;
    if (pts.length < 2) return super.getEdgeSegment(edge);

    const normals: { mx: number; my: number; nx: number; ny: number; idx: number }[] = [];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      let nx = -dy / len;
      let ny = dx / len;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      if (nx * (cx - mx) + ny * (cy - my) > 0) { nx = -nx; ny = -ny; }
      normals.push({ mx, my, nx, ny, idx: i });
    }

    const edgeDirs: Record<Edge, { x: number; y: number }> = {
      top:    { x: 0,  y: -1 },
      bottom: { x: 0,  y: 1 },
      left:   { x: -1, y: 0 },
      right:  { x: 1,  y: 0 },
    };
    const { x: dirX, y: dirY } = edgeDirs[edge];

    let best = normals[0];
    let bestDot = -Infinity;
    for (const n of normals) {
      const dot = n.nx * dirX + n.ny * dirY;
      if (dot > bestDot) { bestDot = dot; best = n; }
    }

    const a = pts[best.idx];
    const b = pts[(best.idx + 1) % pts.length];
    return { start: new Point(a.x, a.y), end: new Point(b.x, b.y) };
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

  getAnchorSchema() {
    const fromSuper = super.getAnchorSchema();
    if (fromSuper?.length) return fromSuper;
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

  toJson(includeChildren = false): ShapeOption<any> {
    const json = super.toJson(includeChildren) as any;
    json.points = this.points.map((p) => ({ x: p.x, y: p.y }));
    return json;
  }
}
