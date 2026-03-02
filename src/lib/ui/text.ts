import { BaseElementOption, Element } from "../node/element";
import { Intersection } from "../../util/Intersection";

export interface TextOption extends BaseElementOption {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  textBaseline?: CanvasTextBaseline;
  underline?: boolean;
  lineHeight?: number;
  wordWrap?: boolean;
  autoScale?: boolean;
}

const charWidthCache: Record<string, number> = {};

// 预先测算并缓存常用字符
function preCalculateChars(ctx: CanvasRenderingContext2D, font: string) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const key = `${font}-${char}`;
    if (charWidthCache[key] === undefined) {
      charWidthCache[key] = ctx.measureText(char).width;
    }
  }
}

export class Text extends Element {
  type = "text";

  text: string = "";
  fontSize: number = 14;
  fontFamily: string = "Arial";
  fontWeight: string | number = "normal";
  fontStyle: string = "normal";
  color: string = "#000000";
  textAlign: "left" | "center" | "right" = "left";
  textBaseline: CanvasTextBaseline = "top";
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

  // 获取单个字符宽度（带缓存）
  private getCharWidth(
    ctx: CanvasRenderingContext2D,
    char: string,
    font: string
  ): number {
    const key = `${font}-${char}`;
    if (charWidthCache[key] !== undefined) {
      return charWidthCache[key];
    }
    const width = ctx.measureText(char).width;
    charWidthCache[key] = width;
    return width;
  }

  // 测量字符串宽度：优先使用缓存累加，如果没有缓存则测量
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

  // 基于二分法查找适合给定宽度的最大字符数
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
      // 使用缓存的字符宽度进行快速测量
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
  private computeLines(ctx: CanvasRenderingContext2D) {
    const font = this.fontString;
    ctx.font = font;
    preCalculateChars(ctx, font);

    this.lines = [];
    if (!this.text) {
      this.textHeight = 0;
      return;
    }

    const maxWidth = this.width;
    if (!this.wordWrap || !maxWidth || maxWidth <= 0) {
      this.lines = [this.text];
      this.textHeight = this.fontSize * this.lineHeight;
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
        // 如果连一个字符都放不下，强制放入一个字符防止死循环
        this.lines.push(remainingText[0]);
        remainingText = remainingText.slice(1);
      } else {
        this.lines.push(remainingText.slice(0, wrapIndex));
        remainingText = remainingText.slice(wrapIndex);
      }
    }

    this.textHeight = this.lines.length * this.fontSize * this.lineHeight;
    // 如果没有固定高度，可以根据文本内容自动撑开高度
    if (this.height === undefined) {
      this.height = this.textHeight;
    }
  }

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.notInDitry()) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.setTransform(
      this.root.getViewPointMtrix().multiply(this.getOwnMatrix())
    );

    // 绘制背景
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.roundRect(0, 0, this.width || 0, this.height || 0, this.radius ?? 0);
      ctx.fill();
    }

    // 准备文本样式
    ctx.font = this.fontString;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 计算换行
    this.computeLines(ctx);

    const lineHeightPx = this.fontSize * this.lineHeight;
    let startY = 0;
    if (this.textBaseline === "middle") {
      startY = lineHeightPx / 2;
    } else if (this.textBaseline === "bottom") {
      startY = lineHeightPx;
    }

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      let x = 0;

      if (this.textAlign === "center") {
        x = (this.width || 0) / 2;
      } else if (this.textAlign === "right") {
        x = this.width || 0;
      }

      const y = startY + i * lineHeightPx;
      ctx.fillText(line, x, y);

      // 绘制下划线
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
