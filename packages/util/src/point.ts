type XY = {
  x: number;
  y: number;
};

export type TOriginX = "center" | "left" | "right" | number;
export type TOriginY = "center" | "top" | "bottom" | number;

export const createVector = (from: XY, to: XY): Point =>
  new Point(to.x, to.y).subtract(from);

export type PointType = {
  x: number;
  y: number;
};

export class Point extends DOMPoint {
  constructor();
  constructor(x: number, y: number);
  constructor(point?: XY);
  constructor(arg0: number | XY = 0, y = 0) {
    let _x, _y;
    if (typeof arg0 === "object") {
      _x = arg0.x;
      _y = arg0.y;
    } else {
      _x = arg0;
      _y = y;
    }
    super(_x, _y);
  }

  subtract(that: XY) {
    return new Point(this.x - that.x, this.y - that.y);
  }

  eq(that: XY): boolean {
    return this.x === that.x && this.y === that.y;
  }

  min(that: XY): Point {
    return new Point(Math.min(this.x, that.x), Math.min(this.y, that.y));
  }

  max(that: XY): Point {
    return new Point(Math.max(this.x, that.x), Math.max(this.y, that.y));
  }

  divide(that: XY): Point {
    return new Point(this.x / that.x, this.y / that.y);
  }

  setX(x: number) {
    this.x = x;
    return this;
  }

  setY(y: number) {
    this.y = y;
    return this;
  }

  setXY(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }

  applyMatrix(m: DOMMatrix) {
    return transformPoint(m, this, this);
  }

  pointDistance<T extends { x: number; y: number }>(p1: T, threshold: number) {
    const dx = this.x - p1.x;
    const dy = this.y - p1.y;
    return dx * dx + dy * dy <= threshold ** 2;
  }
}

export function transformPoint(
  m: DOMMatrix,
  point: PointType,
  out?: Point
): Point {
  const x = m.a * point.x + m.c * point.y + m.e;
  const y = m.b * point.x + m.d * point.y + m.f;
  if (out) return out.setXY(x, y);
  return new Point(x, y);
}
