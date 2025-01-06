import { Element, ElementOptions, Point } from "./base";
import { Constraint } from "./utils/constraint";

interface GroupOptions extends ElementOptions {
  display?: "flex" | "none";
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
}

export class Group extends Element implements GroupOptions {
  display?: "flex" | "none";
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
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
    const point = this.getWordPoint(parentPoint);
    if (this.flexDirection === "row") {
      const row = new Row(this._options);
      row.parent = this;
      row.root = this.root;
      this.children = [row];
      row.render(point, constraint);
    }
    return {
      point,
      constraint
    };
  }
}

class Row extends Group {
  type = "row"
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
    const point = this.getWordPoint(parentPoint);
    const rect = this.getLayoutRect();
    const rowElements: Row[] = [];

    if (this.flexWrap === "wrap") {
      const rows: Array<Array<Element>> = [];

      const children = this.children!.map((v) => {
        v.root = this.root;
        v.parent = this;
        return v;
      });

      for (let i = 0; i < children!.length; i++) {
        const v = children[i];
        const lastRow = rows[rows.length - 1] || [];
        if (lastRow.length === 0) {
          lastRow.push(v);
          rows.push(lastRow);
          continue;
        }

        const toggleWidth = lastRow.reduce(
          (prev, next) => prev + next.width,
          point.x
        );

        if (toggleWidth + v.width > rect.width) {
          rows.push([v]);
        } else {
          lastRow.push(v);
        }
      }

      for (let index = 0; index < rows.length; index++) {
        const children = rows[index];
        const row = new Row({
          children,
          width: rect.width,
          height: Math.max(...children.map((v) => v.height))
        });
        children.forEach((v) => v.parent = row);
        row.parent = this;
        row.root = this.root;
        rowElements.push(row);
      }

      this.children = rowElements;
      rowElements.reduce((prev, child) => {
        //TODO 这里后面减去高度的约束
        return child.renderBeforeAndRender(prev.point, prev.constraint)
      }, {
        point,
        constraint
      });
    } else {
      this.renderBeforeAndRender(parentPoint, constraint);
    }
    return {
      point,
      constraint
    };
  }
}
