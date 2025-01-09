import { Element, ElementOptions, Point } from "./base";
import { Expanded } from "./expanded";
import { Constraint } from "./utils/constraint";
import { last } from "lodash-es";

type ColumnOptions = {
  flexDirection?: "column";
};
type RowOptions = {
  flexDirection?: "row";
  flexWrap?: "wrap" | "nowrap";
};

type GroupOptions = (ColumnOptions | RowOptions) & ElementOptions;

export class Group extends Element implements ElementOptions {
  display: "flex" = "flex";
  flexDirection: "row" | "column";
  flexWrap: "wrap" | "nowrap";
  type = "group";
  _options: GroupOptions;
  constructor(options: GroupOptions) {
    super(options);
    this.flexDirection = options.flexDirection ?? "row";
    this.width = Number.MAX_VALUE;
    this.height = Number.MAX_VALUE;
    // @ts-ignore
    this.flexWrap = options.flexWrap ?? "nowrap";
    this._options = options;
  }

  appendChild(child: Element): void {
    this.children = this._options.children;
    super.appendChild(child);
  }

  layout() {
    let child;
    if (this.flexWrap === "wrap" || this.flexDirection === "column") {
      child = new Column(this._options);
    } else {
      child = new Row(this._options);
    }
    child.parent = this;
    child.root = this.root;
    this.children = [child];
    return this._layout();
  }
}

class Column extends Group {
  type = "column";
  constructor(options: GroupOptions) {
    super({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      // @ts-ignore
      flexWrap: options.flexWrap ?? "nowrap",
      flexDirection: "column",
      children: options.children
    });
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
          element: Element;
          rect: Constraint;
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
            element: child
          });
          continue;
        }

        child.constraint = childConstraint;
        const childRect = child.layout();
        childConstraint.subHorizontal(childRect.width);

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
                element: child,
                rect: childRect
              }
            ]
          });
          childConstraint = constraint;
          continue;
        }

        lastRow.children.push({
          element: child,
          rect: childRect
        });
      }
      console.log(1);

      for (let index = 0; index < rows.length; index++) {
        const currentRow = rows[index];

        const expandedChildren = currentRow.children
          .filter((v) => v.element.type === "expanded")
          .map((v) => v.element) as Expanded[];

        const rowMAXHeight = currentRow.children.reduce(
          (prev, child) => Math.max(prev, child.rect?.height ?? 0),
          0
        );

        if (expandedChildren.length) {
          const quantity = expandedChildren.reduce(
            (prev, child) => prev + child.flex,
            0
          );

          if (quantity > 0) {
            expandedChildren.forEach((v) => {
              if (v.flex > 0) {
                v.constraint = currentRow.constraint.ratioWidth(
                  v.flex,
                  quantity
                );
                v.constraint.height = rowMAXHeight;
              }
            });
          }
        }

        const row = new Row();
        row.parent = this;
        row.root = this.root;
        const children = currentRow.children.map((v) => {
          v.element.parent = row;
          v.element.root = this.root;
          return v.element;
        });
        row.children = children;

        row.constraint = Constraint.from(selfRect.width, rowMAXHeight);
        totalHeight = rowMAXHeight;
        rowElements.push(row);
      }
      this.children = rowElements;
      return Constraint.from(selfRect.width, totalHeight);
    }

    const cols: Array<{
      element: Element;
      rect?: Constraint;
    }> = [];

    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        cols.push({
          element: child
        });
        continue;
      }
      child.constraint = childConstraint;
      const childRect = child.layout();
      childConstraint.subVertical(childRect.height);
      cols.push({
        element: child,
        rect: childRect
      });
    }

    const expandedChildren = cols
      .filter((v) => v.element.type === "expanded")
      .map((v) => v.element) as Expanded[];

    if (expandedChildren.length) {
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );

      if (quantity > 0) {
        expandedChildren.forEach((v) => {
          if (v.flex > 0) {
            v.constraint = childConstraint.ratioHeight(v.flex, quantity);
          }
        });
      }
    }

    const rectHight = cols.reduce(
      (prev, next) => {
        const rect = next.rect ?? next.element.getLayoutRect();
        return prev + rect.height;
      },
      expandedChildren.length ? childConstraint.height : 0
    );
    totalHeight += rectHight;
    return Constraint.from(selfRect.width, totalHeight);
  }
}

class Row extends Group {
  type = "row";
  constructor(options: GroupOptions = {}) {
    super({
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      flexDirection: "row",
      children: options.children ?? []
    });
  }

  layout() {
    let childConstraint = this.constraint.clone();
    const rects: Array<Constraint> = [];

    let maxHeight = 0;
    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        continue;
      }
      child.constraint = childConstraint;
      const childRect = child.layout();
      maxHeight = Math.max(maxHeight, childRect.height);
      rects.push(childRect);
    }

    const expandedChildren = this.children!.filter(
      (v) => v.type === "expanded" && (v as Expanded).flex
    ) as Expanded[];

    if (expandedChildren.length && childConstraint.width) {
      rects.push(childConstraint);
      const quantity = expandedChildren.reduce(
        (prev, child) => prev + child.flex,
        0
      );
      if (quantity > 0) {
        expandedChildren.forEach((v) => {
          v.constraint = childConstraint.ratioWidth(v.flex, quantity);
        });
      }
    }
    const rect = rects.reduce(
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

    if (this.width === undefined) {
      this.width = newConstraint.width;
    }
    if (this.height === undefined) {
      this.height = newConstraint.height;
    }

    return newConstraint;
  }
}
