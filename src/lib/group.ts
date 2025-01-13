import { Element, ElementOptions } from "./base";
import { Column, ColumnOptions } from "./column";
import { Row, RowOptions } from "./row";
import { Constraint, Size } from "./utils/constraint";

export type GroupOptions = ColumnOptions | RowOptions;

export class Group extends Element implements ElementOptions {
  type = "group";
  _options: any;
  constructor(options: GroupOptions) {
    super(options);
    this._options = options;
  }

  appendChild(child: Element): void {
    this.children = this._options.children;
    super.appendChild(child);
  }

  layout(constraint: Constraint) {
    let child;
    if (
      this._options.flexWrap == "wrap" ||
      this._options.flexDirection === "column"
    ) {
      child = new Column(this._options);
    } else {
      child = new Row(this._options);
    }
    child.parent = this;
    child.root = this.root;
    this.children = [child];
    const childSize = super._layout(constraint);
    console.log(constraint);
    this.size = new Size(constraint.maxWidth, childSize.height);
    return this.size;
  }
}
