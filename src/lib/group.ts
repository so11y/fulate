import { Element, ElementOptions, Point } from "./base";
import { Expanded } from "./expanded";
import { Constraint } from "./utils/constraint";
import { last } from "lodash-es";

interface GroupOptions extends ElementOptions {
  display?: "flex" | "none";
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
}

export class Group extends Element implements GroupOptions {
  display: "flex" | "none";
  flexDirection: "row" | "column";
  flexWrap: "wrap" | "nowrap";
  type = "group";
  _options: GroupOptions;
  constructor(options: GroupOptions) {
    super(options);
    this.display = options.display ?? "none";
    this.flexDirection = options.flexDirection ?? "row";
    this.flexWrap = options.flexWrap ?? "nowrap";
    this.width = Number.MAX_VALUE;
    this.height = Number.MAX_VALUE;
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
      flexDirection: "row",
      flexWrap: options.flexWrap ?? "nowrap",
      display: "flex",
      children: options.children
    });
  }
  layout() {
    const selfRect = this.getLayoutRect();
    const rowElements: Row[] = [];

    let childConstraint = selfRect.clone();

    if (this.flexWrap === "wrap") {
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
          const constraint = selfRect.clone().subHorizontal(child.width!);
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
      let totalHeight = 0;
      for (let index = 0; index < rows.length; index++) {
        const currentRow = rows[index];

        const expandedChildren = currentRow.children
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
                v.constraint = currentRow.constraint.ratioWidth(
                  v.flex,
                  quantity
                );
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
        const rect = currentRow.children.reduce(
          (prev, next) => {
            const rect = next.rect ?? next.element.getLayoutRect();
            return {
              width: prev.width + rect.width,
              height: Math.max(prev.height, rect.height)
            };
          },
          expandedChildren.length
            ? childConstraint
            : {
                width: 0,
                height: 0
              }
        );
        row.constraint = Constraint.from(selfRect.width, rect.height);
        totalHeight += rect.height;
        rowElements.push(row);
      }

      this.children = rowElements;
      return Constraint.from(selfRect.width, totalHeight);
    }
    return selfRect;
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
      flexWrap: options.flexWrap ?? "nowrap",
      display: "flex",
      children: options.children ?? []
    });
  }

  layout() {
    let childConstraint = this.constraint.clone();
    const rects: Array<Constraint> = [];
    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];
      child.parent = this;
      child.root = this.root;
      if (child.type === "expanded") {
        continue;
      }
      child.constraint = childConstraint;
      const childRect = child.layout();
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
