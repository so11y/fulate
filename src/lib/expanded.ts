import { Element, ElementOptions } from "./base";
import { Constraint } from "./utils/constraint";

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
      width: 0,
      height: 0,
      children: [options.child]
    });
    this.flex = options.flex ?? 1;
    this.constraint = new Constraint(0, 0);
  }

  getLayoutRect() {
    return this.constraint;
  }
}
