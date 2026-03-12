import { Element, BaseElementOption } from "./element";

export type BorderPosition = "inside" | "outside";

export interface ShapeOption<T = Shape> extends BaseElementOption<T> {
  backgroundColor?: string | null;
  borderColor?: string | null;
  borderWidth?: number;
  borderPosition?: BorderPosition;
  opacity?: number;
  radius?: number | null;
}

export class Shape extends Element {
  backgroundColor: string | null = null;
  borderColor: string | null = null;
  borderWidth: number = 0;
  borderPosition: BorderPosition = "inside";
  opacity: number = 1;
  radius: number | null = null;

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

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (!this.visible) return;

    ctx.save();
    this.applyPaintTransform(ctx);
    if (this.opacity < 1) ctx.globalAlpha *= this.opacity;
    this.paintBackground(ctx);
    this.paintContent(ctx);
    this.paintBorder(ctx);
    this.paintChildren(ctx);
    ctx.restore();
  }

  /** 定义形状路径（width × height），hover 复用此路径 */
  protected buildPath(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
  }

  /** 构建 border 描边路径，inside 向内缩进，outside 向外扩展 */
  protected buildBorderPath(ctx: CanvasRenderingContext2D) {
    const half = this.borderWidth / 2;
    ctx.beginPath();
    if (this.borderPosition === "inside") {
      ctx.roundRect(
        half, half,
        this.width! - this.borderWidth, this.height! - this.borderWidth,
        Math.max((this.radius ?? 0) - half, 0)
      );
    } else {
      ctx.roundRect(
        -half, -half,
        this.width! + this.borderWidth, this.height! + this.borderWidth,
        (this.radius ?? 0) + half
      );
    }
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

  paintHover(ctx: CanvasRenderingContext2D, scale: number) {
    ctx.save();
    this.applyPaintTransform(ctx);
    this.buildPath(ctx);
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = 1 / scale;
    ctx.stroke();
    ctx.restore();
  }

  _getTransformedDimensions(options?) {
    const dim = super._getTransformedDimensions(options);
    if (this.borderPosition === "outside" && this.borderWidth) {
      dim.x += this.borderWidth * 2;
      dim.y += this.borderWidth * 2;
    }
    return dim;
  }

  toJson(includeChildren = false): ShapeOption {
    const json = super.toJson(includeChildren) as any;
    json.backgroundColor = this.backgroundColor;
    json.borderColor = this.borderColor;
    json.borderWidth = this.borderWidth;
    json.borderPosition = this.borderPosition;
    json.opacity = this.opacity;
    json.radius = this.radius;
    return json;
  }
}
