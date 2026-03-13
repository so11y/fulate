import { getCharWidth, measureStringWidth } from "./measure";

export function findWrapIndex(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string
): number {
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += getCharWidth(ctx, text[i], font);
    if (width > maxWidth) return i;
  }
  return text.length;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
  wordWrap: boolean
): { lines: string[]; offsets: number[] } {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split("\n");
  const lines: string[] = [];
  const offsets: number[] = [];
  let globalOffset = 0;

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paragraph = paragraphs[pi];

    if (!wordWrap || maxWidth <= 0) {
      offsets.push(globalOffset);
      lines.push(paragraph);
    } else if (paragraph.length === 0) {
      offsets.push(globalOffset);
      lines.push("");
    } else {
      let localOffset = 0;
      let remainingText = paragraph;
      while (remainingText.length > 0) {
        const wrapIdx = findWrapIndex(ctx, remainingText, maxWidth, font);

        if (wrapIdx === 0) {
          offsets.push(globalOffset + localOffset);
          lines.push(remainingText[0]);
          localOffset += 1;
          remainingText = remainingText.slice(1);
        } else {
          offsets.push(globalOffset + localOffset);
          lines.push(remainingText.slice(0, wrapIdx));
          localOffset += wrapIdx;
          remainingText = remainingText.slice(wrapIdx);
        }
      }
    }

    globalOffset += paragraph.length + (pi < paragraphs.length - 1 ? 1 : 0);
  }

  return { lines, offsets };
}

export function fitLineWithEllipsis(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
  font: string
): string {
  const ellipsis = "...";
  if (maxWidth <= 0) return "";

  const ellipsisWidth = measureStringWidth(ctx, ellipsis, font);
  if (ellipsisWidth > maxWidth) return "";

  const availWidth = maxWidth - ellipsisWidth;
  let width = 0;
  for (let i = 0; i < line.length; i++) {
    width += getCharWidth(ctx, line[i], font);
    if (width > availWidth) {
      return line.slice(0, i) + ellipsis;
    }
  }

  return line + ellipsis;
}
