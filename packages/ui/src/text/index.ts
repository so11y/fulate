import { ShapeOption, Shape } from "@fulate/core";
import { CustomEvent } from "@fulate/core";
import {
  getMeasureContext,
  preCalculateChars,
  measureStringWidth
} from "./measure";
import { wrapText, fitLineWithEllipsis } from "./layout";
import { enterEditing, exitEditing, setupClickToEdit } from "./editing";
import { paintTextContent } from "./paint";

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
  overflow?: "hidden" | "visible";
  editable?: boolean;
  placeholder?: string;
  placeholderColor?: string;
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

export type ResolvedTextStyle = Required<TextDefaultsContext>;

export class Text extends Shape {
  type = "text";

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
  overflow: "hidden" | "visible" = "hidden";
  editable: boolean = false;
  placeholder: string = "";
  placeholderColor: string = "";
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
    const defaults = this.inject<TextDefaultsContext>("textDefaults") ?? {};
    const resolved = {} as ResolvedTextStyle;

    for (const key of TEXT_STYLE_KEYS) {
      const currentValue = this[key];
      const defaultValue = defaults[key];
      //@ts-ignore
      resolved[key] = (
        this._explicitTextStyle.has(key) || defaultValue === undefined
          ? currentValue
          : defaultValue
      ) as ResolvedTextStyle[TextStyleKey];
    }

    return resolved;
  }

  getFontString(style = this.getResolvedTextStyle()) {
    return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  }

  attrs(options: any) {
    this.syncExplicitTextStyle(options);
    super.attrs(options);
  }

  // ───────── layout ─────────

  private resolveWidth(ctx: CanvasRenderingContext2D, font: string) {
    if (this._hasExplicitWidth || this.fitWidth) {
      return Math.max(this.width ?? 0, 0);
    }
    if (!this.text) return 0;
    ctx.font = font;
    return Math.max(
      ...this.text
        .split(/\r?\n/)
        .map((line) => measureStringWidth(ctx, line, font)),
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
    const width = this.resolveWidth(ctx, font);
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
      style.wordWrap
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
          font
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
    json.text = this.text;
    json.fontSize = this.fontSize;
    json.fontFamily = this.fontFamily;
    json.fontWeight = this.fontWeight;
    json.fontStyle = this.fontStyle;
    json.color = this.color;
    json.textAlign = this.textAlign;
    json.textBaseline = this.textBaseline;
    json.verticalAlign = this.verticalAlign;
    json.underline = this.underline;
    json.lineHeight = this.lineHeight;
    json.wordWrap = this.wordWrap;
    json.maxLines = this.maxLines;
    json.overflow = this.overflow;
    json.editable = this.editable;
    json.placeholder = this.placeholder;
    json.placeholderColor = this.placeholderColor;
    return json;
  }

  // ───────── rendering (delegated) ─────────

  protected paintContent(ctx: CanvasRenderingContext2D) {
    paintTextContent(this, ctx);
  }
}
