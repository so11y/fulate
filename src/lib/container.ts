import { Element, ElementOptions } from "./base";
import { Margin, MarginOptions } from "./margin";
import { Padding, PaddingOptions } from "./padding";
import { Constraint, Size } from "./utils/constraint";

interface ContainerOptions
  extends Omit<
    ElementOptions & PaddingOptions & MarginOptions,
    "x" | "y" | "width"
  > {
  width?: "auto" | number;
}

export class Container extends Element implements ContainerOptions {
  type = "Container";
  child: Element;
  _options: ContainerOptions;

  constructor(options: ContainerOptions) {
    super({
      key: options.key
    });
    this._options = options;
  }

  appendChild(child: Element): void {
    this.children = this._options.children;
    super.appendChild(child);
  }

  setAttributes(attrs: ElementOptions) {
    super.setAttributes(attrs, this._options);
  }

  layout(constraint: Constraint): Size {
    const selfConstraint = constraint.extend(this);
    let root: Element | undefined;
    let last: Element | undefined;
    if (this._options.margin) {
      last = root = new Margin({ margin: this._options.margin });
    }

    const div = new Element(this._options as ElementOptions);
    div.key = undefined;
    div.width =
      this._options.width === "auto"
        ? undefined
        : this._options.width ?? Number.MAX_VALUE;

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
    this.size = root?.layout(selfConstraint) ?? new Size(0, 0);
    return this.size;
  }
}
