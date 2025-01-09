import { Root } from "./root";
import { Padding } from "./padding";
import { Group } from "./group";
import { mergeRects } from "./utils/index";
import { Constraint } from "./utils/constraint";

export interface Point {
  x: number;
  y: number;
}

const NEED_LAYOUT_KYE = ["x", "y", "width", "height"];

export interface ElementOptions {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  // position?: "static" | "absolute" | "relative";
  // margin?: number | Array<number>
  backgroundColor?: string;
  children?: Element[];
}

export class Element {
  root: Root;
  isDirty: boolean = false;
  type = "element";
  x: number;
  y: number;
  width: number | undefined;
  height: number | undefined;
  backgroundColor: string | undefined;
  // position: string = "static";
  children: Element[] | undefined;
  parent?: Element;

  declare parentOrSiblingPoint: Point;
  declare constraint: Constraint;

  constructor(option: ElementOptions) {
    this.x = option.x ?? 0;
    this.y = option.y ?? 0;
    this.width = option.width ?? undefined;
    this.height = option.height ?? undefined;
    this.backgroundColor = option.backgroundColor;
    // this.position = option.position ?? "static";
    this.children = option.children;
  }

  get isContainer(): boolean {
    return !!this.children;
  }

  getWordPoint(parentPoint = this.parentOrSiblingPoint!): Point {
    const localRect = this.getLocalPoint();
    const parent = this.parent;
    if (parent?.type === "padding") {
      return parentPoint;
    }

    if (
      parent?.type === "group" ||
      parent?.type === "row" ||
      parent?.type === "column"
    ) {
      const _parent = parent as any as Group;
      // const sibling = this.previousSibling();
      // if (sibling) {
      // const siblingRect = sibling.getLayoutRect();
      if (_parent.flexDirection === "column" || _parent.flexWrap === "wrap") {
        return {
          x: parentPoint.x + localRect.x,
          y: parentPoint.y //+ siblingRect.height
        };
      }
      return {
        x: parentPoint.x + localRect.x, //+ siblingRect.width,
        y: parentPoint.y + localRect.y
      };
      // }
    }

    return {
      x: parentPoint.x + localRect.x,
      y: parentPoint.y + localRect.y
    };
  }

  getLayoutRect() {
    return Constraint.from(
      this.width === undefined || this.width === Number.MAX_VALUE
        ? this.constraint.width
        : this.width,
      this.height === undefined || this.height === Number.MAX_VALUE
        ? this.constraint.height
        : this.height
    );
  }

  getLocalPoint(): Point {
    return {
      x: this.x,
      y: this.y
    };
  }

  previousSibling() {
    if (this.parent?.isContainer) {
      const index = this.parent.children?.findIndex((c) => c === this)!;
      return this.parent.children?.[index - 1];
    }
  }

  getSiblings() {
    return this.parent?.children?.filter((v) => v !== this);
  }

  setAttributes(attrs: any) {
    this.isDirty = true;
    const isNeedLayout = NEED_LAYOUT_KYE.some((v) => {
      return !!this[v];
    });
    if (!isNeedLayout) {
      this.clearDirty();
    }
    Object.keys(attrs).forEach((key) => {
      this[key] = attrs[key];
    });

    if (isNeedLayout) {
      this.root.render();
      return;
    }

    this.render();
  }

  appendChild(child: Element) {
    if (!this.children) {
      this.children = [];
    }
    child.parent = this;
    child.root = this.root;
    this.children.push(child);
    this.root.render();
  }

  removeChild(child: Element) {
    if (!this.children) {
      return;
    }
    this.children = this.children.filter((c) => c !== child);
    this.root.render();
  }

  clearDirty() {
    if (this.isDirty) {
      const point = this.getWordPoint();
      const rect = this.getLayoutRect();
      this.isDirty = false;
      this.root.ctx.save();
      this.root.ctx.clearRect(point.x, point.y, rect.width, rect.height);
      this.root.ctx.restore();
    }
  }

  render(parentPoint: Point = this.parentOrSiblingPoint) {
    return this.renderBefore(parentPoint)._render();
  }

  renderBeforeAndRender(parentPoint: Point) {
    return this.renderBefore(parentPoint)._render();
  }

  renderBefore(parentPoint: Point) {
    this.parentOrSiblingPoint = parentPoint;
    if (this.children) {
      this.children.map((child) => {
        child.root = this.root;
        child.parent = this;
        if (!child.constraint) {
          child.constraint = this.constraint.clone();
        }
        return child;
      });
    }
    return this;
  }

  layout() {
    return this._layout();
  }

  _layout(): Constraint {
    let rawConstraint = this.getLayoutRect();
    let constraint = rawConstraint.clone();
    if (this.children) {
      const rects = this.children!.map((child) => {
        child.constraint = constraint.clone();
        child.parent = this;
        child.root = this.root;
        const v = child.layout();
        if (child.parent?.type === "row") {
          constraint = constraint.subHorizontal(v.width);
        }
        return v;
      });
      const rect = rects.reduce(
        (prev, next) => ({
          width: Math.max(prev.width, next.width),
          height: Math.max(prev.height, next.height)
        }),
        {
          width: this.width ?? 0,
          height: this.height ?? 0
        }
      );
      if (this.width === undefined) {
        this.width = rect.width;
      }
      if (this.height === undefined) {
        this.height = rect.height;
      }
      return this.getLayoutRect();
    }
    return constraint;
  }

  protected _render() {
    const point = this.getWordPoint();
    const rect = this.getLayoutRect();
    this.root.ctx.save();
    if (this.backgroundColor) {
      this.root.ctx.fillStyle = this.backgroundColor;
      this.root.ctx.fillRect(point.x, point.y, rect.width, rect.height);
    }
    if (this.children) {
      let _point = point;
      this.children.forEach((child) => {
        const v = child.render(_point);
        if (child.parent?.type === "row" || child.parent?.type === "column") {
          const c = child.getLayoutRect();
          _point = {
            x: child.parent?.type === "row" ? v.x + c.width : v.x,
            y: child.parent?.type === "row" ? v.y : v.y + c.height
          };
        }
      });
    }
    this.root.ctx.restore();

    return point;
  }
}
