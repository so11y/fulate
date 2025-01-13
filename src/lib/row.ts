import { Expanded } from "./expanded";
import { Constraint, Size } from "./utils/constraint";
import { Element, ElementOptions } from "./base";

export interface RowOptions extends ElementOptions {
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Row extends Element implements RowOptions {
  type = "row";

  layout(constraint: Constraint) {
    const selfConstraint = constraint.extend(this);
    let childConstraint = selfConstraint.clone();
    const sizes: Array<Size> = [];

    let maxHeight = 0;
    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        continue;
      }
      const size = child.layout(childConstraint);
      childConstraint = childConstraint.subHorizontal(size.width);
      maxHeight = Math.max(maxHeight, size.height);
      sizes.push(size);
    }

    const expandedChildren = this.children!.filter(
      (v) => v.type === "expanded" && (v as Expanded).flex
    ) as Expanded[];

    if (expandedChildren.length) {
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );
      if (quantity > 0) {
        expandedChildren.forEach((v) => {
          const constraint = childConstraint.ratioWidth(v.flex, quantity);
          if (maxHeight) {
            constraint.minHeight = maxHeight;
          }
          constraint.minWidth = constraint.maxWidth;
          const size = v.layout(constraint);
          maxHeight = Math.max(maxHeight, size.height);
        });
      }
    }

    const rect = sizes.reduce(
      (prev, next) => ({
        width: prev.width + next.width,
        height: prev.height
      }),
      {
        width: 0,
        height: maxHeight
      }
    );

    this.size = selfConstraint.compareSize(rect);

    return this.size;
  }
}
