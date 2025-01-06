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
  isDirty: boolean = true;
  type = "element";
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string | undefined;
  // position: string = "static";
  children: Element[] | undefined;
  parent?: Element;

  declare parentOrSiblingPoint: Point
  declare constraint: Constraint

  constructor(option: ElementOptions) {
    this.x = option.x ?? 0;
    this.y = option.y ?? 0;
    this.width = option.width ?? Number.MAX_VALUE;
    this.height = option.height ?? Number.MAX_VALUE;
    this.backgroundColor = option.backgroundColor;
    // this.position = option.position ?? "static";
    this.children = option.children;
  }

  get isContainer(): boolean {
    return !!this.children;
  }

  getTotalRect(): Point {
    let totalRect = this.getWordPoint();
    if (!this.isContainer) {
      return totalRect;
    }

    if (this.isContainer && this.children) {
      for (const child of this.children) {
        const childRect = child.getTotalRect();
        totalRect = mergeRects(totalRect, childRect);
      }
    }
    return totalRect;
  }

  getWordPoint(parentPoint = this.parentOrSiblingPoint!): Point {
    const localRect = this.getLocalPoint();

    if (this.parent?.type === "expanded" || this.parent?.type === "padding") {
      return parentPoint;
    }

    if (this.parent?.type === "group" || this.parent?.type === "row") {
      const parent = this.parent as any as Group;
      const sibling = this.previousSibling();
      if (sibling) {
        const siblingRect = sibling.getLayoutRect();
        if (parent.flexDirection === "column" || parent.flexWrap === "wrap") {
          return {
            x: parentPoint.x + localRect.x,
            y: parentPoint.y + siblingRect.height
          };
        }
        return {
          x: parentPoint.x + siblingRect.width + localRect.x,
          y: parentPoint.y + localRect.y
        };
      }
    }

    return {
      x: parentPoint.x + localRect.x,
      y: parentPoint.y + localRect.y
    };
  }

  getLayoutRect() {
    return this.constraint.small(this.width, this.height)
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

  render(parentPoint: Point = this.parentOrSiblingPoint, constraint: Constraint = this.constraint) {
    return this.renderBefore(parentPoint, constraint)._render()
  }

  renderBefore(parentPoint: Point, constraint: Constraint) {
    this.parentOrSiblingPoint = parentPoint;
    this.constraint = constraint.clone()
    return this
  }

  renderBeforeAndRender(parentPoint: Point, constraint: Constraint) {
    return this.renderBefore(parentPoint, constraint)._render()
  }

  protected _render() {
    const point = this.getWordPoint();
    let constraint = this.getLayoutRect();
    this.root.ctx.save();
    if (this.backgroundColor) {
      this.root.ctx.fillStyle = this.backgroundColor;
      this.root.ctx.fillRect(point.x, point.y, constraint.width, constraint.height);
    }
    if (this.isContainer && this.children) {
      this.children
        .map((child) => {
          child.root = this.root;
          child.parent = this;
          return child;
        })
        .forEach((child) => {
          const v = child.render(point, constraint)
          if (child.parent?.type === "row") {
            constraint = constraint.subHorizontal(v.constraint.width)
          }
        });
    }
    this.root.ctx.restore();

    return {
      point,
      constraint
    };
  }
}
