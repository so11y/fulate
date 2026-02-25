import { Element } from "../../node/element";

interface Point {
  x: number;
  y: number;
}

// 定义吸附线的数据结构
interface SnapLine {
  type: "vertical" | "horizontal";
  value: number; // 线的绝对位置
  start: number; // 线的视觉起点
  end: number;   // 线的视觉终点
  // 关键：我们要在这里画 'X'
  points: Point[]; 
}

interface SnapResult {
  dx: number;
  dy: number;
}

export class Snap extends Element {
  type = "snap";
  key = "snap";

  threshold = 8; // 稍微调大一点阈值，手感更好
  lineColor = "#ff00cc";
  lineWidth = 1;
  dashPattern = [4, 4];

  private isActive = false;
  private snapLines: SnapLine[] = [];

  // 缓存参考线
  private cacheX: Float32Array = new Float32Array(0);
  private cacheY: Float32Array = new Float32Array(0);

  /**
   * 计算 AABB 包围盒
   */
  private getAABB(coords: Point[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of coords) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: minX + (maxX - minX) / 2,
      centerY: minY + (maxY - minY) / 2
    };
  }

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
        const coords = node.getCoords(); // 获取真实顶点
        const rect = this.getAABB(coords);

        // 存入缓存：[值, 线的范围起点, 线的范围终点]
        xData.push(rect.left, rect.top, rect.bottom);
        xData.push(rect.centerX, rect.top, rect.bottom);
        xData.push(rect.right, rect.top, rect.bottom);

        yData.push(rect.top, rect.left, rect.right);
        yData.push(rect.centerY, rect.left, rect.right);
        yData.push(rect.bottom, rect.left, rect.right);

        if (node.children) traverse(node.children);
      }
    };
    if (this.root.children) traverse(this.root.children);

    this.cacheX = new Float32Array(xData);
    this.cacheY = new Float32Array(yData);
  }

  /**
   * 检测吸附
   * @param coords 预测的坐标点数组 (必须是预测位置的坐标)
   */
  detect(coords: Point[]): SnapResult {
    if (!this.isActive) return { dx: 0, dy: 0 };

    this.snapLines = [];
    const rect = this.getAABB(coords); // 计算预测位置的包围盒

    // 定义当前物体的关注点，并标记类型
    const targetX = [
      { val: rect.left, type: 'start' },
      { val: rect.centerX, type: 'center' },
      { val: rect.right, type: 'end' }
    ];

    const targetY = [
      { val: rect.top, type: 'start' },
      { val: rect.centerY, type: 'center' },
      { val: rect.bottom, type: 'end' }
    ];

    const bestX = this.findClosest(targetX, this.cacheX, this.threshold);
    const bestY = this.findClosest(targetY, this.cacheY, this.threshold);

    let dx = 0;
    let dy = 0;

    if (bestX) {
      dx = bestX.diff;
      // 辅助线长度 = 参考物范围 U 当前物体范围
      const lineMinY = Math.min(bestX.min, rect.top);
      const lineMaxY = Math.max(bestX.max, rect.bottom);
      
      // 计算 X 标记的位置：在吸附线上的物体中心点
      // 如果是边缘吸附，最好显示在边缘中心
      const xMarkPoint = { x: bestX.targetVal, y: rect.centerY };

      this.snapLines.push({
        type: "vertical",
        value: bestX.targetVal,
        start: lineMinY,
        end: lineMaxY,
        points: [xMarkPoint] // 这里可以放多个点
      });
    }

    if (bestY) {
      dy = bestY.diff;
      const lineMinX = Math.min(bestY.min, rect.left);
      const lineMaxX = Math.max(bestY.max, rect.right);
      
      const xMarkPoint = { x: rect.centerX, y: bestY.targetVal };

      this.snapLines.push({
        type: "horizontal",
        value: bestY.targetVal,
        start: lineMinX,
        end: lineMaxX,
        points: [xMarkPoint]
      });
    }

    this.layer.render();
    return { dx, dy };
  }

  stop() {
    this.isActive = false;
    this.snapLines = [];
    this.layer.render();
  }

  render() {
    if (!this.isActive || this.snapLines.length === 0) return;

    const ctx = this.layer.ctx;
    const viewport = this.root.viewport;
    const scale = viewport.scale;

    ctx.save();
    ctx.setTransform(this.root.getViewPointMtrix());

    // 1. 画虚线
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = this.lineColor;
    ctx.setLineDash(this.dashPattern.map(v => v / scale));

    ctx.beginPath();
    for (const line of this.snapLines) {
      if (line.type === "vertical") {
        ctx.moveTo(line.value, line.start);
        ctx.lineTo(line.value, line.end);
      } else {
        ctx.moveTo(line.start, line.value);
        ctx.lineTo(line.end, line.value);
      }
    }
    ctx.stroke();

    // 2. 画 'X'
    ctx.setLineDash([]); // 实线
    const size = 4 / scale; // X 的半径

    ctx.beginPath();
    for (const line of this.snapLines) {
      for (const p of line.points) {
        // 画 X
        ctx.moveTo(p.x - size, p.y - size);
        ctx.lineTo(p.x + size, p.y + size);
        ctx.moveTo(p.x + size, p.y - size);
        ctx.lineTo(p.x - size, p.y + size);
      }
    }
    ctx.stroke();

    ctx.restore();
  }

  // 修改查找算法，返回更多信息
  private findClosest(
    targets: { val: number; type: string }[],
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
        const diff = refVal - t.val; // 正值表示需要向右/下移动
        const absDiff = Math.abs(diff);

        if (absDiff < threshold && absDiff < minDiff) {
          minDiff = absDiff;
          best = {
            diff: diff,
            targetVal: refVal,
            min: refMin,
            max: refMax,
            matchedType: t.type // 记录是哪条边吸附了
          };
        }
      }
    }
    return best;
  }
}