import { ShapeOption, Shape } from "@fulate/core";
import { CustomEvent } from "@fulate/core";
import type { BackgroundColor, ShadowOption } from "@fulate/core";
import {
  getMeasureContext,
  preCalculateChars,
  measureStringWidth
} from "./measure";
import { wrapText, fitLineWithEllipsis } from "./layout";
import { enterEditing, exitEditing, setupClickToEdit } from "./editing";
import { paintTextContent } from "./paint";
import {
  TEXT_STYLE_KEYS,
  type TextStyleKey,
  type TextStyleConfig,
  buildFontString,
  getTextDefaults,
  resolveTextStyle
} from "./style";

export type { TextStyleConfig, TextStyleKey };
export { buildFontString, getTextDefaults };

export interface TextOption extends ShapeOption {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  color?: BackgroundColor;
  textAlign?: "left" | "center" | "right";
  textBaseline?: CanvasTextBaseline;
  verticalAlign?: "top" | "middle" | "bottom";
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  wordWrap?: boolean;
  maxLines?: number;
  autoScale?: boolean;
  overflow?: "hidden" | "visible";
  editable?: boolean;
  placeholder?: string;
  placeholderColor?: string;
  letterSpacing?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  textShadow?: ShadowOption | null;
}

export type ResolvedTextStyle = Required<TextStyleConfig>;

export class Text extends Shape {
  type = "text";

  text: string = "";
  fontSize: number = 14;
  fontFamily: string = "Arial";
  fontWeight: string | number = "normal";
  fontStyle: string = "normal";
  color: BackgroundColor = "#000000";
  textAlign: "left" | "center" | "right" = "center";
  textBaseline: CanvasTextBaseline = "top";
  verticalAlign: "top" | "middle" | "bottom" = "middle";
  underline: boolean = false;
  strikethrough: boolean = false;
  lineHeight: number = 1.5;
  wordWrap: boolean = true;
  maxLines?: number;
  overflow: "hidden" | "visible" = "hidden";
  editable: boolean = false;
  placeholder: string = "";
  placeholderColor: string = "";
  letterSpacing: number = 0;
  textStrokeColor: string = "";
  textStrokeWidth: number = 0;
  textShadow: ShadowOption | null = null;
  fitWidth = true;
  fitHeight = true;

  isEditing: boolean = false;
  _textarea: HTMLTextAreaElement | null = null;
  _editAbort: AbortController | null = null;
  _caretVisible = true;
  _blinkTimer: ReturnType<typeof setInterval> | null = null;
  _lineCharOffsets: number[] = [];
  _composing = false;
  _scrollX = 0;
  _selAnchor = -1;

  private _clickToEditRemove: (() => void) | null = null;
  private _explicitTextStyle = new Set<TextStyleKey>();
  _lines: string[] = [];
  _textHeight: number = 0;

  constructor(options?: TextOption) {
    super(options);
    if (options) {
      this.attrs(options);
    }
  }

  get fontString() {
    return this.getFontString();
  }

  // ───────── style resolution ─────────

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

  getResolvedTextStyle(): ResolvedTextStyle {
    this._explicitTextStyle ??= new Set<TextStyleKey>();
    const defaults = getTextDefaults(this);
    return resolveTextStyle(this as any, defaults, this._explicitTextStyle);
  }

  getFontString(style = this.getResolvedTextStyle()) {
    return buildFontString(style);
  }

  attrs(options: any) {
    this.syncExplicitTextStyle(options);
    super.attrs(options);
  }

  // ───────── layout ─────────

  private resolveWidth(ctx: CanvasRenderingContext2D, font: string, letterSpacing = 0) {
    if (this._hasExplicitWidth || this.fitWidth) {
      return Math.max(this.width ?? 0, 0);
    }
    if (!this.text) return 0;
    ctx.font = font;
    return Math.max(
      ...this.text
        .split(/\r?\n/)
        .map((line) => measureStringWidth(ctx, line, font, letterSpacing)),
      0
    );
  }

  private getResolvedHeight(lineHeightPx: number) {
    if (this._hasExplicitHeight || this.fitHeight) {
      return this.height ?? 0;
    }
    return undefined;
  }

  syncTextLayout(ctx = getMeasureContext()) {
    const style = this.getResolvedTextStyle();
    const font = this.getFontString(style);
    ctx.font = font;
    preCalculateChars(ctx, font);

    const lineHeightPx = style.fontSize * style.lineHeight;
    const ls = style.letterSpacing ?? 0;
    const width = this.resolveWidth(ctx, font, ls);
    this.width = width;

    if (!this.text) {
      this._lines = [];
      this._lineCharOffsets = [];
      this._textHeight = 0;
      if (!this._hasExplicitHeight && !this.fitHeight) {
        this.height = 0;
      }
      return;
    }

    const { lines: rawLines, offsets: rawOffsets } = wrapText(
      ctx,
      this.text,
      width,
      font,
      style.wordWrap,
      style.letterSpacing ?? 0
    );
    const resolvedHeight = this.getResolvedHeight(lineHeightPx);

    const heightLimit =
      resolvedHeight !== undefined && this.overflow !== "visible"
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
        lines[lines.length - 1] = fitLineWithEllipsis(
          ctx,
          lines[lines.length - 1],
          width,
          font,
          style.letterSpacing ?? 0
        );
      }
    }

    this._lines = lines;
    this._lineCharOffsets = rawOffsets.slice(0, lines.length);
    this._textHeight = lines.length * lineHeightPx;
    if (resolvedHeight !== undefined) {
      this.height = resolvedHeight;
    } else {
      this.height = this._textHeight;
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

  // ───────── editing (delegated) ─────────

  enterEditing(initialClickLocal?: { x: number; y: number }) {
    enterEditing(this, initialClickLocal);
  }

  exitEditing() {
    exitEditing(this);
  }

  activate() {
    super.activate();
    this._clickToEditRemove = setupClickToEdit(this);
  }

  deactivate() {
    this._clickToEditRemove?.();
    this._clickToEditRemove = null;
    this.exitEditing();
    super.deactivate();
  }

  // ───────── serialization ─────────

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    if (this.text !== "") json.text = this.text;
    if (this.fontSize !== 14) json.fontSize = this.fontSize;
    if (this.fontFamily !== "Arial") json.fontFamily = this.fontFamily;
    if (this.fontWeight !== "normal") json.fontWeight = this.fontWeight;
    if (this.fontStyle !== "normal") json.fontStyle = this.fontStyle;
    if (this.color !== "#000000") json.color = this.color;
    if (this.textAlign !== "center") json.textAlign = this.textAlign;
    if (this.textBaseline !== "top") json.textBaseline = this.textBaseline;
    if (this.verticalAlign !== "middle") json.verticalAlign = this.verticalAlign;
    if (this.underline !== false) json.underline = this.underline;
    if (this.strikethrough !== false) json.strikethrough = this.strikethrough;
    if (this.lineHeight !== 1.5) json.lineHeight = this.lineHeight;
    if (this.wordWrap !== true) json.wordWrap = this.wordWrap;
    if (this.maxLines !== undefined) json.maxLines = this.maxLines;
    if (this.overflow !== "hidden") json.overflow = this.overflow;
    if (this.editable !== false) json.editable = this.editable;
    if (this.placeholder !== "") json.placeholder = this.placeholder;
    if (this.placeholderColor !== "") json.placeholderColor = this.placeholderColor;
    if (this.letterSpacing !== 0) json.letterSpacing = this.letterSpacing;
    if (this.textStrokeColor !== "") json.textStrokeColor = this.textStrokeColor;
    if (this.textStrokeWidth !== 0) json.textStrokeWidth = this.textStrokeWidth;
    if (this.textShadow !== null) json.textShadow = this.textShadow;
    return json;
  }

  // ───────── rendering (delegated) ─────────

  protected paintContent(ctx: CanvasRenderingContext2D) {
    paintTextContent(this, ctx);
  }
}
