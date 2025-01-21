import { Expanded } from "./expanded";
import { Constraint, Size } from "./utils/constraint";
import { Element, ElementOptions, Point } from "./base";
import { TypeFn } from "./types";
import { CalcAABB } from "./utils/calc";
import { AlignItems, JustifyContent } from "./types/flex";
import { linkEl } from "./utils/helper";

export interface RowOptions extends ElementOptions {
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Row extends Element {
  type = "row";
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  constructor(options: RowOptions = {}) {
    super(options);
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
  }

  layout(constraint: Constraint) {
    const selfConstraint = constraint.extend(this);
    let childConstraint = selfConstraint.getChildConstraint(this);
    const sizes: Array<Size> = [];

    let maxHeight = 0;

    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      linkEl(child,this)
      if (child.type === "expanded") {
        childConstraint = childConstraint.subHorizontal(
          (child as Expanded).flexBasis
        );
        continue;
      }
      const size = child.layout(childConstraint);
      childConstraint = childConstraint.subHorizontal(size.width);
      maxHeight = Math.max(maxHeight, size.height);
      sizes.push(size);
    }

    const expandedChildren = this.children!.filter(
      (v) => v.type === "expanded"
    ) as Expanded[];

    if (expandedChildren.length) {
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );
      expandedChildren.forEach((v) => {
        const constraint = childConstraint.ratioWidth(v.flex, quantity);
        constraint.maxHeight = Math.max(
          this.height === Number.MAX_VALUE
            ? selfConstraint.maxHeight
            : this.height ?? 0,
          selfConstraint.minHeight,
          maxHeight
        );
        const size = v.layout(constraint);
        maxHeight = Math.max(maxHeight, size.height);
      });
    }
    this.size = selfConstraint.compareSize(
      {
        height: this.height ?? maxHeight
      },
      this
    );

    return CalcAABB(this);
  }

  render(parentPoint = this.parentOrSiblingPoint): Point {
    this.renderBefore(parentPoint!);
    const point = this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);
    const childPoint = this.getPaddingPoint(selfPoint);

    this.layer.ctx.save();
    this.draw(selfPoint);
    const toggleWidth = this.children!.reduce(
      (prev, next) =>
        prev + next.size.width + next.margin.left + next.margin.right,
      0
    );
    switch (this.justifyContent) {
      case "flex-end": {
        childPoint.x += this.size.width - toggleWidth;
        break;
      }
      case "center": {
        const offset = (this.size.width - toggleWidth) / 2;
        childPoint.x += offset;
        break;
      }
    }
    if (this.children?.length) {
      const size = this.size;
      let _point = childPoint;
      const betweenX =
        (this.size.width - toggleWidth) / (this.children!.length - 1);
      let x = 0;
      this.children.forEach((child, index) => {
        switch (this.alignItems) {
          case "center": {
            child.y = (size.height - child.size.height) / 2;
            break;
          }
          case "flex-end": {
            child.y = size.height - child.size.height;
            break;
          }
        }
        if (this.justifyContent === "space-between") {
          child.x = index == 0 ? 0 : (x += betweenX);
        }
        const v = child.render(_point);
        _point = {
          x: v.x + child.size.width + child.margin.right,
          y: childPoint.y
        };
      });
    }
    this.layer.ctx.restore();
    return point;
  }
}

export const row: TypeFn<RowOptions, Row> = (option) => {
  return new Row(option);
};

row.hFull = function (options: RowOptions) {
  const g = row(options);
  g.height = Number.MAX_VALUE;
  return g;
};
