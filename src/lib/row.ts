import { Expanded } from "./expanded";
import { Constraint } from "./utils/constraint";
import { Element, ElementOptions } from "./base";

export interface RowOptions extends ElementOptions {
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Row extends Element implements RowOptions {
  type = "row";

  layout() {
    console.log(this);
    let childConstraint = this.constraint.clone();
    const sizes: Array<Constraint> = [];

    let maxHeight = 0;
    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        continue;
      }
      child.constraint = childConstraint;
      const size = child.layout();
      childConstraint.subHorizontal(size.width);
      maxHeight = Math.max(maxHeight, size.height);
      sizes.push(size);
    }

    const expandedChildren = this.children!.filter(
      (v) => v.type === "expanded" && (v as Expanded).flex
    ) as Expanded[];

    if (expandedChildren.length) {
      sizes.push(childConstraint);
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );
      if (quantity > 0) {
        expandedChildren.forEach((v) => {
          v.constraint = childConstraint.ratioWidth(v.flex, quantity);
          v.layout();
        });
      }
    }
    const rect = sizes.reduce(
      (prev, next) => ({
        width: prev.width + next.width,
        height: Math.max(prev.height, next.height)
      }),
      {
        width: 0,
        height: 0
      }
    );

    const newConstraint = Constraint.from(rect.width, rect.height);

    this.constraint = newConstraint;

    return newConstraint;
  }
}
