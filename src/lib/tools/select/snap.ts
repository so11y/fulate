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

    // ================= 垂直吸附处理 (显示左右间距) =================
    if (bestX) {
      const snapX = bestX.targetVal;
      const movingYs = originalPoints.map((p) => p.y + final_dy);
      const objMinY = Math.min(...movingYs);
      const objMaxY = Math.max(...movingYs);

      // 分别存储上方和下方的最近邻居
      let neighbors = {
        before: { dist: Infinity, p1: 0, p2: 0 }, // 上方 (Y轴较小方向)
        after: { dist: Infinity, p1: 0, p2: 0 } // 下方 (Y轴较大方向)
      };

      for (const seg of bestX.segments) {
        const refMinY = seg.min;
        const refMaxY = seg.max !== undefined ? seg.max : seg.min;

        if (objMaxY < refMinY) {
          // 参考物在下方
          const d = refMinY - objMaxY;
          if (d < neighbors.after.dist) {
            neighbors.after = { dist: d, p1: objMaxY, p2: refMinY };
          }
        } else if (refMaxY < objMinY) {
          // 参考物在上方
          const d = objMinY - refMaxY;
          if (d < neighbors.before.dist) {
            neighbors.before = { dist: d, p1: objMinY, p2: refMaxY };
          }
        } else {
          // 重叠情况：距离为0，通常画一条穿过两者的全长线
          neighbors.before = {
            dist: 0,
            p1: Math.min(objMinY, refMinY),
            p2: Math.max(objMaxY, refMaxY)
          };
        }
      }

      // 渲染逻辑：如果 before 和 after 都有，都会被 push 进去
      this.processNeighbors(neighbors, snapX, "vertical");
    }

    // ================= 水平吸附处理 (显示上下间距) =================
    if (bestY) {
      const snapY = bestY.targetVal;
      const movingXs = originalPoints.map((p) => p.x + final_dx);
      const objMinX = Math.min(...movingXs);
      const objMaxX = Math.max(...movingXs);

      let neighbors = {
        before: { dist: Infinity, p1: 0, p2: 0 }, // 左侧
        after: { dist: Infinity, p1: 0, p2: 0 } // 右侧
      };

      for (const seg of bestY.segments) {
        const refMinX = seg.min;
        const refMaxX = seg.max !== undefined ? seg.max : seg.min;

        if (objMaxX < refMinX) {
          // 右侧
          const d = refMinX - objMaxX;
          if (d < neighbors.after.dist) {
            neighbors.after = { dist: d, p1: objMaxX, p2: refMinX };
          }
        } else if (refMaxX < objMinX) {
          // 左侧
          const d = objMinX - refMaxX;
          if (d < neighbors.before.dist) {
            neighbors.before = { dist: d, p1: objMinX, p2: refMaxX };
          }
        } else {
          neighbors.before = {
            dist: 0,
            p1: Math.min(objMinX, refMinX),
            p2: Math.max(objMaxX, refMaxX)
          };
        }
      }

      this.processNeighbors(neighbors, snapY, "horizontal");
    }

    this.layer.render();
    return { dx: dx_snap, dy: dy_snap };
  }

  // 辅助方法：将计算好的邻居信息转化为渲染线段
  private processNeighbors(
    neighbors: any,
    axisVal: number,
    type: "vertical" | "horizontal"
  ) {
    const keys = ["before", "after"] as const;

    if (neighbors.before.dist === 0 || neighbors.after.dist === 0) {
      const combined =
        neighbors.before.dist === 0 ? neighbors.before : neighbors.after;
      this.addSnapLine(type, axisVal, combined.p1, combined.p2, undefined);
      return;
    }

    keys.forEach((key) => {
      const n = neighbors[key];
      if (n.dist < Infinity && n.dist > 0.5) {
        this.addSnapLine(
          type,
          axisVal,
          n.p1,
          n.p2,
          Math.round(n.dist).toString()
        );
      }
    });
  }

  private addSnapLine(
    type: "vertical" | "horizontal",
    axisVal: number,
    start: number,
    end: number,
    text?: string
  ) {
    const s = Math.min(start, end);
    const e = Math.max(start, end);

    this.snapLines.push({
      type,
      value: axisVal,
      start: s,
      end: e,
      points:
        type === "vertical"
          ? [
              { x: axisVal, y: s },
              { x: axisVal, y: e }
            ]
          : [
              { x: s, y: axisVal },
              { x: e, y: axisVal }
            ],
      distanceText: text,
      textPos:
        type === "vertical"
          ? { x: axisVal + 5, y: (s + e) / 2 }
          : { x: (s + e) / 2, y: axisVal - 5 }
    });
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
