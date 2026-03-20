import type { RectPoint, Bounds } from "@fulate/util";
import {
  makeBoundingBoxFromRects,
  rectToBounds,
  boundsToRect,
  mergeBounds,
  isValidBounds,
  createEmptyBounds
} from "@fulate/util";

const GRID_COLS = 3;
const GRID_ROWS = 3;
const BUCKET_COUNT = GRID_COLS * GRID_ROWS;

function mergeToBucket(bucket: Bounds, s: Bounds): number {
  const oldW = bucket.right - bucket.left;
  const oldH = bucket.bottom - bucket.top;
  const oldArea = oldW > 0 && oldH > 0 ? oldW * oldH : 0;

  mergeBounds(bucket, s);

  const newW = bucket.right - bucket.left;
  const newH = bucket.bottom - bucket.top;
  return newW * newH - oldArea;
}

function resetBuckets(buckets: Bounds[]) {
  for (const b of buckets) Object.assign(b, createEmptyBounds());
}

export interface DirtyGridResult {
  /** null = 超过阈值，应全量重绘 */
  rects: RectPoint[] | null;
}

/**
 * 自适应网格脏矩形合并。
 *
 * 在世界坐标空间工作：先算出所有脏矩形的总包围盒，
 * 再在包围盒内部做网格划分和合并。
 */
export class DirtyGrid {
  private _buckets: Bounds[] = Array.from(
    { length: BUCKET_COUNT },
    () => createEmptyBounds()
  );

  /**
   * @param visibleArea 当前可见的世界区域面积，用于判断是否全量重绘
   * @param fullRepaintRatio 脏区总面积 / 可见区域面积 超过此阈值时返回 null（建议全量重绘）
   */
  merge(
    dirtyRects: RectPoint[],
    visibleArea: number,
    fullRepaintRatio: number
  ): DirtyGridResult {
    if (dirtyRects.length === 0) return { rects: [] };
    if (dirtyRects.length === 1) {
      const r = dirtyRects[0];
      if (r.width * r.height > visibleArea * fullRepaintRatio)
        return { rects: null };
      return { rects: [r] };
    }

    const bb = makeBoundingBoxFromRects(dirtyRects);
    const bbArea = bb.width * bb.height;
    if (bbArea <= 0) return { rects: [] };

    if (bbArea > visibleArea * fullRepaintRatio) return { rects: null };

    let rawArea = 0;
    for (const r of dirtyRects) rawArea += r.width * r.height;
    if (rawArea > bbArea * 0.8) return { rects: [bb] };

    const cellW = bb.width / GRID_COLS;
    const cellH = bb.height / GRID_ROWS;

    if (cellW <= 0 || cellH <= 0) return { rects: [bb] };

    resetBuckets(this._buckets);
    let totalArea = 0;

    for (const r of dirtyRects) {
      const s = rectToBounds(r);

      const relL = s.left - bb.left;
      const relT = s.top - bb.top;
      const relR = s.right - bb.left;
      const relB = s.bottom - bb.top;

      const c0 = Math.max(0, Math.floor(relL / cellW));
      const c1 = Math.min(GRID_COLS - 1, Math.floor(relR / cellW));
      const r0 = Math.max(0, Math.floor(relT / cellH));
      const r1 = Math.min(GRID_ROWS - 1, Math.floor(relB / cellH));

      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const clipped: Bounds = {
            left: Math.max(s.left, bb.left + col * cellW),
            top: Math.max(s.top, bb.top + row * cellH),
            right: Math.min(s.right, bb.left + (col + 1) * cellW),
            bottom: Math.min(s.bottom, bb.top + (row + 1) * cellH)
          };
          totalArea += mergeToBucket(
            this._buckets[row * GRID_COLS + col],
            clipped
          );
        }
      }

      if (totalArea > bbArea) return { rects: [bb] };
    }

    const result: RectPoint[] = [];
    for (const b of this._buckets) {
      if (isValidBounds(b)) result.push(boundsToRect(b));
    }
    return { rects: result };
  }
}
