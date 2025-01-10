import { Element, ElementOptions } from "./base";
import { Constraint, Size } from "./utils/constraint";

interface ExpandedOptions
  extends Omit<ElementOptions, "children" | "x" | "y" | "width" | "height"> {
  flex?: number;
  child: Element;
}

export class Expanded extends Element implements ExpandedOptions {
  type = "expanded";
  flex: number;
  child: Element;

  constructor(options: ExpandedOptions) {
    super({
      ...options,
      children: [options.child]
    });
    this.flex = options.flex ?? 1;
    this.constraint = Constraint.loose(0, 0);
    this.size = new Size(0, 0);
  }

  getLayoutSize() {
    return this.size;
  }
}
