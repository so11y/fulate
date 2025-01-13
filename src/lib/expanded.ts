import { Element } from "./base";

interface ExpandedOptions {
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
  }
}
