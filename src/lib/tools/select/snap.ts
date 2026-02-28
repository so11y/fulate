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

  threshold = 8;
  lineColor = "#ff00cc";
  lineWidth = 1;
  dashPattern = [4, 4];

  selectable = false;

  private isActive = false;
  private snapLines: SnapLine[] = [];

  private cacheX: Float32Array = new Float32Array(0);
  private cacheY: Float32Array = new Float32Array(0);

  constructor() {
    super();
  }

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
      const coords = node.getCoords();
      for (const p of coords) {
        xData.push(p.x, p.y, p.y);
        yData.push(p.y, p.x, p.x);
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

      // 收集所有元素的 Y 轴范围（包括移动对象和参考对象）
      const allRanges: Array<{ min: number; max: number; isMoving: boolean }> =
        [];

      // 添加移动对象
      allRanges.push({ min: objMinY, max: objMaxY, isMoving: true });

      // 添加所有参考对象
      for (const seg of bestX.segments) {
        const refMinY = seg.min;
        const refMaxY = seg.max !== undefined ? seg.max : seg.min;
        allRanges.push({ min: refMinY, max: refMaxY, isMoving: false });
      }

      // 按位置排序
      allRanges.sort((a, b) => a.min - b.min);

      // 找出所有相邻的间隙并绘制
      for (let i = 0; i < allRanges.length - 1; i++) {
        const current = allRanges[i];
        const next = allRanges[i + 1];

        const gapStart = current.max;
        const gapEnd = next.min;
        const distance = gapEnd - gapStart;

        if (distance > 0) {
          // 有间隙，绘制距离线
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

      // 收集所有元素的 X 轴范围（包括移动对象和参考对象）
      const allRanges: Array<{ min: number; max: number; isMoving: boolean }> =
        [];

      // 添加移动对象
      allRanges.push({ min: objMinX, max: objMaxX, isMoving: true });

      // 添加所有参考对象
      for (const seg of bestY.segments) {
        const refMinX = seg.min;
        const refMaxX = seg.max !== undefined ? seg.max : seg.min;
        allRanges.push({ min: refMinX, max: refMaxX, isMoving: false });
      }

      // 按位置排序
      allRanges.sort((a, b) => a.min - b.min);

      // 找出所有相邻的间隙并绘制
      for (let i = 0; i < allRanges.length - 1; i++) {
        const current = allRanges[i];
        const next = allRanges[i + 1];

        const gapStart = current.max;
        const gapEnd = next.min;
        const distance = gapEnd - gapStart;

        if (distance > 0) {
          // 有间隙，绘制距离线
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
    console.log('---');
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
