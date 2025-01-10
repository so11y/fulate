import { Root } from "./root";
import { Group } from "./group";
import { Constraint } from "./utils/constraint";
import { AnimationController, AnimationType, Tween } from "ac";
import { omit, pick } from "lodash-es";

export interface Point {
  x: number;
  y: number;
}

const NEED_LAYOUT_KYE = ["width", "height"];
const NUMBER_KEY = ["width", "height", "x", "y"];

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
  key?: string;
  x = 0;
  y = 0;
  width: number | undefined = undefined;
  height: number | undefined = undefined;
  backgroundColor?: string;
  // position: string = "static";
  children: Element[] | undefined;
  parent?: Element;

  declare parentOrSiblingPoint: Point;
  declare constraint: Constraint;

  constructor(option?: ElementOptions) {
    if (option) {
      this.x = option.x ?? 0;
      this.y = option.y ?? 0;
      this.width = option.width ?? undefined;
      this.height = option.height ?? undefined;
      this.backgroundColor = option?.backgroundColor;
      // this.position = option.position ?? "static";
      this.children = option.children;
    }
  }

  get isContainer(): boolean {
    return !!this.children;
  }

  getWordPoint(parentPoint = this.parentOrSiblingPoint!): Point {
    return parentPoint;
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

  getLocalPoint(point?: Point): Point {
    return {
      x: this.x + (point?.x ?? 0),
      y: this.y + (point?.y ?? 0)
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

  setAttributes(attrs: ElementOptions) {
    Object.keys(omit(attrs, NUMBER_KEY)).forEach((key) => {
      this[key] = attrs[key];
    });
    const numberKeys = pick(attrs, NUMBER_KEY);
    const tween = new Tween(pick(this, Object.keys(numberKeys)), numberKeys)
      .animate(this.root.ac)
      .builder((value) => {
        // this.isDirty = true;
        // this.clearDirty();
        Object.keys(value).forEach((key) => {
          this[key] = value[key];
        });
        this.root.render();
      });
    this.root.ac.addEventListener(AnimationType.END, () => tween.destroy(), {
      once: true
    });
    this.root.ac.play();
    //先不做局部清理了
    // this.isDirty = true;
    // const isNeedLayout = NEED_LAYOUT_KYE.some((v) => v in attrs);
    // if (isNeedLayout) {
    //   this.clearDirty();
    // }
    // Object.keys(omit(attrs, NUMBER_KEY)).forEach((key) => {
    //   this[key] = attrs[key];
    // });
    // const numberKeys = pick(attrs, NUMBER_KEY);
    // const tween = new Tween(pick(this, Object.keys(numberKeys)), numberKeys)
    //   .animate(this.ac)
    //   .builder((value) => {
    //     this.isDirty = true;
    //     this.clearDirty();
    //     Object.keys(value).forEach((key) => {
    //       this[key] = value[key];
    //     });
    //     this.layout();
    //     this.render();
    //   });

    // if (isNeedLayout) {
    //   this.root.render();
    //   return;
    // }
    // this.isDirty = true;
    // const tick = () => {
    //   tween.destroy();
    //   this.ac.removeEventListener(AnimationType.END, tick);
    // };
    // this.ac.play();
    // this.ac.addEventListener(AnimationType.END, tick);
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
      const selfPoint = this.getLocalPoint(this.getWordPoint());
      const rect = this.getLayoutRect();
      this.isDirty = false;
      this.root.ctx.save();
      this.root.ctx.clearRect(
        selfPoint.x,
        selfPoint.y,
        rect.width,
        rect.height
      );
      this.root.ctx.restore();
    }
  }

  render(parentPoint: Point = this.parentOrSiblingPoint) {
    return this.renderBefore(parentPoint)._render();
  }

  renderBefore(parentPoint: Point) {
    this.parentOrSiblingPoint = parentPoint;
    if (this.children) {
      this.children.map((child) => {
        child.root = this.root;
        child.parent = this;
        return child;
      });
    }
    return this;
  }

  layout() {
    return this._layout();
  }

  protected _layout(): Constraint {
    let rawConstraint = this.getLayoutRect();
    let constraint = rawConstraint.clone();
    if (this.children) {
      const rects = this.children!.map((child) => {
        child.constraint = constraint.clone();
        child.parent = this;
        child.root = this.root;
        return child.layout();
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
      const newConstraint = Constraint.from(rect.width, rect.height);
      this.constraint = newConstraint;
      return newConstraint;
    }
    return constraint;
  }

  protected _render() {
    const point = this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);
    const rect = this.getLayoutRect();
    this.root.ctx.save();
    if (this.backgroundColor) {
      this.root.ctx.fillStyle = this.backgroundColor;
      this.root.ctx.fillRect(selfPoint.x, selfPoint.y, rect.width, rect.height);
    }
    if (this.children) {
      //绝对定位的和相对定位的时候不会因为修改了自己的xy
      //导致界面其他元素的位置发生变化
      let _point = selfPoint;
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
