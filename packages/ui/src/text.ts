import { ShapeOption, Shape } from "@fulate/core";
import { CustomEvent } from "@fulate/util";

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
  maxLines?: number;
  autoScale?: boolean;
  editable?: boolean;
}

const TEXT_STYLE_KEYS = [
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "fontStyle",
  "textAlign",
  "textBaseline",
  "verticalAlign",
  "underline",
  "lineHeight",
  "wordWrap",
  "maxLines"
] as const;

type TextStyleKey = (typeof TEXT_STYLE_KEYS)[number];
type TextDefaultsContext = Pick<TextOption, TextStyleKey>;

export class Text extends Shape {
  type = "text";

  static charWidthCache: Record<string, number> = {};
  private static measureCtx: CanvasRenderingContext2D | null = null;

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
  maxLines?: number;
  editable: boolean = false;
  fitWidth = true;
  fitHeight = true;

  isEditing: boolean = false;
  private _textarea: HTMLTextAreaElement | null = null;
  private _editAbort: AbortController | null = null;

  private _explicitTextStyle = new Set<TextStyleKey>();
  private lines: string[] = [];
  private textHeight: number = 0;

  constructor(options?: TextOption) {
    super(options);
    if (options) {
      this.attrs(options);
    }
  }

  get fontString() {
    return this.getFontString();
  }

  private getMeasureContext() {
    if (Text.measureCtx) return Text.measureCtx;
    const canvas = document.createElement("canvas");
    Text.measureCtx = canvas.getContext("2d")!;
    return Text.measureCtx;
  }

  private syncExplicitTextStyle(options: any) {
    if (!options) return;
    this._explicitTextStyle ??= new Set<TextStyleKey>();
    for (const key of TEXT_STYLE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(options, key)) {
        if (options[key] === undefined || options[key] === null) {
          this._explicitTextStyle.delete(key);
        } else {
          this._explicitTextStyle.add(key);
        }
      }
    }
  }

  private getResolvedTextStyle(): Required<TextDefaultsContext> {
    this._explicitTextStyle ??= new Set<TextStyleKey>();
    const defaults = this.inject<TextDefaultsContext>("textDefaults") ?? {};
    const resolved = {} as Required<TextDefaultsContext>;

    for (const key of TEXT_STYLE_KEYS) {
      const currentValue = this[key];
      const defaultValue = defaults[key];
      //@ts-ignore
      resolved[key] = (
        this._explicitTextStyle.has(key) || defaultValue === undefined
          ? currentValue
          : defaultValue
      ) as Required<TextDefaultsContext>[TextStyleKey];
    }

    return resolved;
  }

  private getFontString(style = this.getResolvedTextStyle()) {
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  }

  attrs(options: any, O: { target?: any; assign?: boolean } = {}) {
    this.syncExplicitTextStyle(options);
    super.attrs(options, O);
  }

  quickSetOptions(options: TextOption) {
    this.syncExplicitTextStyle(options);
    return super.quickSetOptions(options);
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

  private resolveWidth(ctx: CanvasRenderingContext2D, font: string) {
    if (this._hasExplicitWidth || this.fitWidth) {
      return Math.max(this.width ?? 0, 0);
    }

    if (!this.text) return 0;

    ctx.font = font;
    return Math.max(
      ...this.text
        .split(/\r?\n/)
        .map((line) => this.measureStringWidth(ctx, line, font)),
      0
    );
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string,
    wordWrap: boolean
  ) {
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];

    for (const paragraph of paragraphs) {
      if (!wordWrap || maxWidth <= 0) {
        lines.push(paragraph);
        continue;
      }

      if (paragraph.length === 0) {
        lines.push("");
        continue;
      }

      let remainingText = paragraph;
      while (remainingText.length > 0) {
        const wrapIndex = this.findWrapIndexBinary(
          ctx,
          remainingText,
          maxWidth,
          font
        );

        if (wrapIndex === 0) {
          lines.push(remainingText[0]);
          remainingText = remainingText.slice(1);
        } else {
          lines.push(remainingText.slice(0, wrapIndex));
          remainingText = remainingText.slice(wrapIndex);
        }
      }
    }

    return lines;
  }

  private fitLineWithEllipsis(
    ctx: CanvasRenderingContext2D,
    line: string,
    maxWidth: number,
    font: string
  ) {
    const ellipsis = "...";
    if (maxWidth <= 0) return "";

    if (this.measureStringWidth(ctx, `${line}${ellipsis}`, font) <= maxWidth) {
      return `${line}${ellipsis}`;
    }

    const ellipsisWidth = this.measureStringWidth(ctx, ellipsis, font);
    if (ellipsisWidth > maxWidth) return "";

    let left = 0;
    let right = line.length;
    let best = "";

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const subText = line.slice(0, mid);
      if (
        this.measureStringWidth(ctx, subText, font) + ellipsisWidth <=
        maxWidth
      ) {
        best = subText;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return `${best}${ellipsis}`;
  }

  private getResolvedHeight(lineHeightPx: number) {
    if (this._hasExplicitHeight || this.fitHeight) {
      return this.height ?? 0;
    }
    return undefined;
  }

  private syncTextLayout(ctx = this.getMeasureContext()) {
    const style = this.getResolvedTextStyle();
    const font = this.getFontString(style);
    ctx.font = font;
    this.preCalculateChars(ctx, font);

    const lineHeightPx = style.fontSize * style.lineHeight;
    const width = this.resolveWidth(ctx, font);
    this.width = width;

    if (!this.text) {
      this.lines = [];
      this.textHeight = 0;
      if (!this._hasExplicitHeight && !this.fitHeight) {
        this.height = 0;
      }
      return;
    }

    const rawLines = this.wrapText(ctx, this.text, width, font, style.wordWrap);
    const resolvedHeight = this.getResolvedHeight(lineHeightPx);

    const heightLimit = resolvedHeight !== undefined
      ? Math.max(Math.floor(resolvedHeight / lineHeightPx), 0)
      : Infinity;
    const maxLinesLimit =
      style.maxLines && style.maxLines > 0 ? style.maxLines : Infinity;
    const visibleLineLimit = Math.min(heightLimit, maxLinesLimit);

    let lines = rawLines;
    const isTruncated =
      Number.isFinite(visibleLineLimit) && rawLines.length > visibleLineLimit;

    if (Number.isFinite(visibleLineLimit)) {
      lines = rawLines.slice(0, visibleLineLimit);
      if (isTruncated && lines.length > 0) {
        lines[lines.length - 1] = this.fitLineWithEllipsis(
          ctx,
          lines[lines.length - 1],
          width,
          font
        );
      }
    }

    this.lines = lines;
    this.textHeight = lines.length * lineHeightPx;
    if (resolvedHeight !== undefined) {
      this.height = resolvedHeight;
    } else {
      this.height = this.textHeight;
    }
  }

  updateTransform(parentWorldDirty: boolean = false) {
    this.resolveFitSize();
    this.syncTextLayout();
    super.updateTransform(parentWorldDirty);
  }

  protected applyPaintTransform(ctx: CanvasRenderingContext2D) {
    this.applyTransformToCtx(ctx);
    ctx.font = this.fontString;
  }

  enterEditing() {
    if (!this.editable || this.isEditing) return;
    this.isEditing = true;
    const style = this.getResolvedTextStyle();

    const root = this.root;
    const { scale } = root.viewport;
    const m = this._ownMatrixCache;
    const abort = new AbortController();
    this._editAbort = abort;
    const { signal } = abort;

    const textarea = document.createElement("textarea");

    const sx = Math.sqrt(m.a * m.a + m.b * m.b);
    const sy = Math.sqrt(m.c * m.c + m.d * m.d);
    const angle = Math.atan2(m.b, m.a) * (180 / Math.PI);

    const left = m.e * scale + root.viewport.x;
    const top = m.f * scale + root.viewport.y;
    const w = (this.width || 100) * sx * scale;
    const resolvedHeight = this.getResolvedHeight(
      style.fontSize * style.lineHeight
    );

    const h =
      ((resolvedHeight ?? this.height) || style.fontSize * style.lineHeight) *
      sy *
      scale;
    const fs = style.fontSize * sx * scale;

    Object.assign(textarea.style, {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${w}px`,
      height: `${h}px`,
      fontSize: `${fs}px`,
      fontFamily: style.fontFamily,
      fontWeight: String(style.fontWeight),
      fontStyle: style.fontStyle,
      color: style.color,
      textAlign: style.textAlign,
      lineHeight: String(style.lineHeight),
      background: this.backgroundColor || "transparent",
      border: "1px solid #4F81FF",
      borderRadius: this.radius ? `${this.radius * sx * scale}px` : "0",
      outline: "none",
      resize: "none",
      overflow: "hidden",
      padding: "0",
      margin: "0",
      zIndex: "9999",
      boxSizing: "border-box",
      transformOrigin: "0 0",
      transform: angle ? `rotate(${angle}deg)` : "none"
    });

    textarea.value = this.text;
    this.visible = false;
    this.markDirty();

    root.container.appendChild(textarea);
    textarea.focus();
    textarea.select();
    this._textarea = textarea;

    textarea.addEventListener(
      "input",
      () => {
        this.text = textarea.value;
        this.dispatchEvent(
          new CustomEvent("input", { detail: this.text, bubbles: false })
        );
      },
      { signal }
    );

    textarea.addEventListener(
      "keydown",
      (e) => {
        e.stopPropagation();
        if (e.key === "Escape") textarea.blur();
      },
      { signal }
    );

    textarea.addEventListener(
      "pointerdown",
      (e) => {
        e.stopPropagation();
      },
      { signal }
    );

    textarea.addEventListener(
      "blur",
      () => {
        this.exitEditing();
      },
      { signal }
    );
  }

  exitEditing() {
    if (!this.isEditing) return;
    if (this._textarea) {
      this.text = this._textarea.value;
      this._textarea.remove();
      this._textarea = null;
    }
    this._editAbort?.abort();
    this._editAbort = null;
    this.isEditing = false;
    this.visible = true;
    this.markDirty();
    this.dispatchEvent(
      new CustomEvent("change", { detail: this.text, bubbles: false })
    );
  }

  deactivate() {
    this.exitEditing();
    super.deactivate();
  }

  protected paintContent(ctx: CanvasRenderingContext2D) {
    const style = this.getResolvedTextStyle();
    ctx.font = this.getFontString(style);
    ctx.fillStyle = style.color;
    ctx.textAlign = style.textAlign;
    ctx.textBaseline = style.textBaseline;
    this.syncTextLayout(ctx);

    const w = this.width || 0;
    const h = this.height || 0;
    const lineHeightPx = style.fontSize * style.lineHeight;

    const intraLineOffset = (lineHeightPx - style.fontSize) / 2;
    let verticalOffset = 0;
    if (style.verticalAlign === "middle") {
      verticalOffset = (h - this.textHeight) / 2 + intraLineOffset;
    } else if (style.verticalAlign === "bottom") {
      verticalOffset = h - this.textHeight + intraLineOffset;
    }

    let startY = 0;
    if (style.textBaseline === "middle") {
      startY = lineHeightPx / 2;
    } else if (style.textBaseline === "bottom") {
      startY = lineHeightPx;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      let x = 0;

      if (style.textAlign === "center") {
        x = w / 2;
      } else if (style.textAlign === "right") {
        x = w;
      }

      const y = startY + i * lineHeightPx + verticalOffset;

      ctx.fillText(line, x, y);

      if (style.underline) {
        const lineWidth = this.measureStringWidth(ctx, line, this.fontString);
        let lineX = x;
        if (style.textAlign === "center") {
          lineX = x - lineWidth / 2;
        } else if (style.textAlign === "right") {
          lineX = x - lineWidth;
        }

        const underlineY =
          y +
          style.fontSize * 0.1 +
          (style.textBaseline === "top" ? style.fontSize : 0);

        ctx.beginPath();
        ctx.moveTo(lineX, underlineY);
        ctx.lineTo(lineX + lineWidth, underlineY);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = Math.max(1, style.fontSize / 15);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
