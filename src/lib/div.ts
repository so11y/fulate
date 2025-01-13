import { Element, ElementOptions } from "./base";

interface DivOptions extends Omit<ElementOptions, "x" | "y"> {
  child?: Element;
  children?: Element[];
}

export class Div extends Element implements DivOptions {
  type = "div";
  child: Element;

  constructor(options: DivOptions = {}) {
    super({
      ...options,
      width: options.width ?? Number.MAX_VALUE,
      children: options.children
        ? options.children
        : options.child === undefined
        ? []
        : [options.child]
    });
  }
}
