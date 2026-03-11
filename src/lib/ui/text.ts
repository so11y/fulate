import { BaseElementOption, Element } from "../node/element";
import { extractPhysicalTransform } from "../../util/matrix";

export interface TextOption extends BaseElementOption {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  textBaseline?: CanvasTextBaseline;
  verticalAlign?: "top" | "middle" | "bottom"; // 新增：垂直对齐选项
  underline?: boolean;
  lineHeight?: number;
  wordWrap?: boolean;
  autoScale?: boolean;
}

export class Text extends Element {
  type = "text";

  // 1. 改为静态属性，所有 Text 实例共享缓存
  static charWidthCache: Record<string, number> = {};

  text: string = "";
  fontSize: number = 14;
  fontFamily: string = "Arial";
  fontWeight: string | number = "normal";
  fontStyle: string = "normal";
  color: string = "#000000";
  textAlign: "left" | "center" | "right" = "left";
  textBaseline: CanvasTextBaseline = "top";
  verticalAlign: "top" | "middle" | "bottom" = "top"; // 新增：默认顶部对齐
  underline: boolean = false;
  lineHeight: number = 1.5;
  wordWrap: boolean = true;

  private lines: string[] = [];
  private textHeight: number = 0;

  constructor(options?: TextOption) {
    super(options);
    if (options) {
      this.attrs(options);
    }
  }

  get fontString() {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
  }

  // 预先测算并缓存常用字符 (使用静态缓存)
  private preCalculateChars(ctx: CanvasRenderingContext2D, font: string) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const key = `${font}-${char}`;
      if (Text.charWidthCache[key] === undefined) {
        Text.charWidthCache[key] = ctx.measureText(char).width;
      }
    }
  }

  // 获取单个字符宽度（使用静态缓存）
  private getCharWidth(
    ctx: CanvasRenderingContext2D,
    char: string,
    font: string
  ): number {
    const key = `${font}-${char}`;
    if (Text.charWidthCache[key] !== undefined) {
      return Text.charWidthCache[key];
    }
    const width = ctx.measureText(char).width;
    Text.charWidthCache[key] = width;
    return width;
  }

  // 测量字符串宽度
  private measureStringWidth(
    ctx: CanvasRenderingContext2D,
    str: string,
    font: string
  ): number {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
      width += this.getCharWidth(ctx, str[i], font);
    }
    return width;
  }

  // 二分法查找换行位置
  private findWrapIndexBinary(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string
  ): number {
    let left = 0;
    let right = text.length;
    let best = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const subText = text.slice(0, mid);
      const width = this.measureStringWidth(ctx, subText, font);

      if (width <= maxWidth) {
        best = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return best;
  }

  // 计算文本换行
  private computeLines(
    ctx: CanvasRenderingContext2D,
    renderWidth: number,
    stretchY: number
  ) {
    const font = this.fontString;
    ctx.font = font;
    this.preCalculateChars(ctx, font);

    this.lines = [];
    // 计算单行高度像素值
    const lineHeightPx = this.fontSize * this.lineHeight;

    if (!this.text) {
      this.textHeight = 0;
      return;
    }

    const maxWidth = renderWidth;
    if (!this.wordWrap || !maxWidth || maxWidth <= 0) {
      this.lines = [this.text];
      this.textHeight = lineHeightPx;
      if (this.height === undefined) {
        this.height = stretchY === 0 ? 0 : this.textHeight / stretchY;
      }
      return;
    }

    let remainingText = this.text;
    while (remainingText.length > 0) {
      const wrapIndex = this.findWrapIndexBinary(
        ctx,
        remainingText,
        maxWidth,
        font
      );

      if (wrapIndex === 0) {
        this.lines.push(remainingText[0]);
        remainingText = remainingText.slice(1);
      } else {
        this.lines.push(remainingText.slice(0, wrapIndex));
        remainingText = remainingText.slice(wrapIndex);
      }
    }

    // 更新文本总高度
    this.textHeight = this.lines.length * lineHeightPx;
    if (this.height === undefined) {
      this.height = stretchY === 0 ? 0 : this.textHeight / stretchY;
    }
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {

    ctx.save();
    ctx.beginPath();

    const vpMatrix = this.root.getViewPointMtrix();
    const localMatrix = this.getOwnMatrix();
    const matrix = vpMatrix.multiply(localMatrix);

    const local = extractPhysicalTransform(localMatrix);
    const renderWidth = (this.width || 0) * local.stretchX;

    const combined = extractPhysicalTransform(matrix);
    const vpScale = Math.sqrt(vpMatrix.a * vpMatrix.a + vpMatrix.b * vpMatrix.b);

    const cos = Math.cos(combined.angle);
    const sin = Math.sin(combined.angle);

    const d = this.root.dpr;
    ctx.setTransform(
      vpScale * cos * d,
      vpScale * sin * d,
      -vpScale * combined.flip * sin * d,
      vpScale * combined.flip * cos * d,
      matrix.e * d,
      matrix.f * d
    );

    ctx.font = this.fontString;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 计算文字行
    this.computeLines(ctx, renderWidth, local.stretchY);

    const renderHeight =
      this.height !== undefined ? this.height * local.stretchY : this.textHeight;

    // 绘制背景
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      // 在当前的“干净矩阵”下，直接用拉伸后的 width 和 height 画矩形。
      // 因为矩阵是直角的，所以画出来的一定是完美的直角矩形，绝不会变成平行四边形！
      // 并且它的尺寸精确等于拉伸后的尺寸，会和外面的控制框完美重合！
      ctx.roundRect(0, 0, renderWidth, renderHeight, this.radius ?? 0);
      ctx.fill();

      // 画完背景记得恢复成文字的颜色
      ctx.fillStyle = this.color;
    }
    // =======================================================

    const lineHeightPx = this.fontSize * this.lineHeight;

    let verticalOffset = 0;
    if (this.verticalAlign === "middle") {
      verticalOffset = (renderHeight - this.textHeight) / 2;
    } else if (this.verticalAlign === "bottom") {
      verticalOffset = renderHeight - this.textHeight;
    }

    let startY = 0;
    if (this.textBaseline === "middle") {
      startY = lineHeightPx / 2;
    } else if (this.textBaseline === "bottom") {
      startY = lineHeightPx;
    }

    // 绘制文字
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      let x = 0;

      if (this.textAlign === "center") {
        x = renderWidth / 2;
      } else if (this.textAlign === "right") {
        x = renderWidth;
      }

      const y = startY + i * lineHeightPx + verticalOffset;

      ctx.fillText(line, x, y);

      if (this.underline) {
        const lineWidth = this.measureStringWidth(ctx, line, this.fontString);
        let lineX = x;
        if (this.textAlign === "center") {
          lineX = x - lineWidth / 2;
        } else if (this.textAlign === "right") {
          lineX = x - lineWidth;
        }

        const underlineY =
          y +
          this.fontSize * 0.1 +
          (this.textBaseline === "top" ? this.fontSize : 0);

        ctx.beginPath();
        ctx.moveTo(lineX, underlineY);
        ctx.lineTo(lineX + lineWidth, underlineY);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(1, this.fontSize / 15);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
