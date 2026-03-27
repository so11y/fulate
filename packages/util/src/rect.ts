export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RectWithCenter extends Rect {
  centerX?: number;
  centerY?: number;
}

export interface RectPoint extends Rect {}

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function rectToBounds(r: Rect): Bounds {
  return {
    left: r.left,
    top: r.top,
    right: r.left + r.width,
    bottom: r.top + r.height,
  };
}

export function boundsToRect(b: Bounds): RectPoint {
  return {
    left: b.left,
    top: b.top,
    width: b.right - b.left,
    height: b.bottom - b.top,
  };
}

export function mergeBounds(target: Bounds, source: Bounds): void {
  target.left = Math.min(target.left, source.left);
  target.top = Math.min(target.top, source.top);
  target.right = Math.max(target.right, source.right);
  target.bottom = Math.max(target.bottom, source.bottom);
}

export function isValidBounds(b: Bounds): boolean {
  return b.left < Infinity && b.right > b.left && b.bottom > b.top;
}

export function createEmptyBounds(): Bounds {
  return { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
}

export function makeBoundingBoxFromPoints(
  points: { x: number; y: number }[]
): RectWithCenter {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2
  };
}

export class Bound implements RectWithCenter {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;

  constructor(minX = 0, minY = 0, maxX = 0, maxY = 0) {
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }

  get left() { return this.minX; }
  get top() { return this.minY; }
  get width() { return this.maxX - this.minX; }
  get height() { return this.maxY - this.minY; }
  get centerX() { return (this.minX + this.maxX) / 2; }
  get centerY() { return (this.minY + this.maxY) / 2; }

  merge(other: Bound): this {
    this.minX = Math.min(this.minX, other.minX);
    this.minY = Math.min(this.minY, other.minY);
    this.maxX = Math.max(this.maxX, other.maxX);
    this.maxY = Math.max(this.maxY, other.maxY);
    return this;
  }

  copy(): Bound {
    return new Bound(this.minX, this.minY, this.maxX, this.maxY);
  }

  copyFrom(other: Bound): this {
    this.minX = other.minX;
    this.minY = other.minY;
    this.maxX = other.maxX;
    this.maxY = other.maxY;
    return this;
  }

  static fromRect(r: RectWithCenter): Bound {
    return new Bound(r.left, r.top, r.left + r.width, r.top + r.height);
  }

  static fromPoints(points: { x: number; y: number }[]): Bound {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return new Bound(minX, minY, maxX, maxY);
  }

  static EMPTY = new Bound(0, 0, 0, 0);
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function makeBoundsFromPoints(
  points: { x: number; y: number }[]
): BoundingBox {
  const r = makeBoundingBoxFromPoints(points);
  return { minX: r.left, minY: r.top, maxX: r.left + r.width, maxY: r.top + r.height };
}

export function makeBoundingBoxFromRects(rects: Rect[]): RectPoint {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (r.left < minX) minX = r.left;
    if (r.top < minY) minY = r.top;
    if (r.left + r.width > maxX) maxX = r.left + r.width;
    if (r.top + r.height > maxY) maxY = r.top + r.height;
  }
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
