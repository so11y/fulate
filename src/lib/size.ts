import { Element, ElementOptions } from "./base";

interface SizeOptions extends Omit<ElementOptions, "children" | "x" | "y"> {
  child: Element;
}

export class Size extends Element implements SizeOptions {
  type = "size";
  padding: [number, number, number, number];
  child: Element;

  constructor(options: SizeOptions) {
    super({
      ...options,
      children: [options.child]
    });
  }
}
