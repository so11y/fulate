import { Element } from "./base";
import { Constraint, Size } from "./utils/constraint";

export interface MarginOptions {
  margin?: number | [top: number, right: number, bottom: number, left: number];
  child?: Element;
  key?: string;
}

export class Margin extends Element implements MarginOptions {
  type = "margin";
  margin: [top: number, right: number, bottom: number, left: number];
  child: Element;

  constructor(options: MarginOptions) {
    super({
      children: options.child ? [options.child] : []
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
    let childSize = new Size(0, 0);
    if (this.children) {
      childSize = super.layout(constraint);
    }
    const selfSize = childSize.add(new Size(left + right, top + bottom));
    this.size = selfSize;
    return selfSize;
  }
}
