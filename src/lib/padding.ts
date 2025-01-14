import { Element } from "./base";
import { Constraint, Size } from "./utils/constraint";
export interface PaddingOptions {
  padding?: number | [top: number, right: number, bottom: number, left: number];
  child?: Element;
  ignoreIndex?: boolean;
  key?: string;
}

export class Padding extends Element implements PaddingOptions {
  type = "padding";
  padding: [top: number, right: number, bottom: number, left: number];
  child?: Element;

  constructor(options: PaddingOptions) {
    super({
      children: options.child ? [options.child] : undefined
    });
    this.padding = Array.isArray(options.padding)
      ? options.padding
      : options.padding === undefined
        ? [0, 0, 0, 0]
        : [options.padding, options.padding, options.padding, options.padding];
  }

  getWordPoint() {
    const rect = super.getWordPoint();
    const [top, right, bottom, left] = this.padding!;
    return {
      x: rect.x + left,
      y: rect.y + top
    };
  }

  layout(constraint: Constraint): Size {
    const [top, right, bottom, left] = this.padding!;
    const selfConstraint = constraint
      .subHorizontal(left + right)
      .subVertical(top + bottom);
    let childSize = new Size(0, 0);
    if (this.children) {
      childSize = super.layout(selfConstraint); //this.children![0].layout(selfConstraint);
    }
    const selfSize = childSize.add(new Size(left + right, top + bottom));
    this.size = selfSize;
    return selfSize;
  }
}
