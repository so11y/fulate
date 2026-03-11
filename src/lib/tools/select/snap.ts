import { PointType } from "../../../util/point";
import { BoundingBox, makeBoundsFromPoints } from "../../../util/rect";
import { BaseElementOption, Element } from "../../node/element";
import { Node } from "../../node/node";
import { getElementAnchorPoints } from "../../ui/line";
import { checkElement } from "./checkElement";

interface SnapLine {
  type: "vertical" | "horizontal";
  value: number;
  start: number;
  end: number;
  distanceText?: string;
  points: PointType[];
  textPos?: PointType;
}

interface SnapResult {
  dx: number;
  dy: number;
}

interface ClosestMatch {
  diff: number;
  targetVal: number;
  matchedIndex: number;
  segments: { min: number; max: number }[];
}

// ─── Pure helpers ────────────────────────────────────────────

function isAxisAlignedRect(pts: PointType[]): boolean {
  return (
    pts.length === 4 &&
    Math.abs(pts[0].x - pts[3].x) < 0.01 &&
    Math.abs(pts[1].x - pts[2].x) < 0.01 &&
    Math.abs(pts[0].y - pts[1].y) < 0.01 &&
    Math.abs(pts[3].y - pts[2].y) < 0.01
  );
}

function addEdgeMidpoints(pts: PointType[]): PointType[] {
  const result = [...pts];
  if (pts.length === 4) {
    const [p0, p1, p2, p3] = pts;
    result.push(
      { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 },
      { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 },
      { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 }
    );
  }
  return result;
}

function collectSnapData(
  snapPoints: PointType[],
  xData: number[],
  yData: number[]
) {
  if (isAxisAlignedRect(snapPoints)) {
    const { minX, minY, maxX, maxY } = makeBoundsFromPoints(snapPoints);
    xData.push(minX, minY, maxY, maxX, minY, maxY);
    yData.push(minY, minX, maxX, maxY, minX, maxX);
  } else {
    const points = addEdgeMidpoints(snapPoints);
    const xGroups = new Map<number, { min: number; max: number }>();
    const yGroups = new Map<number, { min: number; max: number }>();
    const eps = 0.5;

    for (const p of points) {
      let xKey: number | undefined;
      for (const k of xGroups.keys()) {
        if (Math.abs(k - p.x) < eps) {
          xKey = k;
          break;
        }
      }
      if (xKey !== undefined) {
        const g = xGroups.get(xKey)!;
        g.min = Math.min(g.min, p.y);
        g.max = Math.max(g.max, p.y);
      } else {
        xGroups.set(p.x, { min: p.y, max: p.y });
      }

      let yKey: number | undefined;
      for (const k of yGroups.keys()) {
        if (Math.abs(k - p.y) < eps) {
          yKey = k;
          break;
        }
      }
      if (yKey !== undefined) {
        const g = yGroups.get(yKey)!;
        g.min = Math.min(g.min, p.x);
        g.max = Math.max(g.max, p.x);
      } else {
        yGroups.set(p.y, { min: p.x, max: p.x });
      }
    }

    for (const [x, r] of xGroups) xData.push(x, r.min, r.max);
    for (const [y, r] of yGroups) yData.push(y, r.min, r.max);
  }
}

function buildAxisSnapLines(
  best: ClosestMatch,
  movingRange: { min: number; max: number },
  type: "vertical" | "horizontal"
): SnapLine[] {
  const lines: SnapLine[] = [];
  const val = best.targetVal;
  const isVert = type === "vertical";

  const allRanges: { min: number; max: number; isMoving: boolean }[] = [
    { ...movingRange, isMoving: true }
  ];
  for (const seg of best.segments) {
    allRanges.push({
      min: seg.min,
      max: seg.max ?? seg.min,
      isMoving: false
    });
  }
  allRanges.sort((a, b) => a.min - b.min);

  const mkPt = (along: number): PointType =>
    isVert ? { x: val, y: along } : { x: along, y: val };
  const mkTextPos = (mid: number): PointType =>
    isVert ? { x: val + 5, y: mid } : { x: mid, y: val - 5 };

  for (const range of allRanges) {
    if (range.isMoving) continue;
    const dist = range.max - range.min;
    if (dist > 1) {
      lines.push({
        type,
        value: val,
        start: range.min,
        end: range.max,
        points: [mkPt(range.min), mkPt(range.max)],
        distanceText: `${Math.round(dist)}`,
        textPos: mkTextPos((range.min + range.max) / 2)
      });
    }
  }

  for (let i = 0; i < allRanges.length - 1; i++) {
    const curr = allRanges[i];
    const next = allRanges[i + 1];
    if (curr.max < next.min) {
      const distance = next.min - curr.max;
      if (distance > 0) {
        lines.push({
          type,
          value: val,
          start: curr.max,
          end: next.min,
          points: [mkPt(curr.max), mkPt(next.min)],
          distanceText: `${Math.round(distance)}`,
          textPos: mkTextPos((curr.max + next.min) / 2)
        });
      }
    }
  }

  return lines;
}

// ─── Snap class ──────────────────────────────────────────────

export class Snap extends Element {
  type = "snap";
  key = "snap";

  threshold = 5;
  lineColor = "#ff00cc";
  lineWidth = 1;
  dashPattern = [4, 4];

  selectctbale = false;

  isActive = false;
  private snapLines: SnapLine[] = [];

  private cacheX: Float32Array = new Float32Array(0);
  private cacheY: Float32Array = new Float32Array(0);

  get targetElement(): Node {
    return this.root.keyElmenet.get("workspace") ?? this.root;
  }

  private forEachSnapTarget(
    excludes: Element[],
    callback: (el: Element) => void
  ) {
    const processed = new Set<Element>();

    this.root.searchArea(this.root.getViewportRect(), ({ element }) => {
      const resolved = checkElement(element, excludes);
      if (!resolved || processed.has(resolved)) return;
      processed.add(resolved);
      callback(resolved);
    });
  }

  start(
    excludeEls: Element[],
    excludePoints?: { element: Element; indices: number[] }[]
  ) {
    if (!this.root) return;
    this.isActive = true;
    this.snapLines = [];

    const xData: number[] = [];
    const yData: number[] = [];
    const partialExcludes = new Map<Element, Set<number>>();
    if (excludePoints) {
      for (const ep of excludePoints) {
        partialExcludes.set(ep.element, new Set(ep.indices));
      }
    }

    this.forEachSnapTarget(excludeEls, (node) => {
      let snapPoints = node.getSnapPoints();
      if (!snapPoints || snapPoints.length === 0) return;

      const skipIndices = partialExcludes.get(node);
      if (skipIndices) {
        snapPoints = snapPoints.filter((_, i) => !skipIndices.has(i));
      }
      if (!snapPoints || snapPoints.length === 0) return;

      collectSnapData(snapPoints, xData, yData);
    });

    this.cacheX = new Float32Array(xData);
    this.cacheY = new Float32Array(yData);
  }

  detect(
    originalPoints: PointType[],
    dx_raw: number,
    dy_raw: number
  ): SnapResult {
    if (!this.isActive) return { dx: 0, dy: 0 };
    this.snapLines = [];

    const axisAligned = isAxisAlignedRect(originalPoints);
    let targetX: { val: number; index: number }[];
    let targetY: { val: number; index: number }[];
    let pointsToSnap: PointType[] = [];
    let bounds: BoundingBox | null = null;

    if (axisAligned) {
      bounds = makeBoundsFromPoints(originalPoints);
      const { minX, minY, maxX, maxY } = bounds;

      targetX = [
        { val: minX + dx_raw, index: 0 },
        { val: maxX + dx_raw, index: 1 }
      ];
      targetY = [
        { val: minY + dy_raw, index: 0 },
        { val: maxY + dy_raw, index: 1 }
      ];
    } else {
      pointsToSnap = addEdgeMidpoints(originalPoints);
      targetX = pointsToSnap.map((p, i) => ({ val: p.x + dx_raw, index: i }));
      targetY = pointsToSnap.map((p, i) => ({ val: p.y + dy_raw, index: i }));
    }

    const threshold = this.threshold / this.root.viewport.scale;
    const bestX = this.findClosest(targetX, this.cacheX, threshold);
    const bestY = this.findClosest(targetY, this.cacheY, threshold);

    const dx_snap = bestX ? bestX.diff : 0;
    const dy_snap = bestY ? bestY.diff : 0;
    const final_dx = dx_raw + dx_snap;
    const final_dy = dy_raw + dy_snap;

    if (bestX) {
      const range = this.computeMovingRange(
        axisAligned,
        bounds,
        pointsToSnap,
        bestX,
        final_dx,
        final_dy,
        "x"
      );
      this.snapLines.push(...buildAxisSnapLines(bestX, range, "vertical"));
    }
    if (bestY) {
      const range = this.computeMovingRange(
        axisAligned,
        bounds,
        pointsToSnap,
        bestY,
        final_dx,
        final_dy,
        "y"
      );
      this.snapLines.push(...buildAxisSnapLines(bestY, range, "horizontal"));
    }

    this.layer.requestRender();
    return { dx: dx_snap, dy: dy_snap };
  }

  private computeMovingRange(
    axisAligned: boolean,
    bounds: BoundingBox | null,
    pointsToSnap: PointType[],
    best: ClosestMatch,
    final_dx: number,
    final_dy: number,
    axis: "x" | "y"
  ): { min: number; max: number } {
    if (axisAligned && bounds) {
      return axis === "x"
        ? { min: bounds.minY + final_dy, max: bounds.maxY + final_dy }
        : { min: bounds.minX + final_dx, max: bounds.maxX + final_dx };
    }

    const snapVal = best.targetVal;
    if (axis === "x") {
      const ys = pointsToSnap
        .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
        .filter((p) => Math.abs(p.x - snapVal) < 0.0001)
        .map((p) => p.y);
      if (ys.length === 0) {
        ys.push(pointsToSnap[best.matchedIndex].y + final_dy);
      }
      return { min: Math.min(...ys), max: Math.max(...ys) };
    } else {
      const xs = pointsToSnap
        .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
        .filter((p) => Math.abs(p.y - snapVal) < 0.0001)
        .map((p) => p.x);
      if (xs.length === 0) {
        xs.push(pointsToSnap[best.matchedIndex].x + final_dx);
      }
      return { min: Math.min(...xs), max: Math.max(...xs) };
    }
  }

  private findClosest(
    targets: { val: number; index: number }[],
    cache: Float32Array,
    threshold: number
  ): ClosestMatch | null {
    let minDiff = Infinity;
    let best: ClosestMatch | null = null;

    for (let i = 0; i < cache.length; i += 3) {
      const refVal = cache[i];
      const refMin = cache[i + 1];
      const refMax = cache[i + 2];

      for (const t of targets) {
        const diff = refVal - t.val;
        const absDiff = Math.abs(diff);

        if (absDiff < threshold) {
          if (absDiff < minDiff - 0.0001) {
            minDiff = absDiff;
            best = {
              diff,
              targetVal: refVal,
              matchedIndex: t.index,
              segments: [{ min: refMin, max: refMax }]
            };
          } else if (absDiff <= minDiff + 0.0001 && best) {
            if (Math.abs(best.targetVal - refVal) < 0.0001) {
              best.segments.push({ min: refMin, max: refMax });
            }
          }
        }
      }
    }
    return best;
  }

  stop() {
    this.isActive = false;
    this.snapLines = [];
    this.anchorHighlights = [];
    this.layer.requestRender();
  }

  private anchorHighlights: Array<{
    x: number;
    y: number;
    matched: boolean;
  }> = [];

  detectAnchorSnap(
    worldX: number,
    worldY: number,
    excludeEls: Element[] = []
  ): { x: number; y: number; elementId: string; anchorType: string } | null {
    const threshold = 10 / this.root.viewport.scale;
    const threshold2 = threshold * threshold;
    let best: {
      x: number;
      y: number;
      elementId: string;
      anchorType: string;
    } | null = null;
    let bestDist = threshold2;

    this.anchorHighlights = [];

    this.forEachSnapTarget(excludeEls, (node) => {
      let anchors: { type: string; x: number; y: number }[];
      if (node.type === "line") {
        const pts = (node as any).getSnapPoints?.() ?? [];
        anchors = pts.map((p: { x: number; y: number }, i: number) => ({
          type: `p${i}`,
          x: p.x,
          y: p.y
        }));
      } else {
        anchors = getElementAnchorPoints(node);
      }

      for (const a of anchors) {
        const dx = a.x - worldX;
        const dy = a.y - worldY;
        const d2 = dx * dx + dy * dy;

        this.anchorHighlights.push({ x: a.x, y: a.y, matched: false });

        if (d2 < bestDist) {
          bestDist = d2;
          best = {
            x: a.x,
            y: a.y,
            elementId: node.id,
            anchorType: a.type
          };
        }
      }
    });

    if (best) {
      for (const h of this.anchorHighlights) {
        if (Math.abs(h.x - best.x) < 0.1 && Math.abs(h.y - best.y) < 0.1) {
          h.matched = true;
        }
      }
    }

    this.layer.requestRender();
    return best;
  }

  paint() {
    if (
      (!this.isActive || this.snapLines.length === 0) &&
      this.anchorHighlights.length === 0
    )
      return;

    const ctx = this.layer.ctx;
    const scale = this.root.viewport.scale;

    ctx.save();

    this.root.applyViewPointTransform(ctx);

    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = this.lineColor;
    ctx.fillStyle = this.lineColor;
    ctx.font = `${12 / scale}px Arial`;

    for (const line of this.snapLines) {
      ctx.setLineDash([4 / scale, 4 / scale]);
      ctx.beginPath();
      if (line.type === "vertical") {
        ctx.moveTo(line.value, line.start);
        ctx.lineTo(line.value, line.end);
      } else {
        ctx.moveTo(line.start, line.value);
        ctx.lineTo(line.end, line.value);
      }
      ctx.stroke();

      ctx.setLineDash([]);
      const size = 3 / scale;
      for (const p of line.points) {
        ctx.beginPath();
        ctx.moveTo(p.x - size, p.y - size);
        ctx.lineTo(p.x + size, p.y + size);
        ctx.moveTo(p.x + size, p.y - size);
        ctx.lineTo(p.x - size, p.y + size);
        ctx.stroke();
      }

      if (line.distanceText && line.textPos) {
        ctx.textAlign = line.type === "vertical" ? "left" : "center";
        ctx.fillText(line.distanceText, line.textPos.x, line.textPos.y);
      }
    }

    if (this.anchorHighlights.length > 0) {
      for (const h of this.anchorHighlights) {
        if (h.matched) {
          ctx.strokeStyle = "#4F81FF";
          ctx.lineWidth = 2 / scale;
          ctx.fillStyle = "rgba(79, 129, 255, 0.2)";
          ctx.beginPath();
          ctx.arc(h.x, h.y, 6 / scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(79, 129, 255, 0.4)";
          ctx.beginPath();
          ctx.arc(h.x, h.y, 3 / scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  hasInView(): boolean {
    return true;
  }
}
