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
): RectPoint {
  let left = 0,
    top = 0,
    width = 0,
    height = 0;
  for (let i = 0, len = points.length; i < len; i++) {
    const { x, y } = points[i];
    if (x > width || !i) width = x;
    if (x < left || !i) left = x;
    if (y > height || !i) height = y;
    if (y < top || !i) top = y;
  }
  return {
    left,
    top,
    width: width - left,
    height: height - top
  };
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
