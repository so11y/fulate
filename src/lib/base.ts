import { Root } from "./root";
import { Constraint, Size } from "./utils/constraint";
import { AnimationController, AnimationType, Tween } from "ac";
import { omit, pick } from "lodash-es";

export interface Point {
  x: number;
  y: number;
}

const NEED_LAYOUT_KYE = ["width", "height", "rotate", "translate"];
const NUMBER_KEY = ["width", "height", "x", "y", "rotate", "translate"];

export interface ElementOptions {
  key?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  radius?: number | [number, number, number, number];
  overflow?: "hidden" | "visible";
  translate?: [x: number, y: number];
  rotate?: number;
  // position?: "static" | "absolute" | "relative";
  // margin?: number | Array<number>
  backgroundColor?: string;
  ignoreIndex?: boolean
  children?: Element[];
}

export class Element extends EventTarget {
  static index = 0;
  index?;
  root: Root;
  isDirty: boolean = false;
  type = "element";
  key?: string;
  x = 0;
  y = 0;
  radius: number | [number, number, number, number] = 0;
  width: number | undefined = undefined;
  height: number | undefined = undefined;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: string;
  overflow?: "hidden" | "visible";
  translate?: [x: number, y: number];
  rotate?: number;
  // position: string = "static";
  children: Element[] | undefined;
  parent?: Element;
  isMounted = false;
  ac: AnimationController;
  isBreak: boolean = false;
  ignoreIndex?: boolean;

  declare parentOrSiblingPoint: Point;
  declare size: Size;

  constructor(option?: ElementOptions) {
    super();
    if (option) {
      this.key = option.key;
      this.x = option.x ?? 0;
      this.y = option.y ?? 0;
      this.width = option.width ?? undefined;
      this.height = option.height ?? undefined;
      this.maxWidth = option.maxWidth ?? undefined;
      this.maxHeight = option.maxHeight ?? undefined;
      this.minWidth = option.minWidth ?? undefined;
      this.minHeight = option.minHeight ?? undefined;
      this.backgroundColor = option?.backgroundColor;
      this.radius = option.radius ?? 0;
      this.overflow = option.overflow ?? "visible";
      this.translate = option.translate;
      this.rotate = option.rotate;
      this.ignoreIndex = option.ignoreIndex ?? false;
      // this.position = option.position ?? "static";
      this.children = option.children;
      if (this.ignoreIndex === false) {
        this.index = Element.index++;
      }
    }
  }

  get isContainer(): boolean {
    return !!this.children;
  }

  getWordPoint(parentPoint = this.parentOrSiblingPoint!): Point {
    return parentPoint;
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

  setAttributes(attrs: ElementOptions, sourceTarget?: any) {
    const target = sourceTarget ?? this;
    Object.keys(omit(attrs, NUMBER_KEY)).forEach((key) => {
      target[key] = attrs[key];
    });
    const numberKeys = pick(attrs, NUMBER_KEY);

    const size = this.size;
    const selfStart = {
      x: target.x,
      y: target.y,
      width: size.width,
      height: size.height,
      rotate: target.rotate
    };
    const ac = this.ac || this.root.ac;
    const tween = new Tween(
      pick(selfStart, Object.keys(numberKeys)),
      numberKeys
    )
      .animate(ac)
      .builder((value) => {
        // this.isDirty = true;
        // this.clearDirty();
        Object.keys(value).forEach((key) => {
          target[key] = value[key];
        });
        this.root.render();
      });

    ac.addEventListener(AnimationType.END, () => tween.destroy(), {
      once: true
    });
    ac.play();

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
    child.mounted();
  }

  removeChild(child: Element) {
    if (!this.children) {
      return;
    }
    child.unmounted();
    this.children = this.children.filter((c) => c !== child);
    this.root.render();
  }

  clearDirty() {
    if (this.isDirty) {
      const selfPoint = this.getLocalPoint(this.getWordPoint());
      const rect = this.size;
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

  getForSizeConstraint(size: Size) {
    return Constraint.loose(size.width, size.height);
  }

  layout(constraint: Constraint): Size {
    const selfConstraint = constraint.extend(this);
    if (this.children?.length) {
      const rects = this.children!.map((child) => {
        child.parent = this;
        child.root = this.root;
        return child.layout(selfConstraint.clone());
      });
      const rect = rects.reduce(
        (prev, next) =>
        ({
          width: Math.max(prev.width, next.width),
          height: Math.max(prev.height, next.height)
        } as Size),
        new Size(this.width, this.height)
      );
      //允许子元素突破自己的尺寸
      this.size = this.isBreak ? rect : selfConstraint.compareSize(rect);
    } else {
      this.size = selfConstraint.compareSize(this);
    }
    return this.size;
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

  protected _render() {
    const point = this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);
    this.root.ctx.save();
    this.draw(selfPoint);
    if (this.children?.length) {
      let _point = selfPoint;
      this.children.forEach((child) => {
        child.render(_point);
      });
    }
    this.root.ctx.restore();

    return point;
  }

  draw(point: Point) {
    const size = this.size;
    this.root.ctx.beginPath();
    if (this.translate) {
      const [tx, ty] = this.translate;
      this.root.ctx.translate(tx, ty);
    }
    if (this.rotate) {
      const centerX = point.x + size.width / 2;
      const centerY = point.y + size.height / 2;
      this.root.ctx.translate(centerX, centerY);
      this.root.ctx.rotate(this.rotate * (Math.PI / 180));
      this.root.ctx.translate(-centerX, -centerY);
    }
    if (this.backgroundColor) {
      this.root.ctx.fillStyle = this.backgroundColor;
      // const roundRectPath = new Path2D();
      // roundRectPath.roundRect(50, 50, 200, 100, 20); // 圆角半径为 20
      this.root.ctx.roundRect(
        point.x,
        point.y,
        size.width,
        size.height,
        this.radius
      );
      this.root.ctx.fill();
    }

    if (this.overflow === "hidden") {
      this.root.ctx.clip();
    }
  }

  animate(duration: number) {
    if (!this.ac) {
      this.ac = new AnimationController(duration);
    } else {
      this.ac.duration = duration;
    }
    return this;
  }

  mounted() {
    if (!this.isMounted) {
      if (this.key) {
        this.root.keyMap.set(this.key, this);
      }
    }
    if (this.children?.length) {
      this.children.forEach((child) => child.mounted());
    }
    this.isMounted = true;
  }

  unmounted() {
    if (this.key) {
      this.root.keyMap.delete(this.key);
    }
    if (this.children?.length) {
      this.children.forEach((child) => child.unmounted());
    }
  }
}
