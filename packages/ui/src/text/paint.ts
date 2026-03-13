import { measureStringWidth } from "./measure";
import { getAlignOffsetX, getBlockVerticalOffset, getCaretLocalXY, SELECTION_COLOR } from "./editing";
import type { Text, ResolvedTextStyle } from "./index";

export function paintTextContent(self: Text, ctx: CanvasRenderingContext2D) {
  const style = self.getResolvedTextStyle();
  const font = self.getFontString(style);
  ctx.font = font;
  ctx.fillStyle = style.color;
  ctx.textAlign = style.textAlign;
  ctx.textBaseline = style.textBaseline;

  const w = self.width || 0;
  const h = self.height || 0;
  const lineHeightPx = style.fontSize * style.lineHeight;
  const intraLine = (lineHeightPx - style.fontSize) / 2;

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
          measureStringWidth(ctx, lines[i].slice(0, sl), font);
        const sw = measureStringWidth(ctx, lines[i].slice(sl, sr), font);
        const sy = blockOffset + i * lineHeightPx;
        ctx.fillRect(sx, sy, sw, lineHeightPx);
      }
      ctx.fillStyle = style.color;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let x = 0;

    if (style.textAlign === "center") {
      x = w / 2;
    } else if (style.textAlign === "right") {
      x = w;
    }

    const y = startY + i * lineHeightPx + blockOffset + intraLine;

    ctx.fillText(line, x, y);

    if (style.underline) {
      const lineWidth = measureStringWidth(ctx, line, font);
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

  if (lines.length === 0 && self.placeholder) {
    ctx.fillStyle = self.placeholderColor || style.color;

    let phX = 0;
    if (style.textAlign === "center") phX = w / 2;
    else if (style.textAlign === "right") phX = w;

    const phBlockOffset = getBlockVerticalOffset(h, lineHeightPx, style.verticalAlign);
    ctx.fillText(self.placeholder, phX, startY + phBlockOffset + intraLine);
    ctx.fillStyle = style.color;
  }

  if (self.isEditing && self._caretVisible && self._textarea) {
    const selStart = self._textarea.selectionStart ?? 0;
    const selEnd = self._textarea.selectionEnd ?? 0;
    if (selStart === selEnd) {
      const { x: cx, y: cy, h: ch } = getCaretLocalXY(self, selStart);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + ch);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}
