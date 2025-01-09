import { Element, ElementOptions, Point } from "./base";
import { Constraint } from "./utils/constraint";

interface PaddingOptions
  extends Omit<ElementOptions, "children" | "x" | "y" | "width" | "height"> {
  padding?: number | [number, number, number, number];
  child: Element;
}

export class Padding extends Element implements PaddingOptions {
  type = "padding";
  padding: [number, number, number, number];
  child: Element;

  constructor(options: PaddingOptions) {
    super({
      ...options,
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

  render(
    parentPoint: Point = this.parentOrSiblingPoint,
    constraint: Constraint = this.constraint
  ) {
    const width = this.padding![3] + this.padding![1];
    const height = this.padding![0] + this.padding![2];
    return this.renderBeforeAndRender(
      parentPoint,
      constraint.sub(Constraint.from(width, height))
    );
  }
}
