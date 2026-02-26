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

import { Element } from "../../node/element";

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

  threshold = 8;
  lineColor = "#ff00cc";
  lineWidth = 1;
  dashPattern = [4, 4];

  private isActive = false;
  private snapLines: SnapLine[] = [];

  private cacheX: Float32Array = new Float32Array(0);
  private cacheY: Float32Array = new Float32Array(0);

  start(excludeEls: Element[]) {
    if (!this.root) return;
    this.isActive = true;
    this.snapLines = [];

    const xData: number[] = [];
    const yData: number[] = [];
    const excludes = new Set(excludeEls);

    const traverse = (nodes: Element[]) => {
      for (const node of nodes) {
        if (excludes.has(node) || node === this) continue;

        const coords = node.getCoords();
        for (const p of coords) {
          xData.push(p.x, p.y, p.y);
          yData.push(p.y, p.x, p.x);
        }
      }
    };
    if (this.root.children) traverse(this.root.children);

    this.cacheX = new Float32Array(xData);
    this.cacheY = new Float32Array(yData);
  }

  /**
   * @param predictedPoints 拖动物体在预测位置的
   */
  detect(originalPoints: Point[], dx_raw: number, dy_raw: number): SnapResult {
    if (!this.isActive) return { dx: 0, dy: 0 };
    this.snapLines = [];

    const predictedPoints = originalPoints.map((p) => ({
      x: p.x + dx_raw,
      y: p.y + dy_raw
    }));

    const targetX = predictedPoints.map((p, i) => ({ val: p.x, index: i }));
    const targetY = predictedPoints.map((p, i) => ({ val: p.y, index: i }));

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

      // 取出当前对象在吸附线上的真实 Y 轴范围
      const movingYs = originalPoints
        .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
        .filter((p) => Math.abs(p.x - snapX) < 0.0001)
        .map((p) => p.y);

      if (movingYs.length === 0) {
        movingYs.push(originalPoints[bestX.matchedIndex].y + final_dy);
      }

      const objMinY = Math.min(...movingYs);
      const objMaxY = Math.max(...movingYs);

      let minDistance = Infinity;
      let bestP1 = objMinY;
      let bestP2 = objMinY;

      // 核心算法：计算两条一维线段[objMin, objMax] 与 [refMin, refMax] 之间的最短距离
      for (const seg of bestX.segments) {
        const refMinY = seg.min;
        const refMaxY = seg.max !== undefined ? seg.max : seg.min;

        let p1, p2, dist;
        if (objMaxY < refMinY) {
          p1 = objMaxY;
          p2 = refMinY;
          dist = refMinY - objMaxY;
        } else if (refMaxY < objMinY) {
          p1 = objMinY;
          p2 = refMaxY;
          dist = objMinY - refMaxY;
        } else {
          // 发生重叠
          p1 = Math.max(objMinY, refMinY);
          p2 = Math.min(objMaxY, refMaxY);
          dist = 0;
        }

        if (dist < minDistance) {
          minDistance = dist;
          bestP1 = p1;
          bestP2 = p2;
        }
      }

      const distance = Math.round(minDistance);
      let start, end, points;

      if (distance > 0) {
        start = Math.min(bestP1, bestP2);
        end = Math.max(bestP1, bestP2);
        points = [
          { x: snapX, y: start },
          { x: snapX, y: end }
        ];
      } else {
        let minAll = objMinY;
        let maxAll = objMaxY;
        for (const seg of bestX.segments) {
          minAll = Math.min(minAll, seg.min);
          maxAll = Math.max(maxAll, seg.max !== undefined ? seg.max : seg.min);
        }
        start = minAll;
        end = maxAll;
        points = [
          { x: snapX, y: start },
          { x: snapX, y: end }
        ];
      }

      this.snapLines.push({
        type: "vertical",
        value: snapX,
        start: start,
        end: end,
        points: points,
        distanceText: distance > 0 ? `${distance}` : undefined,
        textPos: { x: snapX + 5, y: (start + end) / 2 }
      });
    }

    // ================= 水平吸附 (Y) =================
    if (bestY) {
      const snapY = bestY.targetVal;

      const movingXs = originalPoints
        .map((p) => ({ x: p.x + final_dx, y: p.y + final_dy }))
        .filter((p) => Math.abs(p.y - snapY) < 0.0001)
        .map((p) => p.x);

      if (movingXs.length === 0) {
        movingXs.push(originalPoints[bestY.matchedIndex].x + final_dx);
      }

      const objMinX = Math.min(...movingXs);
      const objMaxX = Math.max(...movingXs);

      let minDistance = Infinity;
      let bestP1 = objMinX;
      let bestP2 = objMinX;

      for (const seg of bestY.segments) {
        const refMinX = seg.min;
        const refMaxX = seg.max !== undefined ? seg.max : seg.min;

        let p1, p2, dist;
        if (objMaxX < refMinX) {
          p1 = objMaxX;
          p2 = refMinX;
          dist = refMinX - objMaxX;
        } else if (refMaxX < objMinX) {
          p1 = objMinX;
          p2 = refMaxX;
          dist = objMinX - refMaxX;
        } else {
          // 发生重叠
          p1 = Math.max(objMinX, refMinX);
          p2 = Math.min(objMaxX, refMaxX);
          dist = 0;
        }

        if (dist < minDistance) {
          minDistance = dist;
          bestP1 = p1;
          bestP2 = p2;
        }
      }

      const distance = Math.round(minDistance);
      let start, end, points;

      if (distance > 0) {
        start = Math.min(bestP1, bestP2);
        end = Math.max(bestP1, bestP2);
        points = [
          { x: start, y: snapY },
          { x: end, y: snapY }
        ];
      } else {
        // 当距离为 0 (有重叠边界对齐)时，延伸对齐线覆盖两者范围
        let minAll = objMinX;
        let maxAll = objMaxX;
        for (const seg of bestY.segments) {
          minAll = Math.min(minAll, seg.min);
          maxAll = Math.max(maxAll, seg.max !== undefined ? seg.max : seg.min);
        }
        start = minAll;
        end = maxAll;
        points = [
          { x: start, y: snapY },
          { x: end, y: snapY }
        ];
      }

      this.snapLines.push({
        type: "horizontal",
        value: snapY,
        start: start,
        end: end,
        points: points,
        distanceText: distance > 0 ? `${distance}` : undefined,
        textPos: { x: (start + end) / 2, y: snapY - 5 }
      });
    }

    this.layer.render();
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
    return best;
  }

  stop() {
    this.isActive = false;
    this.snapLines = [];
    this.layer.render();
  }

  render() {
    if (!this.isActive || this.snapLines.length === 0) return;

    const ctx = this.layer.ctx;
    const scale = this.root.viewport.scale;

    ctx.save();
    ctx.setTransform(this.root.getViewPointMtrix());

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
}
