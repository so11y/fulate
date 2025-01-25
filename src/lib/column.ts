import { ElementOptions, Element, Point } from "./base";
import { Expanded } from "./expanded";
import { Row } from "./row";
import { TypeFn } from "./types";
import { AlignItems, JustifyContent } from "./types/flex";
import { CalcAABB } from "./utils/calc";
import { Constraint, Size } from "./utils/constraint";
import { last } from "lodash-es";
import { linkEl } from "./utils/helper";

interface RowTree {
  constraint: Constraint;
  children: Array<{
    child: Element;
    size?: Size;
  }>;
}

export interface ColumnOptions extends ElementOptions {
  flexDirection?: "column";
  flexWrap?: "wrap" | "nowrap";
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
}

export class Column extends Element {
  type = "column";
  flexWrap: "wrap" | "nowrap";
  justifyContent: JustifyContent;
  alignItems?: AlignItems;
  constructor(options: ColumnOptions) {
    super(options);
    this.flexWrap = options.flexWrap ?? "nowrap";
    this.justifyContent = options.justifyContent ?? "flex-start";
    this.alignItems = options.alignItems ?? "flex-start";
  }
  layout(constraint: Constraint) {
    const selfConstraint = constraint.extend(this);
    let childConstraint = selfConstraint.getChildConstraint(this);
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
        linkEl(child, this);
        if (child.type === "expanded") {
          childConstraint.subHorizontal((child as Expanded).flexBasis);
          if (childConstraint.isOverstep) {
            childConstraint = selfConstraint
              .clone()
              .subHorizontal((child as Expanded).flexBasis);
            rows.push({
              constraint: childConstraint,
              children: [
                {
                  child
                }
              ]
            });
          } else {
            lastRow.children.push({
              child
            });
          }
          continue;
        }
        /**
         * 创建一个新的约束让这个节点可以在新的约束内发挥
         * 然后计算返回的尺寸，如果放不下才换行
         */
        const newChildConstraint = selfConstraint.getChildConstraint(this);
        newChildConstraint.maxHeight = childConstraint.maxHeight;

        const size = child.layout(newChildConstraint);

        const prevWidth = childConstraint.maxWidth;
        childConstraint.subHorizontal(size.width);

        if (childConstraint.isOverstep) {
          childConstraint.maxWidth = prevWidth;

          const prevHeight = lastRow.children.reduce(
            (prev, next) => Math.max(prev, next.size?.height ?? 0),
            0
          );

          const constraint = selfConstraint.getChildConstraint(this).sub({
            maxWidth: size.width,
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
          (prev, { size }) => Math.max(prev, size?.height ?? 0),
          0
        );

        if (expandedChildren.length) {
          const quantity = expandedChildren.reduce(
            (prev, child) => prev + child.flex,
            0
          );
          expandedChildren.forEach((v) => {
            let constraint = currentRow.constraint.ratioWidth(v.flex, quantity);
            constraint.maxHeight = rowMaxHeight;
            const size = v.layout(constraint);
            rowMaxHeight = Math.max(rowMaxHeight, size.height);
          });
        }

        const row = new Row({
          justifyContent: this.alignItems
        });
        row.isInternal = true;
        linkEl(row, this);
        const children = currentRow.children.map((v) => {
          linkEl(v.child, row);
          return v.child;
        });
        row.children = children;
        row.size = new Size(selfConstraint.maxWidth, rowMaxHeight);
        rowElements.push(row);
      }
      this.children = rowElements;

      this.size = selfConstraint.compareSize(
        {
          height:
            this.height ??
            this.children.reduce(
              (prev, child) => prev + (child.size?.height ?? 0),
              0
            )
        },
        this
      );
      return CalcAABB(this);
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
          return v;
      }
      const row = new Row({
        justifyContent: this.alignItems,
        children: [v]
      });
      row.isInternal = true;
      linkEl(row, this);
      linkEl(v, row);
      return row;
    });
    this.children = children;
    let maxHeight = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      linkEl(child, this);
      if (child.type === "expanded") {
        childConstraint.subVertical((child as Expanded).flexBasis);
        cols.push({
          child
        });
        continue;
      }
      const size = child.layout(childConstraint);
      maxHeight += size.height;
      childConstraint.subVertical(size.height);
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
        const size = v.layout(constraint);
        maxHeight += size.height;
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
    this.root.ctx.save();
    this.draw(selfPoint);
    const toggleHeight = this.children!.reduce(
      (prev, next) =>
        prev + (next.size.height + next.margin.top + next.margin.bottom),
      this.padding.top + this.padding.bottom
    );
    switch (this.justifyContent) {
      case "flex-end": {
        childPoint.y += this.size.height - toggleHeight;
        break;
      }
      case "center": {
        const offset = (this.size.height - toggleHeight) / 2;
        childPoint.y += offset;
        break;
      }
    }
    if (this.children?.length) {
      let _point = childPoint;
      const betweenX =
        (this.size.height - toggleHeight) / (this.children!.length - 1);
      let y = 0;
      this.children.forEach((child, index) => {
        if (this.justifyContent === "space-between") {
          child.y = index == 0 ? 0 : (y += betweenX);
        }
        const v = child.render(_point);
        _point = {
          x: childPoint.x,
          y: v.y + child.size.height + child.margin.bottom + child.margin.top
        };
      });
    }
    this.root.ctx.restore();
    return point;
  }
}

export const column: TypeFn<ColumnOptions, Row> = (option) => {
  return new Column(option);
};

column.hFull = function (options: ColumnOptions) {
  const g = column(options);
  g.height = Number.MAX_VALUE;
  return g;
};
