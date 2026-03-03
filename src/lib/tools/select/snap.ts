/**
 * TODO
 * 后面修改为worker，使用Float32Array
 * 在element得append中添加事件触发给root，然后snap中监听事件
 * 在更新中添加事件触发到root，然后snap接受事件，
 * 将坐标提供给rbush，rbush中直接操作canvas进行绘制线条然后返回吸附结果
 * 提供给rbush查找附件500px，根据缩放进行调整。
 *
 * TODO
 * 后面得脏矩形局部渲染也可以使用类似的方式
 */

import { BaseElementOption, Element } from "../../node/element";

interface Point {
  x: number;
  y: number;
}

interface SnapLine {
  type: "vertical" | "horizontal";
  value: number; // 线的绝对位置
  start: number; // 线的视觉起点
  end: number; // 线的视觉终点
  distanceText?: string; // 距离文字
  points: Point[]; // 画 'X' 的位置
  textPos?: Point; // 文字绘制位置
}

interface SnapResult {
  dx: number;
  dy: number;
}

export class Snap extends Element {
  type = "snap";
  key = "snap";

  threshold = 5;
  lineColor = "#ff00cc";
  lineWidth = 1;
  dashPattern = [4, 4];

  silent = true;

  private isActive = false;
  private snapLines: SnapLine[] = [];

  private cacheX: Float32Array = new Float32Array(0);
  private cacheY: Float32Array = new Float32Array(0);

  private get selectTool() {
    return this.root.keyElmenet.get("select") as import("./index").Select;
  }

  start(excludeEls: Element[]) {
    if (!this.root) return;
    this.isActive = true;
    this.snapLines = [];

    const xData: number[] = [];
    const yData: number[] = [];
    const excludes = new Set(excludeEls);

    this.selectTool.forEachTarget((node) => {
      if (excludes.has(node)) return;
      const snapPoints = node.getSnapPoints();
      if (!snapPoints || snapPoints.length === 0) return;

      const isAxisAligned = snapPoints.length === 4 &&
        Math.abs(snapPoints[0].x - snapPoints[3].x) < 0.01 &&
        Math.abs(snapPoints[1].x - snapPoints[2].x) < 0.01 &&
        Math.abs(snapPoints[0].y - snapPoints[1].y) < 0.01 &&
        Math.abs(snapPoints[3].y - snapPoints[2].y) < 0.01;

      if (isAxisAligned) {
        const minX = Math.min(
          snapPoints[0].x,
          snapPoints[1].x,
          snapPoints[2].x,
          snapPoints[3].x
        );
        const maxX = Math.max(
          snapPoints[0].x,
          snapPoints[1].x,
          snapPoints[2].x,
          snapPoints[3].x
        );
        const minY = Math.min(
          snapPoints[0].y,
          snapPoints[1].y,
          snapPoints[2].y,
          snapPoints[3].y
        );
        const maxY = Math.max(
          snapPoints[0].y,
          snapPoints[1].y,
          snapPoints[2].y,
          snapPoints[3].y
        );
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // Vertical lines (Left, Right, CenterX)
        // Store as range [minY, maxY]
        xData.push(minX, minY, maxY);
        xData.push(maxX, minY, maxY);
        xData.push(centerX, minY, maxY);

        // Horizontal lines (Top, Bottom, CenterY)
        // Store as range [minX, maxX]
        yData.push(minY, minX, maxX);
        yData.push(maxY, minX, maxX);
        yData.push(centerY, minX, maxX);
      } else {
        // Not axis aligned, store points individually
        const points: { x: number; y: number }[] = [...snapPoints];
        if (snapPoints.length === 4) {
          const [p0, p1, p2, p3] = snapPoints;
          points.push(
            { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, // Top
            { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, // Right
            { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 }, // Bottom
            { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 }, // Left
            { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 } // Center
          );
        }

        for (const p of points) {
          xData.push(p.x, p.y, p.y);
          yData.push(p.y, p.x, p.x);
        }
      }
    });

    this.cacheX = new Float32Array(xData);
    this.cacheY = new Float32Array(yData);
  }

  /**
   * @param predictedPoints 拖动物体在预测位置的
   */
  detect(originalPoints: Point[], dx_raw: number, dy_raw: number): SnapResult {
    if (!this.isActive) return { dx: 0, dy: 0 };
    this.snapLines = [];

    // Determine if moving object is axis aligned
    let isAxisAligned = false;
    if (originalPoints.length === 4) {
      isAxisAligned =
        Math.abs(originalPoints[0].x - originalPoints[3].x) < 0.01 &&
        Math.abs(originalPoints[1].x - originalPoints[2].x) < 0.01 &&
        Math.abs(originalPoints[0].y - originalPoints[1].y) < 0.01 &&
        Math.abs(originalPoints[3].y - originalPoints[2].y) < 0.01;
    }

    let targetX: { val: number; index: number; min?: number; max?: number }[] =
      [];
    let targetY: { val: number; index: number; min?: number; max?: number }[] =
      [];
    let pointsToSnap: Point[] = [];

    if (isAxisAligned) {
      const minX = Math.min(...originalPoints.map((p) => p.x));
      const maxX = Math.max(...originalPoints.map((p) => p.x));
      const minY = Math.min(...originalPoints.map((p) => p.y));
      const maxY = Math.max(...originalPoints.map((p) => p.y));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      // Predicted positions
      const pMinX = minX + dx_raw;
      const pMaxX = maxX + dx_raw;
      const pCenterX = centerX + dx_raw;
      const pMinY = minY + dy_raw;
      const pMaxY = maxY + dy_raw;
      const pCenterY = centerY + dy_raw;

      // We use index to identify which part of the object matched
      // 0: Left, 1: Right, 2: CenterX
      targetX = [
        { val: pMinX, index: 0, min: pMinY, max: pMaxY },
        { val: pMaxX, index: 1, min: pMinY, max: pMaxY },
        { val: pCenterX, index: 2, min: pMinY, max: pMaxY }
      ];

      // 0: Top, 1: Bottom, 2: CenterY
      targetY = [
        { val: pMinY, index: 0, min: pMinX, max: pMaxX },
        { val: pMaxY, index: 1, min: pMinX, max: pMaxX },
        { val: pCenterY, index: 2, min: pMinX, max: pMaxX }
      ];
    } else {
      pointsToSnap = [...originalPoints];
      if (originalPoints.length === 4) {
        const [p0, p1, p2, p3] = originalPoints;
        pointsToSnap.push(
          { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, // Top
          { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, // Right
          { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 }, // Bottom
          { x: (p3.x + p0.x) / 2, y: (p3.y + p0.y) / 2 }, // Left
          { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 } // Center
        );
      }

      const predictedPoints = pointsToSnap.map((p) => ({
        x: p.x + dx_raw,
        y: p.y + dy_raw
      }));

      targetX = predictedPoints.map((p, i) => ({ val: p.x, index: i }));
      targetY = predictedPoints.map((p, i) => ({ val: p.y, index: i }));
    }

    const bestX = this.findClosest(
      targetX,
      this.cacheX,
      this.threshold / this.root.viewport.scale
    );
    const bestY = this.findClosest(
      targetY,
      this.cacheY,
      this.threshold / this.root.viewport.scale
    );

    const dx_snap = bestX ? bestX.diff : 0;
    const dy_snap = bestY ? bestY.diff : 0;

    const final_dx = dx_raw + dx_snap;
    const final_dy = dy_raw + dy_snap;

    // ================= 垂直吸附 (X) =================
    if (bestX) {
      const snapX = bestX.targetVal;
      const allRanges: Array<{ min: number; max: number; isMoving: boolean }> =
        [];

      if (isAxisAligned) {
        // If axis aligned, we know the full range of the moving object side
        // bestX.matchedIndex corresponds to: 0: Left, 1: Right, 2: CenterX
        // In all cases, the Y range is [minY, maxY] + final_dy
        const minY = Math.min(...originalPoints.map((p) => p.y));
        const maxY = Math.max(...originalPoints.map((p) => p.y));
        allRanges.push({
          min: minY + final_dy,
          max: maxY + final_dy,
          isMoving: true
        });
      } else {
        // Fallback to point-based logic
        const movingYs = pointsToSnap
          .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
          .filter((p) => Math.abs(p.x - snapX) < 0.0001)
          .map((p) => p.y);

        if (movingYs.length === 0) {
          movingYs.push(pointsToSnap[bestX.matchedIndex].y + final_dy);
        }

        const objMinY = Math.min(...movingYs);
        const objMaxY = Math.max(...movingYs);
        allRanges.push({ min: objMinY, max: objMaxY, isMoving: true });
      }

      // Add reference objects
      for (const seg of bestX.segments) {
        const refMinY = seg.min;
        const refMaxY = seg.max !== undefined ? seg.max : seg.min;
        allRanges.push({ min: refMinY, max: refMaxY, isMoving: false });
      }

      // Sort and draw gaps
      allRanges.sort((a, b) => a.min - b.min);

      // 绘制物体本身的尺寸
      for (const range of allRanges) {
        if (range.isMoving) continue;
        const dist = range.max - range.min;
        if (dist > 1) {
          this.snapLines.push({
            type: "vertical",
            value: snapX,
            start: range.min,
            end: range.max,
            points: [
              { x: snapX, y: range.min },
              { x: snapX, y: range.max }
            ],
            distanceText: `${Math.round(dist)}`,
            textPos: { x: snapX + 5, y: (range.min + range.max) / 2 }
          });
        }
      }

      // Merge overlapping ranges of the same type (optional, but good for cleanup)
      // For now, just find gaps
      for (let i = 0; i < allRanges.length - 1; i++) {
        const current = allRanges[i];
        const next = allRanges[i + 1];

        // Only draw gap if ranges don't overlap
        if (current.max < next.min) {
          const gapStart = current.max;
          const gapEnd = next.min;
          const distance = gapEnd - gapStart;

          if (distance > 0) {
            this.snapLines.push({
              type: "vertical",
              value: snapX,
              start: gapStart,
              end: gapEnd,
              points: [
                { x: snapX, y: gapStart },
                { x: snapX, y: gapEnd }
              ],
              distanceText: `${Math.round(distance)}`,
              textPos: { x: snapX + 5, y: (gapStart + gapEnd) / 2 }
            });
          }
        }
      }
    }

    // ================= 水平吸附 (Y) =================
    if (bestY) {
      const snapY = bestY.targetVal;
      const allRanges: Array<{ min: number; max: number; isMoving: boolean }> =
        [];

      if (isAxisAligned) {
        // 0: Top, 1: Bottom, 2: CenterY
        // X range is [minX, maxX] + final_dx
        const minX = Math.min(...originalPoints.map((p) => p.x));
        const maxX = Math.max(...originalPoints.map((p) => p.x));
        allRanges.push({
          min: minX + final_dx,
          max: maxX + final_dx,
          isMoving: true
        });
      } else {
        const movingXs = pointsToSnap
          .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
          .filter((p) => Math.abs(p.y - snapY) < 0.0001)
          .map((p) => p.x);

        if (movingXs.length === 0) {
          movingXs.push(pointsToSnap[bestY.matchedIndex].x + final_dx);
        }

        const objMinX = Math.min(...movingXs);
        const objMaxX = Math.max(...movingXs);
        allRanges.push({ min: objMinX, max: objMaxX, isMoving: true });
      }

      for (const seg of bestY.segments) {
        const refMinX = seg.min;
        const refMaxX = seg.max !== undefined ? seg.max : seg.min;
        allRanges.push({ min: refMinX, max: refMaxX, isMoving: false });
      }

      allRanges.sort((a, b) => a.min - b.min);

      // 绘制物体本身的尺寸
      for (const range of allRanges) {
        if (range.isMoving) continue;
        const dist = range.max - range.min;
        if (dist > 1) {
          this.snapLines.push({
            type: "horizontal",
            value: snapY,
            start: range.min,
            end: range.max,
            points: [
              { x: range.min, y: snapY },
              { x: range.max, y: snapY }
            ],
            distanceText: `${Math.round(dist)}`,
            textPos: { x: (range.min + range.max) / 2, y: snapY - 5 }
          });
        }
      }

      for (let i = 0; i < allRanges.length - 1; i++) {
        const current = allRanges[i];
        const next = allRanges[i + 1];

        if (current.max < next.min) {
          const gapStart = current.max;
          const gapEnd = next.min;
          const distance = gapEnd - gapStart;

          if (distance > 0) {
            this.snapLines.push({
              type: "horizontal",
              value: snapY,
              start: gapStart,
              end: gapEnd,
              points: [
                { x: gapStart, y: snapY },
                { x: gapEnd, y: snapY }
              ],
              distanceText: `${Math.round(distance)}`,
              textPos: { x: (gapStart + gapEnd) / 2, y: snapY - 5 }
            });
          }
        }
      }
    }
    this.layer.requestRender();
    return { dx: dx_snap, dy: dy_snap };
  }

  private findClosest(
    targets: { val: number; index: number }[],
    cache: Float32Array,
    threshold: number
  ) {
    let minDiff = Infinity;
    let best = null;

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
              diff: diff,
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
    this.layer.requestRender();
    return best;
  }

  stop() {
    this.isActive = false;
    this.snapLines = [];
    this.layer.requestRender();
  }

  paint() {
    if (!this.isActive || this.snapLines.length === 0) return;

    const ctx = this.layer.ctx;
    const scale = this.root.viewport.scale;

    ctx.save();
    // ctx.setTransform(this.root.getViewPointMtrix());

    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = this.lineColor;
    ctx.fillStyle = this.lineColor;
    ctx.font = `${12 / scale}px Arial`;

    for (const line of this.snapLines) {
      // 1. 画虚线
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

      // 2. 画 X 标记 (仅在端点画)
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

      // 3. 画距离文字
      if (line.distanceText && line.textPos) {
        ctx.textAlign = line.type === "vertical" ? "left" : "center";
        ctx.fillText(line.distanceText, line.textPos.x, line.textPos.y);
      }
    }

    ctx.restore();
  }

  hasInView(): boolean {
    return true;
  }
}
