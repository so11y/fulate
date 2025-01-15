import { Element } from "./base";
import { Column, ColumnOptions } from "./column";
import { Row, RowOptions } from "./row";
import { Constraint, Size } from "./utils/constraint";

export type GroupOptions = ColumnOptions | RowOptions;

export class Group extends Element {
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
    const selfConstraint = constraint.extend(this);
    let child;
    if (
      this._options.flexWrap == "wrap" ||
      this._options.flexDirection === "column"
    ) {
      child = new Column({
        justifyContent: this._options.justifyContent,
        alignItems: this._options.alignItems,
        children: this._options.children
      });
    } else {
      child = new Row({
        justifyContent: this._options.justifyContent,
        alignItems: this._options.alignItems,
        children: this._options.children
      });
    }
    child.isInternal = true;
    child.parent = this;
    child.root = this.root;
    this.children = [child];
    const childSize = super.layout(constraint);
    this.size = new Size(selfConstraint.maxWidth, childSize.height);
    return this.size;
  }
}
