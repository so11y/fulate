import { Element } from "./base";
import { Column } from "./column";
import { Constraint, Size } from "./utils/constraint";

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

  constructor(options: ExpandedOptions) {
    super(options);
    this.flex = options.flex ?? 1;
    this.flexBasis = options.flexBasis ?? 0;
  }
  layout(constraint: Constraint): Size {
    const selfConstraint = constraint.clone();
    const isColumn = this.parent?.type === "column";
    const isRow = this.parent?.type === "row";
    if (isRow || ((this.parent as Column)?.flexWrap === "wrap")) {
      selfConstraint.maxWidth += this.flexBasis
    } else if (isColumn) {
      selfConstraint.maxHeight += this.flexBasis
    }
    return super.layout(selfConstraint, true);
  }
}

export function expanded(options: ExpandedOptions) {
  return new Expanded(options)
}