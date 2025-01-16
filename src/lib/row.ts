import { Expanded } from "./expanded";
import { Constraint, Size } from "./utils/constraint";
import { Element, ElementOptions, Point } from "./base";

export interface RowOptions extends ElementOptions {
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between";
  alignItems?: "flex-start" | "flex-end" | "center";
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
}

export class Row extends Element {
  type = "row";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" =
    "flex-start";
  alignItems?: "flex-start" | "flex-end" | "center" | undefined;
  constructor(options: RowOptions = {}) {
    super(options);
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
  }

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
        childConstraint = childConstraint
          .subHorizontal((child as Expanded).flexBasis)
          .subHorizontal(child.margin.left + child.margin.right)
          .clone();
        continue;
      }
      const size = child.layout(childConstraint);
      childConstraint = childConstraint
        .subHorizontal(size.width)
        .subHorizontal(child.margin.left + child.margin.right)
        .clone();
      maxHeight = Math.max(
        maxHeight,
        size.height + child.margin.top + child.margin.bottom
      );
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
        maxHeight = Math.max(
          maxHeight,
          size.height + v.margin.top + v.margin.bottom
        );
      });
    }
    if (this.parent?.type === "column") {
      this.size = new Size(selfConstraint.maxWidth, maxHeight);
    } else {
      this.size = new Size(selfConstraint.maxWidth, selfConstraint.maxHeight);
    }
    return this.size;
  }

  render(parentPoint: Point): Point {
    this.renderBefore(parentPoint!);
    const point = this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);

    this.root.ctx.save();
    this.draw(selfPoint);
    const toggleWidth = this.children!.reduce(
      (prev, next) =>
        prev + (next.size.width + next.margin.left + next.margin.right),
      0
    );
    switch (this.justifyContent) {
      case "flex-end": {
        selfPoint.x += this.size.width - toggleWidth;
        break;
      }
      case "center": {
        const offset = (this.size.width - toggleWidth) / 2;
        selfPoint.x += offset;
        break;
      }
    }
    if (this.children?.length) {
      const size = this.size;
      let _point = selfPoint;
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
          y: v.y
        };
      });
    }
    this.root.ctx.restore();
    return point;
  }
}
