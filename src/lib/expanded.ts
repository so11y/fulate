import { Element } from "./base";

interface ExpandedOptions {
  flex?: number;
  child: Element;
  flexBasis?: number;
}

export class Expanded extends Element {
  type = "expanded";
  flex: number;
  flexBasis: number;
  child: Element;
  isBreak = true;

  constructor(options: ExpandedOptions) {
    super({
      ...options,
      children: [options.child]
    });
    this.flex = options.flex ?? 1;
    this.flexBasis = options.flexBasis ?? 0;
  }
}
