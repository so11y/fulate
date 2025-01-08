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
  width: number;
  height: number;
  backgroundColor: string | undefined;
  // position: string = "static";
  children: Element[] | undefined;
  parent?: Element;

  declare parentOrSiblingPoint: Point;
  declare constraint: Constraint;

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
      const sibling = this.previousSibling();
      if (sibling) {
        const siblingRect = sibling.getLayoutRect();
        if (_parent.flexDirection === "column" || _parent.flexWrap === "wrap") {
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
    const rect = this.constraint.small(this.width, this.height);
    return Constraint.from(
      this.width !== Number.MAX_VALUE ? this.width : rect.width,
      this.height !== Number.MAX_VALUE ? this.height : rect.height
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

  render(
    parentPoint: Point = this.parentOrSiblingPoint,
    constraint: Constraint = this.constraint
  ) {
    return this.renderBefore(parentPoint, constraint)._render();
  }

  renderBeforeAndRender(parentPoint: Point, constraint: Constraint) {
    return this.renderBefore(parentPoint, constraint)._render();
  }

  renderBefore(parentPoint: Point, constraint: Constraint) {
    this.parentOrSiblingPoint = parentPoint;
    this.constraint = constraint.clone();
    if (this.children) {
      this.children.map((child) => {
        child.root = this.root;
        child.parent = this;
        return child;
      });
    }
    return this;
  }

  protected _render() {
    const point = this.getWordPoint();
    let constraint = this.getLayoutRect();
    this.root.ctx.save();
    if (this.backgroundColor) {
      this.root.ctx.fillStyle = this.backgroundColor;
      this.root.ctx.fillRect(
        point.x,
        point.y,
        constraint.width,
        constraint.height
      );
    }
    if (this.children) {
      let _point = point;
      this.children.forEach((child) => {
        const v = child.render(_point, constraint);
        if (child.parent?.type === "row") {
          constraint = constraint.subHorizontal(v.constraint.width);
          _point = v.point;
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
