import { Element, BaseElementOption } from "./element";
import { Point } from "@fulate/util";
import type { Edge } from "@fulate/util";
import {
  isGradient,
  createCanvasGradient,
  type GradientOption,
  type BackgroundColor
} from "../utils/gradient";

export { isGradient };
export type { GradientType, GradientStop, GradientOption, BackgroundColor } from "../utils/gradient";

export type BorderPosition = "inside" | "outside";

export interface ShadowOption {
  color?: string;
  blur?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface Outset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ShapeOption<T = Shape> extends BaseElementOption<T> {
  backgroundColor?: BackgroundColor | null;
  borderColor?: BackgroundColor | null;
  borderWidth?: number;
  borderPosition?: BorderPosition;
  opacity?: number;
  radius?: number | null;
  shadow?: ShadowOption | null;
}

export class Shape extends Element {
  backgroundColor: BackgroundColor | null = null;
  borderColor: BackgroundColor | null = null;
  borderWidth: number = 0;
  borderPosition: BorderPosition = "inside";
  opacity: number = 1;
  radius: number | null = null;
  shadow: ShadowOption | null = null;

  constructor(options?: ShapeOption) {
    super(options);
  }

  setOptions(options?: ShapeOption, syncCalc = false) {
    return super.setOptions(options, syncCalc);
  }

  setPaint(
    options: Partial<
      Pick<
        ShapeOption,
        "backgroundColor" | "borderColor" | "opacity" | "shadow"
      >
    >
  ) {
    Object.assign(this, options);
    this.markPaintDirty();
    return this;
  }

  // ========== 边框 & 视觉外扩 ==========

  getBorderOutset(): number {
    if (!this.borderWidth) return 0;
    return this.borderPosition === "outside" ? this.borderWidth : 0;
  }

  getVisualOutset(): Outset {
    const bo = this.getBorderOutset();
    let top = bo,
      right = bo,
      bottom = bo,
      left = bo;

    if (this.shadow) {
      const { offsetX = 0, offsetY = 0, blur = 0 } = this.shadow;
      top += Math.max(0, blur - offsetY);
      right += Math.max(0, blur + offsetX);
      bottom += Math.max(0, blur + offsetY);
      left += Math.max(0, blur - offsetX);
    }

    return { top, right, bottom, left };
  }

  // ========== 边段 & 锚点定位 ==========

  /**
   * 返回逻辑边对应的局部坐标线段（不含 visual outset）。
   * 多边形 / 三角形等子类覆写此方法即可让锚点贴着实际轮廓。
   */
  getEdgeSegment(edge: Edge): { start: Point; end: Point } {
    const w = this.width || 0, h = this.height || 0;
    switch (edge) {
      case "top":    return { start: new Point(0, 0), end: new Point(w, 0) };
      case "right":  return { start: new Point(w, 0), end: new Point(w, h) };
      case "bottom": return { start: new Point(0, h), end: new Point(w, h) };
      case "left":   return { start: new Point(0, 0), end: new Point(0, h) };
    }
  }

  /**
   * 返回某条逻辑边上 ratio 处的局部坐标和朝外法线。
   * 默认实现基于 getEdgeSegment 做线性插值；圆形等曲线形状可直接覆写。
   */
  getEdgePosition(edge: Edge, ratio: number): { pos: Point; nx: number; ny: number } {
    const seg = this.getEdgeSegment(edge);
    const pos = new Point(
      seg.start.x + (seg.end.x - seg.start.x) * ratio,
      seg.start.y + (seg.end.y - seg.start.y) * ratio
    );
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    let nx = -dy / len;
    let ny = dx / len;

    const cx = (this.width || 0) / 2;
    const cy = (this.height || 0) / 2;
    const mx = (seg.start.x + seg.end.x) / 2;
    const my = (seg.start.y + seg.end.y) / 2;
    if (nx * (cx - mx) + ny * (cy - my) > 0) {
      nx = -nx;
      ny = -ny;
    }
    return { pos, nx, ny };
  }

  // ========== 几何覆写 ==========

  getLocalPoints() {
    const { top, right, bottom, left } = this.getVisualOutset();
    return [
      new Point(-left, -top),
      new Point(this.width! + right, -top),
      new Point(this.width! + right, this.height! + bottom),
      new Point(-left, this.height! + bottom)
    ];
  }

  getLocalSnapPoints() {
    return [
      new Point(0, 0),
      new Point(this.width!, 0),
      new Point(this.width!, this.height!),
      new Point(0, this.height!)
    ];
  }

  hasPointHint(point: Point): boolean {
    if (
      !this.visible ||
      this.width === undefined ||
      this.height === undefined
    ) {
      return false;
    }
    const local = this.getGlobalToLocal(point);
    const expand = this.getBorderOutset();
    return (
      local.x >= -expand &&
      local.x <= this.width + expand &&
      local.y >= -expand &&
      local.y <= this.height + expand
    );
  }

  hasInView() {
    if (!this.visible || !this.width || !this.height) return false;
    if (!this.isActiveed) return false;

    const root = this.root;
    if (!root) return false;

    const { left: viewLeft, top: viewTop, width: vw, height: vh } = root.viewport.getWorldRect();

    const m = this._ownMatrixCache;
    let inRootViewport: boolean;

    if (m.b === 0 && m.c === 0) {
      const {
        top: oT,
        right: oR,
        bottom: oB,
        left: oL
      } = this.getVisualOutset();
      const absSx = Math.abs(m.a);
      const absSy = Math.abs(m.d);
      const baseW = this.width * absSx;
      const baseH = this.height * absSy;
      const baseLeft = m.a >= 0 ? m.e : m.e - baseW;
      const baseTop = m.d >= 0 ? m.f : m.f - baseH;
      const nodeLeft = baseLeft - oL * absSx;
      const nodeTop = baseTop - oT * absSy;
      const w = (this.width + oL + oR) * absSx;
      const h = (this.height + oT + oB) * absSy;

      inRootViewport =
        nodeLeft + w > viewLeft &&
        nodeLeft < viewLeft + vw &&
        nodeTop + h > viewTop &&
        nodeTop < viewTop + vh;
    } else {
      const { left, top, width, height } = this.getBoundingRect();
      inRootViewport =
        left + width > viewLeft &&
        left < viewLeft + vw &&
        top + height > viewTop &&
        top < viewTop + vh;
    }

    if (!inRootViewport) return false;

    const scrollContainer = this.inject("scrollContainer");
    if (scrollContainer && scrollContainer !== this) {
      return scrollContainer.isChildInScrollView(this);
    }
    return true;
  }

  // ========== 绘制 ==========

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (!this.visible) return;

    const hasShadow = !!(this.shadow && this.shadow.color);
    const needsSave = this.opacity < 1 || hasShadow;
    if (needsSave) ctx.save();

    this.applyPaintTransform(ctx);
    if (this.opacity < 1) ctx.globalAlpha *= this.opacity;

    if (hasShadow) {
      this.paintShadow(ctx, () => this.paintBackground(ctx));
    } else {
      this.paintBackground(ctx);
    }

    this.paintContent(ctx);
    this.paintBorder(ctx);
    this.paintChildren(ctx);

    if (needsSave) ctx.restore();
  }

  /** 定义形状路径（width × height），hover 复用此路径 */
  protected buildPath(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
  }

  /** 构建 border 描边路径 */
  protected buildBorderPath(ctx: CanvasRenderingContext2D) {
    const outset = this.getBorderOutset();
    const half = this.borderWidth / 2;
    const offset = outset > 0 ? -half : half;
    const size = outset > 0 ? this.borderWidth : -this.borderWidth;
    ctx.beginPath();
    ctx.roundRect(
      offset,
      offset,
      this.width! + size,
      this.height! + size,
      Math.max(0, (this.radius ?? 0) + offset)
    );
  }

  /** 应用绘制变换，Text 可覆写为自定义矩阵 */
  protected applyPaintTransform(ctx: CanvasRenderingContext2D) {
    this.applyTransformToCtx(ctx);
  }

  /** 绘制元素自身内容（文字、图片等），默认为空 */
  protected paintContent(ctx: CanvasRenderingContext2D) {}

  protected paintBackground(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundColor) return;
    this.buildPath(ctx);
    if (isGradient(this.backgroundColor)) {
      ctx.fillStyle = createCanvasGradient(ctx, this.backgroundColor, this.width!, this.height!);
    } else {
      ctx.fillStyle = this.backgroundColor;
    }
    ctx.fill();
  }

  protected paintBorder(ctx: CanvasRenderingContext2D) {
    if (!this.borderColor || !this.borderWidth) return;

    this.buildBorderPath(ctx);
    if (isGradient(this.borderColor)) {
      ctx.strokeStyle = createCanvasGradient(ctx, this.borderColor, this.width!, this.height!);
    } else {
      ctx.strokeStyle = this.borderColor;
    }

    if (this.borderPosition === "inside") {
      ctx.save();
      this.buildPath(ctx);
      ctx.clip();
      ctx.lineWidth = this.borderWidth * 2;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = this.borderWidth;
      ctx.stroke();
    }
  }

  private paintShadow(ctx: CanvasRenderingContext2D, fn: () => void) {
    const s = this.shadow!;
    ctx.shadowColor = s.color ?? "rgba(0,0,0,0.3)";
    ctx.shadowBlur = s.blur ?? 0;
    ctx.shadowOffsetX = s.offsetX ?? 0;
    ctx.shadowOffsetY = s.offsetY ?? 0;
    fn();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.save();
    this.applyPaintTransform(ctx);
    this.buildPath(ctx);
    ctx.clip();
    this.buildPath(ctx);
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
    ctx.restore();
  }

  toJson(includeChildren = false): ShapeOption<any> {
    const json = super.toJson(includeChildren) as any;
    if (this.backgroundColor !== null) json.backgroundColor = this.backgroundColor;
    if (this.borderColor !== null) json.borderColor = this.borderColor;
    if (this.borderWidth) json.borderWidth = this.borderWidth;
    if (this.borderPosition !== "inside") json.borderPosition = this.borderPosition;
    if (this.opacity !== 1) json.opacity = this.opacity;
    if (this.radius) json.radius = this.radius;
    if (this.shadow !== null) json.shadow = this.shadow;
    return json;
  }
}
