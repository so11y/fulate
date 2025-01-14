import { Element, ElementOptions } from "./base";
import { Div } from "./div";
import { Margin, MarginOptions } from "./margin";
import { Padding, PaddingOptions } from "./padding";
import { Constraint, Size } from "./utils/constraint";

interface ContainerOptions
  extends Omit<ElementOptions & PaddingOptions & MarginOptions, "x" | "y"> {}

export class Container extends Element implements ContainerOptions {
  type = "Container";
  child: Element;
  _options: ContainerOptions;

  constructor(options: ContainerOptions) {
    super({
      width: options.width ?? Number.MAX_VALUE,
      children: options.child === undefined ? [] : [options.child]
    });
    this._options = options;
  }
  layout(constraint: Constraint): Size {
    let root: Element | undefined;
    let last: Element | undefined;
    console.log(1);
    if (this._options.margin) {
      last = root = new Margin({ margin: this._options.margin });
    }

    const div = new Div(this._options);
    if (last) {
      last.children = [div];
      last = div;
    } else {
      root = last = div;
    }

    if (this._options.padding) {
      const padding = new Padding({ padding: this._options.padding });
      if (last) {
        last.children = [padding];
        last = padding;
      } else {
        root = padding;
      }
    }

    // 处理 child
    if (this._options.child) {
      if (last) {
        last.children = [this._options.child];
      }
    }
    root!.parent = this;
    root!.root = this.root;
    this.children = [root!];
    this.size = root?.layout(constraint) ?? new Size(0, 0);
    return this.size;
  }
}
