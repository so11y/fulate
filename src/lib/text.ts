import { Element, Point, ElementOptions } from "./base";
import { Constraint, Size } from "./utils/constraint";

export interface TextOptions extends ElementOptions {
  text?: string;
  color?: string;
  font?: {
    style?: string;
    variant?: string;
    weight?: string | number;
    stretch?: string;
    size?: number;
    lineHeight?: number;
    family?: string;
  };
}

export class Text extends Element {
  type = "text";
  text: string;
  font: TextOptions["font"];
  color?: string;
  texts: Array<{ text: string; textMetrics: TextMetrics }> = [];

  setOption(option: TextOptions): void {
    super.setOption(option)
    this.text = option.text ?? this.text ?? "";
    this.font = option.font ?? this.font;
    this.color = option.color ?? this.color;
  }

  layout(constraint: Constraint): Size {
    const selfConstraint = constraint.extend(this);
    this.texts = getWordWraps(this.layer.ctx, constraint.maxWidth, this.text);

    const { fontSize, lineHeight } = this.getFontOptions();

    const size = this.texts.reduce(
      (prev, next) => ({
        width: Math.max(prev.width, next.textMetrics.width),
        height: prev.height + fontSize
      }),
      {
        width: 0,
        height: fontSize * lineHeight - fontSize
      }
    );

    this.size = selfConstraint.compareSize({
      width: size.width,
      height: size.height * lineHeight
    }, this);
    return this.size;
  }

  draw(point: Point): void {
    super.draw(point);
    if (this.font) {
      this.layer.ctx.font = generateFont(this.root.font, this.font);
    }
    const { color, fontSize, lineHeight } = this.getFontOptions();
    const textHeight = fontSize * lineHeight;
    this.layer.ctx.fillStyle = color;
    let top = (textHeight - fontSize) / 2;
    this.texts.forEach((v, index) => {
      this.layer.ctx.fillText(
        v.text,
        point.x,
        textHeight * (index + 1) + point.y - top
      );
    });
  }

  getFontOptions() {
    return {
      lineHeight: this.font?.lineHeight ?? this.root.font!.lineHeight,
      color: this.color ?? this.root.font!.color,
      fontSize: this.font?.size ?? this.root.font!.size
    };
  }
}

export function text(options: TextOptions) {
  return new Text(options)
}

export function generateFont(
  rootFont: TextOptions["font"],
  selfFont?: TextOptions["font"]
) {
  const style = selfFont?.style ?? rootFont?.style;
  const variant = selfFont?.variant ?? rootFont?.variant;
  const stretch = selfFont?.stretch ?? rootFont?.stretch;
  const size = selfFont?.size ?? rootFont?.size;
  const lineHeight = selfFont?.lineHeight ?? rootFont?.lineHeight;
  const family = selfFont?.family ?? rootFont?.family;
  const weight = selfFont?.weight ?? rootFont?.weight;

  // 构建字体字符串
  let fontString = `${style} ${variant} ${weight} ${stretch} ${size}px`;
  if (lineHeight) {
    fontString += `/${lineHeight}`;
  }
  fontString += ` ${family}`;

  return fontString;
}

export function getWordWraps(
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
  text: string
) {
  const splitText = Array.from(text);
  let rows: Array<{
    textMetrics: TextMetrics;
    text: string;
  }> = [];
  let start = 0,
    end = 1;

  while (end < splitText.length) {
    const currentText = splitText.slice(start, end).join("");
    const currentMeasureText = ctx.measureText(currentText);

    if (currentMeasureText.width > maxWidth && end > 1) {
      const selfEnd = end > 1 ? end - 1 : end;
      const rowText = splitText.slice(start, selfEnd).join("");
      start = selfEnd;
      rows.push({
        text: rowText,
        textMetrics: ctx.measureText(rowText)
      });
    }
    end++;
  }

  if (start < end && rows.length) {
    const rowText = splitText.slice(start, end).join("");
    rows.push({
      text: rowText,
      textMetrics: ctx.measureText(rowText)
    });
  } else if (!rows.length && splitText.length) {
    rows.push({
      text,
      textMetrics: ctx.measureText(text)
    });
  }

  return rows;
}
