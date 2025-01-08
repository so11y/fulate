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
    this._options = options;
  }

  appendChild(child: Element): void {
    this.children = this._options.children;
    super.appendChild(child);
  }

  render(parentPoint: Point, constraint: Constraint) {
    super.renderBefore(parentPoint, constraint);
    const point = this.getWordPoint();
    let child;
    if (this.flexWrap === "wrap" || this.flexDirection === "column") {
      child = new Column(this._options);
    } else {
      child = new Row(this._options);
    }
    child.parent = this;
    child.root = this.root;
    this.children = [child];
    child.render(point, constraint);
    return {
      point,
      constraint
    };
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
  render(parentPoint: Point, constraint: Constraint) {
    /**
     * 感觉这边要效用子元素的layout然后判断是不是放不下在换行
     * 虽然感觉大差不差
     *  */
    super.renderBefore(parentPoint, constraint);
    const point = this.getWordPoint();
    const selfRect = this.getLayoutRect();
    const rowElements: Row[] = [];

    let childConstraint = selfRect.clone();

    if (this.flexWrap === "wrap") {
      const rows: Array<{
        constraint: Constraint;
        children: Array<Element>;
      }> = [
        {
          constraint: childConstraint,
          children: []
        }
      ];

      for (let i = 0; i < this.children!.length; i++) {
        const lastRow = last(rows);
        const child = this.children![i];

        if (child.type === "expanded") {
          lastRow.children.push(child);
          continue;
        }

        child.constraint = childConstraint;
        const childRect = child.getLayoutRect();
        childConstraint.subHorizontal(childRect.width);

        if (childConstraint.isOverstep) {
          const constraint = selfRect.clone().subHorizontal(child.width);
          rows.push({
            constraint,
            children: [child]
          });
          childConstraint = constraint;
          continue;
        }

        lastRow.children.push(child);
      }

      for (let index = 0; index < rows.length; index++) {
        const currentRow = rows[index];

        const expandedChildren = currentRow.children.filter(
          (v) => v.type === "expanded"
        ) as Expanded[];

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

        const row = new Row({
          children: currentRow.children
        });
        row.parent = this;
        row.root = this.root;
        rowElements.push(row);
      }

      this.children = rowElements;
      const c = constraint.clone();
      const { height } = rowElements.reduce(
        (prev, child) => {
          const v = child.render(prev.point, prev.constraint);
          return {
            point: v.point,
            constraint: constraint.subVertical(v.constraint.height),
            height: Math.max(prev.height, v.constraint.height)
          };
        },
        {
          point,
          constraint: c,
          height: 0
        }
      );
      this.height = height;
    }
    return {
      point,
      constraint
    };
  }
}

class Row extends Group {
  type = "row";
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

  render(parentPoint: Point, constraint: Constraint) {
    super.renderBefore(parentPoint, constraint);
    const point = this.getWordPoint();

    let childConstraint = constraint.clone();
    childConstraint.height = 0;

    for (let i = 0; i < this.children!.length; i++) {
      const child = this.children![i];

      if (child.type === "expanded") {
        continue;
      }

      child.constraint = childConstraint;
      const childRect = child.getLayoutRect();
      childConstraint.subHorizontal(childRect.width);
      childConstraint.setMaxHeight(childRect.height);
    }

    constraint.subHorizontal(childConstraint.width);
    constraint.height = childConstraint.height;
    this.height = constraint.height;

    const expandedChildren = this.children!.filter(
      (v) => v.type === "expanded" && (v as Expanded).flex
    ) as Expanded[];

    if (expandedChildren.length && childConstraint.width) {
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
    this.children!.reduce((prev, child) => child.render(prev.point), {
      point
    });

    return {
      point,
      constraint
    };
  }
}
