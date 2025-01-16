import { ElementOptions, Element, Point } from "./base";
import { Expanded } from "./expanded";
import { Row } from "./row";
import { Constraint, Size } from "./utils/constraint";
import { last } from "lodash-es";

interface RowTree {
  constraint: Constraint;
  children: Array<{
    child: Element;
    size: Size;
  }>;
}

export interface ColumnOptions extends ElementOptions {
  flexDirection?: "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between";
  alignItems?: "flex-start" | "flex-end" | "center";
}

export class Column extends Element {
  type = "column";
  flexWrap: "wrap" | "nowrap";
  justifyContent: "flex-start" | "flex-end" | "center" | "space-between";
  alignItems?: "flex-start" | "flex-end" | "center" | undefined;
  constructor(options: ColumnOptions) {
    super(options);
    //@ts-ignore
    this.flexWrap = options.flexWrap ?? "nowrap";
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
  }
  layout(constraint: Constraint) {
    const selfConstraint = constraint.extend(this);
    let childConstraint = selfConstraint.clone();
    // let totalHeight = 0;
    if (this.flexWrap === "wrap") {
      const rowElements: Element[] = [];
      const rows: Array<RowTree> = [
        {
          constraint: childConstraint,
          children: []
        }
      ];
      for (let i = 0; i < this.children!.length; i++) {
        const lastRow = last(rows);
        const child = this.children![i];
        child.parent = this;
        child.root = this.root;
        if (child.type === "expanded") {
          childConstraint
            .subHorizontal((child as Expanded).flexBasis)
            // .subHorizontal(child.margin.left + child.margin.right)
            .clone();
          lastRow.children.push({
            child
          });
          continue;
        }
        const size = child.layout(childConstraint);

        const prevWidth = childConstraint.maxWidth;
        childConstraint.subHorizontal(size.width);
        // .subHorizontal(child.margin.left + child.margin.right);

        if (childConstraint.isOverstep) {
          childConstraint.maxWidth = prevWidth;

          const prevHeight = lastRow.children.reduce(
            (prev, next) =>
              Math.max(
                prev,
                next.size?.height ??
                  // +  next.child.margin.top +
                  //   next.child.margin.bottom
                  0
              ),
            0
          );

          const constraint = selfConstraint.clone().sub({
            maxWidth: size.width,
            // + child.margin.left + child.margin.right
            maxHeight: prevHeight
          });

          rows.push({
            constraint,
            children: [
              {
                child,
                size
              }
            ]
          });
          childConstraint = constraint;
          continue;
        }

        lastRow.children.push({
          child,
          size
        });
      }

      for (let index = 0; index < rows.length; index++) {
        const currentRow = rows[index];

        const expandedChildren = currentRow.children
          .filter((v) => v.child.type === "expanded")
          .map((v) => v.child) as Expanded[];

        let rowMaxHeight = currentRow.children.reduce(
          (prev, child) =>
            Math.max(
              prev,
              child.size?.height ??
                // + child.child.margin.top +
                //   child.child.margin.bottom
                0
            ),
          0
        );

        if (expandedChildren.length) {
          const quantity = expandedChildren.reduce(
            (prev, child) => prev + child.flex,
            0
          );
          expandedChildren.forEach((v) => {
            let constraint = currentRow.constraint.ratioWidth(v.flex, quantity);
            constraint.maxWidth = constraint.maxWidth + v.flexBasis;
            constraint.maxHeight = rowMaxHeight;
            const size = v.layout(constraint);
            rowMaxHeight = Math.max(
              rowMaxHeight,
              size.height
              // + v.margin.top + v.margin.bottom
            );
          });
        }

        const row = new Row({
          justifyContent: this.alignItems
        });
        row.isInternal = true;
        row.parent = this;
        row.root = this.root;
        const children = currentRow.children.map((v) => {
          v.child.parent = row;
          v.child.root = this.root;
          return v.child;
        });
        row.children = children;
        // row.layout(childConstraint);
        row.size = new Size(selfConstraint.maxWidth, rowMaxHeight);
        // totalHeight += rowMaxHeight;
        rowElements.push(row);
      }
      this.children = rowElements;
      // this.size = new Size(selfConstraint.maxWidth, totalHeight);

      this.size = new Size(selfConstraint.maxWidth, selfConstraint.maxHeight);
      return this.size;
    }

    const cols: Array<{
      child: Element;
      size?: Size;
    }> = [];

    const children = this.children!.map((v) => {
      switch (v.type) {
        case "expanded":
        case "column":
        case "row":
        case "group":
          return v;
      }
      const row = new Row({
        justifyContent: this.alignItems,
        children: [v]
      });
      row.isInternal = true;
      row.parent = this;
      row.root = this.root;
      v.parent = row;
      v.root = this.root;
      return row;
    });
    this.children = children;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        childConstraint.subVertical((child as Expanded).flexBasis);
        // .subVertical(child.margin.top + child.margin.bottom);
        cols.push({
          child
        });
        continue;
      }
      const size = child.layout(childConstraint);
      childConstraint.subVertical(size.height);
      // .subVertical(child.margin.top + child.margin.bottom);
      cols.push({
        child,
        size
      });
    }

    const expandedChildren = cols
      .filter((v) => v.child.type === "expanded")
      .map((v) => v.child) as Expanded[];

    if (expandedChildren.length) {
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );

      expandedChildren.forEach((v) => {
        const constraint = childConstraint.ratioHeight(v.flex, quantity);
        constraint.maxHeight = constraint.maxHeight + v.flexBasis;
        v.layout(constraint);
        cols.push({
          child: v
        });
      });
    }

    this.size = new Size(selfConstraint.maxWidth, selfConstraint.maxHeight);

    return this.size;
  }

  render(parentPoint: Point): Point {
    this.renderBefore(parentPoint!);
    const point = this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);

    this.root.ctx.save();
    this.draw(selfPoint);
    const toggleHeight = this.children!.reduce(
      (prev, next) =>
        prev + (next.size.height + next.margin.top + next.margin.bottom),
      0
    );
    switch (this.justifyContent) {
      case "flex-end": {
        selfPoint.y += this.size.height - toggleHeight;
        break;
      }
      case "center": {
        const offset = (this.size.height - toggleHeight) / 2;
        selfPoint.y += offset;
        break;
      }
    }
    if (this.children?.length) {
      let _point = selfPoint;
      const betweenX =
        (this.size.height - toggleHeight) / (this.children!.length - 1);
      let y = 0;
      this.children.forEach((child, index) => {
        if (this.justifyContent === "space-between") {
          child.y = index == 0 ? 0 : (y += betweenX);
        }
        const v = child.render(_point);
        _point = {
          x: v.x,
          y: v.y + child.size.height
        };
      });
    }
    this.root.ctx.restore();
    return point;
  }
}
