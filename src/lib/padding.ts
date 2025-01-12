import { Element } from "./base";
import { Constraint, Size } from "./utils/constraint";

interface PaddingOptions {
  padding?: number | [number, number, number, number];
  child: Element;
}

export class Padding extends Element implements PaddingOptions {
  type = "padding";
  padding: [number, number, number, number];
  child: Element;

  constructor(options: PaddingOptions) {
    super({
      children: [options.child]
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
    const selfConstraint = constraint.subHorizontal(left + right).subVertical(top + bottom)
    const size = this.children![0].layout(selfConstraint);
    this.size = size
    return size
  }

}
