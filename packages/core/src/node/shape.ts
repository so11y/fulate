import { Element, BaseElementOption } from "./element";
import { Point } from "@fulate/util";

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
  backgroundColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderPosition?: BorderPosition;
  opacity?: number;
  radius?: number | null;
  shadow?: ShadowOption | null;
}

export class Shape extends Element {
  backgroundColor: string | null = null;
  borderColor: string | null = null;
  borderWidth: number = 0;
  borderPosition: BorderPosition = "inside";
  opacity: number = 1;
  radius: number | null = null;
  shadow: ShadowOption | null = null;

  constructor(options?: ShapeOption) {
    super(options);
    if (options) {
      this.attrs(options);
    }
  }

  setOptions(options?: ShapeOption, syncCalc = false) {
    return super.setOptions(options, syncCalc);
  }

  quickSetOptions(options: ShapeOption) {
    return super.quickSetOptions(options);
  }

  setPaint(
    options: Partial<
      Pick<ShapeOption, "backgroundColor" | "borderColor" | "opacity" | "shadow">
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
    if (!this.visible || this.width === undefined || this.height === undefined) {
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

    const { x: vx, y: vy, scale } = root.viewport;
    const vw = root.width / scale;
    const vh = root.height / scale;
    const viewLeft = -vx / scale;
    const viewTop = -vy / scale;

    const m = this._ownMatrixCache;
    let inRootViewport: boolean;

    if (m.b === 0 && m.c === 0) {
      const { top: oT, right: oR, bottom: oB, left: oL } = this.getVisualOutset();
      const absSx = Math.abs(m.a);
      const absSy = Math.abs(m.d);
      const nodeLeft = m.e - oL * absSx;
      const nodeTop = m.f - oT * absSy;
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

    if (hasShadow) this.applyShadow(ctx);
    this.paintBackground(ctx);
    if (hasShadow) this.clearShadow(ctx);

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
    ctx.fillStyle = this.backgroundColor;
    ctx.fill();
  }

  protected paintBorder(ctx: CanvasRenderingContext2D) {
    if (!this.borderColor || !this.borderWidth) return;
    this.buildBorderPath(ctx);
    ctx.strokeStyle = this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.stroke();
  }

  private applyShadow(ctx: CanvasRenderingContext2D) {
    const s = this.shadow!;
    ctx.shadowColor = s.color ?? "rgba(0,0,0,0.3)";
    ctx.shadowBlur = s.blur ?? 0;
    ctx.shadowOffsetX = s.offsetX ?? 0;
    ctx.shadowOffsetY = s.offsetY ?? 0;
  }

  private clearShadow(ctx: CanvasRenderingContext2D) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.save();
    this.applyPaintTransform(ctx);
    this.buildPath(ctx);
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    ctx.restore();
  }

  toJson(includeChildren = false): ShapeOption {
    const json = super.toJson(includeChildren) as any;
    json.backgroundColor = this.backgroundColor;
    json.borderColor = this.borderColor;
    json.borderWidth = this.borderWidth;
    json.borderPosition = this.borderPosition;
    json.opacity = this.opacity;
    json.radius = this.radius;
    json.shadow = this.shadow;
    return json;
  }
}
