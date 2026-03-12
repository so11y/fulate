import { ShapeOption, Shape } from "@fulate/core";

export interface TextOption extends ShapeOption {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
  textBaseline?: CanvasTextBaseline;
  verticalAlign?: "top" | "middle" | "bottom";
  underline?: boolean;
  lineHeight?: number;
  wordWrap?: boolean;
  autoScale?: boolean;
}

export class Text extends Shape {
  type = "text";

  static charWidthCache: Record<string, number> = {};

  text: string = "";
  fontSize: number = 14;
  fontFamily: string = "Arial";
  fontWeight: string | number = "normal";
  fontStyle: string = "normal";
  color: string = "#000000";
  textAlign: "left" | "center" | "right" = "left";
  textBaseline: CanvasTextBaseline = "top";
  verticalAlign: "top" | "middle" | "bottom" = "top";
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

  private computeLines(ctx: CanvasRenderingContext2D) {
    const font = this.fontString;
    ctx.font = font;
    this.preCalculateChars(ctx, font);

    this.lines = [];
    const lineHeightPx = this.fontSize * this.lineHeight;
    const w = this.width || 0;

    if (!this.text) {
      this.textHeight = 0;
      return;
    }

    if (!this.wordWrap || !w || w <= 0) {
      this.lines = [this.text];
      this.textHeight = lineHeightPx;
      if (this.height === undefined) {
        this.height = this.textHeight;
      }
      return;
    }

    let remainingText = this.text;
    while (remainingText.length > 0) {
      const wrapIndex = this.findWrapIndexBinary(
        ctx,
        remainingText,
        w,
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

    this.textHeight = this.lines.length * lineHeightPx;
    if (this.height === undefined) {
      this.height = this.textHeight;
    }
  }

  protected applyPaintTransform(ctx: CanvasRenderingContext2D) {
    this.applyTransformToCtx(ctx);
    ctx.font = this.fontString;
    this.computeLines(ctx);
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    ctx.font = this.fontString;
    ctx.fillStyle = this.color;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    const w = this.width || 0;
    const h = this.height || 0;
    const lineHeightPx = this.fontSize * this.lineHeight;

    let verticalOffset = 0;
    if (this.verticalAlign === "middle") {
      verticalOffset = (h - this.textHeight) / 2;
    } else if (this.verticalAlign === "bottom") {
      verticalOffset = h - this.textHeight;
    }

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
        x = w / 2;
      } else if (this.textAlign === "right") {
        x = w;
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
  }
}
