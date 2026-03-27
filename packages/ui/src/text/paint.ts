import { measureStringWidth, getCharWidth } from "./measure";
import { getAlignOffsetX, getBlockVerticalOffset, getCaretLocalXY, SELECTION_COLOR } from "./editing";
import type { Text, ResolvedTextStyle } from "./index";
import { isGradient, createCanvasGradient } from "@fulate/core";

function resolveColorFill(
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

function drawTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  letterSpacing: number,
  textAlign: string,
  font: string,
  doFill: boolean,
  doStroke: boolean
) {
  if (!letterSpacing) {
    if (doFill) ctx.fillText(line, x, y);
    if (doStroke) ctx.strokeText(line, x, y);
    return;
  }

  const totalWidth = measureStringWidth(ctx, line, font, letterSpacing);
  let startX = x;
  if (textAlign === "center") {
    startX = x - totalWidth / 2;
  } else if (textAlign === "right") {
    startX = x - totalWidth;
  }

  const savedAlign = ctx.textAlign;
  ctx.textAlign = "left";
  let cx = startX;
  for (let i = 0; i < line.length; i++) {
    if (doFill) ctx.fillText(line[i], cx, y);
    if (doStroke) ctx.strokeText(line[i], cx, y);
    cx += getCharWidth(ctx, line[i], font) + letterSpacing;
  }
  ctx.textAlign = savedAlign;
}

function getLineLeftX(
  w: number,
  line: string,
  ctx: CanvasRenderingContext2D,
  font: string,
  textAlign: string,
  letterSpacing: number
): number {
  const lineWidth = measureStringWidth(ctx, line, font, letterSpacing);
  if (textAlign === "center") return (w - lineWidth) / 2;
  if (textAlign === "right") return w - lineWidth;
  return 0;
}

export function paintTextContent(self: Text, ctx: CanvasRenderingContext2D) {
  const style = self.getResolvedTextStyle();
  const font = self.getFontString(style);
  ctx.font = font;
  ctx.textAlign = style.textAlign;
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

  // selection highlight (editing mode)
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

  // resolve fill style (solid or gradient)
  const fillStyle = resolveColorFill(ctx, style.color, w, h);
  ctx.fillStyle = fillStyle;

  // text shadow setup
  const ts = style.textShadow;
  const hasTextShadow = !!(ts && ts.color);

  // text stroke setup
  const hasStroke = !!(style.textStrokeColor && style.textStrokeWidth && style.textStrokeWidth > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let x = 0;

    if (style.textAlign === "center") {
      x = w / 2;
    } else if (style.textAlign === "right") {
      x = w;
    }

    const y = startY + i * lineHeightPx + blockOffset + intraLine;

    // apply text shadow for this line
    if (hasTextShadow) {
      ctx.shadowColor = ts!.color ?? "rgba(0,0,0,0.3)";
      ctx.shadowBlur = ts!.blur ?? 0;
      ctx.shadowOffsetX = ts!.offsetX ?? 0;
      ctx.shadowOffsetY = ts!.offsetY ?? 0;
    }

    // stroke first (behind fill)
    if (hasStroke) {
      ctx.strokeStyle = style.textStrokeColor!;
      ctx.lineWidth = style.textStrokeWidth!;
      ctx.lineJoin = "round";
      drawTextLine(ctx, line, x, y, ls, style.textAlign, font, false, true);
    }

    // fill text
    ctx.fillStyle = fillStyle;
    drawTextLine(ctx, line, x, y, ls, style.textAlign, font, true, false);

    // clear shadow after first fill so decorations don't get shadowed
    if (hasTextShadow) {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // underline / strikethrough decorations
    const hasDecoration = style.underline || style.strikethrough;
    if (hasDecoration) {
      const lineWidth = measureStringWidth(ctx, line, font, ls);
      const lineX = getLineLeftX(w, line, ctx, font, style.textAlign, ls);
      const decoThickness = Math.max(1, style.fontSize / 15);
      const colorStr = typeof style.color === "string" ? style.color : (style.textStrokeColor || "#000");

      ctx.strokeStyle = colorStr;
      ctx.lineWidth = decoThickness;

      if (style.underline) {
        const underlineY =
          y +
          style.fontSize * 0.1 +
          (style.textBaseline === "top" ? style.fontSize : 0);
        ctx.beginPath();
        ctx.moveTo(lineX, underlineY);
        ctx.lineTo(lineX + lineWidth, underlineY);
        ctx.stroke();
      }

      if (style.strikethrough) {
        const strikeY =
          y +
          (style.textBaseline === "top" ? style.fontSize * 0.5 : 0);
        ctx.beginPath();
        ctx.moveTo(lineX, strikeY);
        ctx.lineTo(lineX + lineWidth, strikeY);
        ctx.stroke();
      }
    }
  }

  // placeholder
  if (lines.length === 0 && self.placeholder) {
    ctx.fillStyle = self.placeholderColor || fillStyle;

    let phX = 0;
    if (style.textAlign === "center") phX = w / 2;
    else if (style.textAlign === "right") phX = w;

    const phBlockOffset = getBlockVerticalOffset(h, lineHeightPx, style.verticalAlign);
    drawTextLine(ctx, self.placeholder, phX, startY + phBlockOffset + intraLine, ls, style.textAlign, font, true, false);
    ctx.fillStyle = fillStyle;
  }

  // caret (editing mode)
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
