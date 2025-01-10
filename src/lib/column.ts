import { ElementOptions, Element } from "./base";
import { Expanded } from "./expanded";
import { GroupOptions } from "./group";
import { Row } from "./row";
import { Constraint } from "./utils/constraint";
import { last } from "lodash-es";

export interface ColumnOptions extends ElementOptions {
  flexDirection?: "column";
}

export class Column extends Element implements ColumnOptions {
  type = "column";
  flexWrap: "wrap" | "nowrap";
  constructor(options: ColumnOptions) {
    super(options);
    //@ts-ignore
    this.flexWrap = options.flexWrap ?? "nowrap";
  }
  layout() {
    const selfRect = this.getLayoutRect();
    let childConstraint = selfRect.clone();
    let totalHeight = 0;
    if (this.flexWrap === "wrap") {
      const rowElements: Element[] = [];
      const rows: Array<{
        constraint: Constraint;
        children: Array<{
          child: Element;
          size: Constraint;
        }>;
      }> = [
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
          lastRow.children.push({
            child
          });
          continue;
        }

        child.constraint = childConstraint;
        const size = child.layout();
        childConstraint.subHorizontal(size.width);

        if (childConstraint.isOverstep) {
          const prevHeight = lastRow.children.reduce(
            (prev, next) => Math.max(prev, next.rect?.height ?? 0),
            0
          );
          const constraint = selfRect.clone().sub({
            width: child.width!,
            height: prevHeight
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
          .filter(
            (v) => v.child.type === "expanded" && (v.child as Expanded).flex
          )
          .map((v) => v.child) as Expanded[];

        const rowMAXHeight = currentRow.children.reduce(
          (prev, child) => Math.max(prev, child.size?.height ?? 0),
          0
        );

        if (expandedChildren.length) {
          const quantity = expandedChildren.reduce(
            (prev, child) => prev + child.flex,
            0
          );

          if (quantity > 0) {
            expandedChildren.forEach((v) => {
              v.constraint = currentRow.constraint.ratioWidth(v.flex, quantity);
              v.constraint.height = rowMAXHeight;
              //现在不知道这里需要不需要记录，好像是不需要
              v.layout();
            });
          }
        }

        const row = new Row();
        row.parent = this;
        row.root = this.root;
        const children = currentRow.children.map((v) => {
          v.child.parent = row;
          v.child.root = this.root;
          return v.child;
        });
        row.children = children;

        row.constraint = Constraint.from(selfRect.width, rowMAXHeight);
        totalHeight += rowMAXHeight;
        rowElements.push(row);
      }
      this.children = rowElements;
      this.constraint = Constraint.from(selfRect.width, totalHeight);
      return this.constraint;
    }

    const cols: Array<{
      child: Element;
      size?: Constraint;
    }> = [];

    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        cols.push({
          child
        });
        continue;
      }
      child.constraint = childConstraint;
      const size = child.layout();
      childConstraint.subVertical(size.height);
      cols.push({
        child,
        size
      });
    }

    const expandedChildren = cols
      .filter((v) => v.child.type === "expanded" && (v.child as Expanded).flex)
      .map((v) => v.child) as Expanded[];

    if (expandedChildren.length) {
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );

      if (quantity > 0) {
        expandedChildren.forEach((v) => {
          v.constraint = childConstraint.ratioHeight(v.flex, quantity);
          //现在不知道这里需要不需要记录，好像是不需要
          v.layout();
        });
      }
    }

    const rectHight = cols.reduce((prev, next) => {
      const rect = next.size ?? next.child.getLayoutRect();
      return prev + rect.height;
    }, 0);
    this.constraint = Constraint.from(selfRect.width, rectHight);
    return this.constraint;
  }
}
