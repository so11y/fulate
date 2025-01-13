import { Element } from "./base";
import { Constraint, Size } from "./utils/constraint";

interface MarginOptions {
  margin?: number | [number, number, number, number];
  child: Element;
}

export class Margin extends Element implements MarginOptions {
  type = "margin";
  margin: [number, number, number, number];
  child: Element;

  constructor(options: MarginOptions) {
    super({
      children: [options.child]
    });
    this.margin = Array.isArray(options.margin)
      ? options.margin
      : options.margin === undefined
      ? [0, 0, 0, 0]
      : [options.margin, options.margin, options.margin, options.margin];
  }

  getWordPoint() {
    const rect = super.getWordPoint();
    const [top, right, bottom, left] = this.margin!;
    return {
      x: rect.x + left,
      y: rect.y + top
    };
  }

  layout(constraint: Constraint): Size {
    const [top, right, bottom, left] = this.margin!;
    const childSize = this.children![0].layout(constraint);
    const selfSize = childSize.add(new Size(left + right, top + bottom));
    this.size = selfSize;
    return selfSize;
  }
}
