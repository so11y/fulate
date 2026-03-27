import { measureStringWidth, getCharWidth } from "./measure";
import { getAlignOffsetX, getBlockVerticalOffset, getCaretLocalXY, SELECTION_COLOR } from "./editing";
import type { Text, ResolvedTextStyle } from "./index";
import { isGradient, createCanvasGradient } from "@fulate/core";
import type { ShadowOption } from "@fulate/core";

export function resolveColorFill(
  ctx: CanvasRenderingContext2D,
  color: ResolvedTextStyle["color"],
  w: number,
  h: number
): string | CanvasGradient {
  if (isGradient(color)) {
    return createCanvasGradient(ctx, color, w, h);
  }
  return color as string;
}

export function drawTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  font: string,
  letterSpacing: number,
  doFill: boolean,
  doStroke: boolean
) {
  if (!letterSpacing) {
    if (doFill) ctx.fillText(line, x, y);
    if (doStroke) ctx.strokeText(line, x, y);
    return;
  }

  let cx = x;
  for (let i = 0; i < line.length; i++) {
    if (doFill) ctx.fillText(line[i], cx, y);
    if (doStroke) ctx.strokeText(line[i], cx, y);
    cx += getCharWidth(ctx, line[i], font) + letterSpacing;
  }
}

export interface TextDecorationOptions {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  textBaseline: string;
  underline?: boolean;
  strikethrough?: boolean;
  color: string;
  thickness?: number;
}

export function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  opts: TextDecorationOptions
) {
  if (!opts.underline && !opts.strikethrough) return;

  const thickness = opts.thickness ?? Math.max(1, opts.fontSize / 15);
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = thickness;

  if (opts.underline) {
    const underlineY =
      opts.y +
      opts.fontSize * 0.1 +
      (opts.textBaseline === "top" ? opts.fontSize : 0);
    ctx.beginPath();
    ctx.moveTo(opts.x, underlineY);
    ctx.lineTo(opts.x + opts.width, underlineY);
    ctx.stroke();
  }

  if (opts.strikethrough) {
    const strikeY =
      opts.y +
      (opts.textBaseline === "top" ? opts.fontSize * 0.5 : 0);
    ctx.beginPath();
    ctx.moveTo(opts.x, strikeY);
    ctx.lineTo(opts.x + opts.width, strikeY);
    ctx.stroke();
  }
}

export interface TextStrokeOptions {
  line: string;
  x: number;
  y: number;
  font: string;
  letterSpacing: number;
  strokeColor: string | CanvasGradient;
  strokeWidth: number;
}

export function drawTextWithStroke(
  ctx: CanvasRenderingContext2D,
  opts: TextStrokeOptions
) {
  ctx.strokeStyle = opts.strokeColor;
  ctx.lineWidth = opts.strokeWidth;
  ctx.lineJoin = "round";
  drawTextLine(ctx, opts.line, opts.x, opts.y, opts.font, opts.letterSpacing, false, true);
}

export function applyTextShadow(
  ctx: CanvasRenderingContext2D,
  shadow: ShadowOption
) {
  ctx.shadowColor = shadow.color ?? "rgba(0,0,0,0.3)";
  ctx.shadowBlur = shadow.blur ?? 0;
  ctx.shadowOffsetX = shadow.offsetX ?? 0;
  ctx.shadowOffsetY = shadow.offsetY ?? 0;
}

export function clearTextShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

export function paintTextContent(self: Text, ctx: CanvasRenderingContext2D) {
  const style = self.getResolvedTextStyle();
  const font = self.getFontString(style);
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = style.textBaseline;

  const w = self.width || 0;
  const h = self.height || 0;
  const lineHeightPx = style.fontSize * style.lineHeight;
  const intraLine = (lineHeightPx - style.fontSize) / 2;
  const ls = style.letterSpacing ?? 0;

  const blockOffset = getBlockVerticalOffset(h, self._textHeight, style.verticalAlign);

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

  const scrollX = self.isEditing ? self._scrollX : 0;
  if (scrollX !== 0) {
    ctx.translate(-scrollX, 0);
  }

  const lines = self._lines;
  const offsets = self._lineCharOffsets;

  if (self.isEditing && self._textarea) {
    const selStart = self._textarea.selectionStart ?? 0;
    const selEnd = self._textarea.selectionEnd ?? 0;
    if (selStart !== selEnd) {
      const sMin = Math.min(selStart, selEnd);
      const sMax = Math.max(selStart, selEnd);
      ctx.fillStyle = SELECTION_COLOR;
      for (let i = 0; i < lines.length; i++) {
        const lineStart = offsets[i] ?? 0;
        const lineEnd = lineStart + lines[i].length;
        if (sMin >= lineEnd || sMax <= lineStart) continue;

        const sl = Math.max(sMin, lineStart) - lineStart;
        const sr = Math.min(sMax, lineEnd) - lineStart;
        const sx =
          getAlignOffsetX(w, lines[i], ctx, font, style.textAlign) +
          measureStringWidth(ctx, lines[i].slice(0, sl), font, ls);
        const sw = measureStringWidth(ctx, lines[i].slice(sl, sr), font, ls);
        const sy = blockOffset + i * lineHeightPx;
        ctx.fillRect(sx, sy, sw, lineHeightPx);
      }
    }
  }

  const fillStyle = resolveColorFill(ctx, style.color, w, h);
  ctx.fillStyle = fillStyle;

  const ts = style.textShadow;
  const hasTextShadow = !!(ts && ts.color);
  const hasStroke = !!(style.textStrokeColor && style.textStrokeWidth && style.textStrokeWidth > 0);
  const resolvedStrokeColor = hasStroke
    ? (isGradient(style.textStrokeColor) ? createCanvasGradient(ctx, style.textStrokeColor, w, h) : style.textStrokeColor!)
    : "";
  const hasDecoration = style.underline || style.strikethrough;
  const decoColor = hasDecoration
    ? (typeof style.color === "string" ? style.color : (typeof style.textStrokeColor === "string" ? style.textStrokeColor : "#000"))
    : "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineX = getAlignOffsetX(w, line, ctx, font, style.textAlign, ls);
    const lineWidth = hasDecoration ? measureStringWidth(ctx, line, font, ls) : 0;
    const y = startY + i * lineHeightPx + blockOffset + intraLine;

    if (hasTextShadow) {
      applyTextShadow(ctx, ts!);
    }

    if (hasStroke) {
      drawTextWithStroke(ctx, {
        line, x: lineX, y, font, letterSpacing: ls,
        strokeColor: resolvedStrokeColor,
        strokeWidth: style.textStrokeWidth!,
      });
    }

    ctx.fillStyle = fillStyle;
    drawTextLine(ctx, line, lineX, y, font, ls, true, false);

    if (hasTextShadow) {
      clearTextShadow(ctx);
    }

    if (hasDecoration) {
      drawTextDecoration(ctx, {
        x: lineX,
        y,
        width: lineWidth,
        fontSize: style.fontSize,
        textBaseline: style.textBaseline,
        underline: style.underline,
        strikethrough: style.strikethrough,
        color: decoColor,
      });
    }
  }

  if (lines.length === 0 && self.placeholder) {
    ctx.fillStyle = self.placeholderColor || fillStyle;
    const phX = getAlignOffsetX(w, self.placeholder, ctx, font, style.textAlign, ls);
    const phBlockOffset = getBlockVerticalOffset(h, lineHeightPx, style.verticalAlign);
    drawTextLine(ctx, self.placeholder, phX, startY + phBlockOffset + intraLine, font, ls, true, false);
    ctx.fillStyle = fillStyle;
  }

  if (self.isEditing && self._caretVisible && self._textarea) {
    const selStart = self._textarea.selectionStart ?? 0;
    const selEnd = self._textarea.selectionEnd ?? 0;
    if (selStart === selEnd) {
      const { x: cx, y: cy, h: ch } = getCaretLocalXY(self, selStart);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + ch);
      const caretColor = typeof style.color === "string" ? style.color : "#000";
      ctx.strokeStyle = caretColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}
