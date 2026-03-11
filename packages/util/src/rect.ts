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

export interface RectPoint
  extends Omit<RectWithCenter, "centerX" | "centerY"> {}

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
