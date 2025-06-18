import { Root } from "./root";
import { Constraint, Size } from "./utils/constraint";
import { AnimationController, AnimationType, Tween } from "ac";
import { omit, pick } from "lodash-es";
import { EventManage, CanvasPointEvent, EventName } from "./utils/eventManage";
import { TypeFn } from "./types";
import { JustifyContent, AlignItems } from "./types/flex";
import {
  CalcAABB
  //  calcRotateCorners, quickAABB
} from "./utils/calc";
import { linkEl } from "./utils/helper";
import { MatrixBase } from "./utils/matrixBase";

export interface Point {
  x: number;
  y: number;
}

const NEED_LAYOUT_KYE = ["width", "height", "text"];
const NUMBER_KEY = [
  "width",
  "height",
  "x",
  "y",
  "rotate",
  "translateX",
  "translateY"
];

export interface ElementOptions {
  key?: string;
  x?: number;
  y?: number;
  display?: "block" | "inline";
  boxSizing?: "border-box" | "content-box";
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  zIndex?: number;
  radius?: number | [number, number, number, number];
  overflow?: "hidden" | "visible";
  translateX?: number;
  translateY?: number;
  rotate?: number;
  // centerOffsetX?: number;
  // centerOffsetY?: number;
  // position?: "static" | "absolute" | "relative";
  backgroundColor?: string;
  children?: Element[];
  child?: Element;
  margin?: [top: number, right: number, bottom: number, left: number];
  padding?: [top: number, right: number, bottom: number, left: number];
  cursor?: string;
  flexGrow?: number;
  flexBasis?: number;
}

export class Element extends MatrixBase {
  eventManage = new EventManage(this);
  root: Root;
  // isDirty: boolean = true;
  type = "element";
  x = 0;
  y = 0;
  radius: number | [number, number, number, number] = 0;
  rotate = 0;
  rotateCenter: undefined | Point;
  zIndex = 1;
  margin = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  padding = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  display: "block" | "inline" = "block";
  // justifyContent?: JustifyContent;
  // alignItems?: AlignItems;
  // flexDirection?: "row" | "column";
  flexGrow?: number;
  // flexShrink: number = 0;
  flexBasis?: number;
  width?: number;
  height?: number;
  key?: string;
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: string;
  overflow: "hidden" | "visible" = "visible";
  children?: Element[];
  parent?: Element;
  isMounted = false;
  widthAuto = false;
  cursor?: string;
  ac: AnimationController;
  //如果是container这种内部嵌套的组件
  //因为每次layout会对这些组件进行重建
  //所以这些组件不算是真实的，将会被标记true
  //主动代码new出来的才是false
  isInternal: boolean = false;
  declare size: Size;

  constructor(option?: ElementOptions) {
    super();
    this.setOption(option);
    if (option?.child) {
      this.children = [option.child];
    } else if (option?.children) {
      this.children = option.children;
    }
  }

  setOption(option?: ElementOptions) {
    if (option) {
      this.key = option.key ?? this.key;
      this.width = option.width ?? this.width;
      this.height = option.height ?? this.height;
      this.maxWidth = option.maxWidth ?? this.maxWidth;
      this.maxHeight = option.maxHeight ?? this.maxHeight;
      this.minWidth = option.minWidth ?? this.minWidth;
      this.minHeight = option.minHeight ?? this.minHeight;
      this.backgroundColor = option.backgroundColor ?? this.backgroundColor;
      this.x = option.x ?? this.x;
      this.y = option.y ?? this.y;
      this.display = option.display ?? this.display;
      this.radius = option.radius ?? this.radius;
      this.overflow = option.overflow ?? this.overflow;
      this.rotate = option.rotate ?? this.rotate;
      this.cursor = option.cursor ?? this.cursor;

      this.zIndex = option.zIndex ?? this.zIndex;
      this.flexGrow = option.flexGrow ?? this.flexGrow;
      this.flexBasis = option.flexBasis ?? this.flexBasis;
      // this.position = option.position ?? "static";

      this.margin = option.margin
        ? {
            top: option.margin[0],
            right: option.margin[1],
            bottom: option.margin[2],
            left: option.margin[3]
          }
        : this.margin;

      this.padding = option.padding
        ? {
            top: option.padding[0],
            right: option.padding[1],
            bottom: option.padding[2],
            left: option.padding[3]
          }
        : this.padding;
    }
  }

  getLocalPoint(): Point {
    const { x, y } = this.matrixState.layout;
    return {
      x: this.x + this.margin.left + x,
      y: this.y + this.margin.top + y
    };
  }

  getOutlieSize() {
    const size = this.size;
    return {
      width:
        size.width +
        this.margin.left +
        this.margin.right +
        this.padding.left +
        this.padding.right,
      height:
        size.height +
        this.margin.top +
        this.margin.bottom +
        this.padding.top +
        this.padding.bottom
    };
  }

  previousSibling() {
    if (this.parent?.children) {
      const index = this.parent.children?.findIndex((c) => c === this)!;
      return this.parent.children?.[index - 1];
    }
  }

  getSiblings() {
    return this.parent?.children?.filter((v) => v !== this);
  }

  setAttributes<T extends ElementOptions>(attrs?: T) {
    // if (!attrs) {
    //   if (this.root.useDirtyRect && this.root.dirtyDebugRoot) {
    //     this.root.dirtys.add(this);
    //     this.root.dirtyRender();
    //   }
    //   return;
    // }
    // const target = this;
    // const notAnimateKeys = omit(attrs, NUMBER_KEY);
    // this.setOption(notAnimateKeys);
    // const isLayout = Object.keys(pick(attrs, NEED_LAYOUT_KYE)).length;
    // const numberKeys = pick(attrs, NUMBER_KEY);
    // const acKeys = Object.keys(numberKeys);
    // const notAnimateAndNotLayout = !acKeys.length && !isLayout;
    // // if (this.root.useDirtyRect && notAnimateAndNotLayout) {
    // //   this.root.dirtys.add(this);
    // //   // this.root.dirtyRender();
    // //   return;
    // // }
    // if (notAnimateAndNotLayout) {
    //   this.root.render();
    //   return;
    // }
    // const size = this.size;
    // const selfStart = {
    //   x: target.x,
    //   y: target.y,
    //   width: size.width,
    //   height: size.height,
    //   rotate: target.rotate
    // };
    // const ac = this.ac || this.root.ac;
    // const tween = new Tween(pick(selfStart, acKeys), numberKeys)
    //   .animate(ac)
    //   .builder((value) => {
    //     this.setOption(value);
    //     if (isLayout || !this.root.useDirtyRect) {
    //       this.root.render();
    //     } else {
    //       this.root.dirtys.add(this);
    //       this.root.dirtyRender();
    //     }
    //   });
    // ac.addEventListener(AnimationType.END, () => tween.destroy(), {
    //   once: true
    // });
    // ac.play();
  }

  setRotate(rotate: number, center = this.getLocalCenter()) {
    this.rotate = rotate;
    this.rotateCenter = center;
  }

  appendChild(child: Element) {
    if (!this.children) {
      this.children = [];
    }
    linkEl(child, this);
    this.children.push(child);
    this.root.draw();
    child.mounted();
  }

  removeChild(child: Element) {
    if (!this.children) {
      return;
    }
    child.unmounted();
    this.children = this.children.filter((c) => c !== child);
    this.root.draw();
  }

  setDirty() {
    this.root.layerManager.getLayer(this.zIndex).isDirty = true;
  }

  dirtyCache<T>(callback: (...arg: any[]) => T): T | undefined {
    if (this.root.layerManager.getLayer(this.zIndex).isDirty) {
      return callback();
    }
  }

  layout(constraint: Constraint, isBreak = false): Size {
    this.dirtyCache(() => {
      const selfConstraint = constraint.extend(this);
      const childConstraint = selfConstraint.getChildConstraint(this);
      if (this.children?.length) {
        const rects = this.children!.map((child) => {
          linkEl(child, this);
          return child.layout(childConstraint);
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
        this.size = isBreak ? rect : selfConstraint.compareSize(rect, this);
      } else {
        this.size = selfConstraint.compareSize(this, this);
      }
    });
    return CalcAABB(this);
  }

  calcMatrix() {
    this.dirtyCache(() => {
      const point = this.getLocalPoint();
      const newMatrix = new DOMMatrix().translate(point.x, point.y);
      if (this.parent) {
        newMatrix.preMultiplySelf(this.parent.matrixState.matrix);
      }
      if (this.rotate) {
        const center = this.rotateCenter ?? this.getLocalCenter();
        newMatrix
          .translateSelf(center.x, center.y)
          .rotateSelf(0, 0, this.rotate)
          .translateSelf(-center.x, -center.y);
      }

      this.matrixState.matrix = newMatrix;

      if (this.children?.length) {
        this.children.forEach((child) => child.calcMatrix());
      }
    });
  }

  draw() {
    const ctx = this.root.layerManager.getLayer(this.zIndex).getContext();
    ctx.save();

    const size = this.size;

    ctx.setTransform(
      this.matrixState.matrix.a,
      this.matrixState.matrix.b,
      this.matrixState.matrix.c,
      this.matrixState.matrix.d,
      this.matrixState.matrix.e,
      this.matrixState.matrix.f
    );

    ctx.beginPath();

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }

    if (this.backgroundColor || this.overflow === "hidden") {
      // const roundRectPath = new Path2D();
      // roundRectPath.roundRect(50, 50, 200, 100, 20); // 圆角半径为 20
      ctx.roundRect(0, 0, size.width, size.height, this.radius);
    }

    if (this.backgroundColor) {
      ctx.fill();
    }

    if (this.overflow === "hidden") {
      ctx.clip();
    }
    if (this.children?.length) {
      this.children.forEach((child) => child.draw());
    }
    ctx.restore();
  }

  mounted() {
    if (this.children?.length) {
      const length = this.children.length - 1;
      for (let i = length; i >= 0; i--) {
        const child = this.children[i];
        child.mounted();
      }
    }
    // const provideLocalCtx = this.provideLocalCtx();
    if (
      !this.isMounted
      // && !provideLocalCtx.isInternal
    ) {
      if (this.key) {
        this.root.keyMap.set(this.key, this);
      }
      this.root.quickElements.add(this);
      this.eventManage.mounted();
    }

    if (!this.isMounted && this.eventManage.hasUserEvent) {
      this.root.quickElements.add(this);
    }

    if (!this.isMounted && this.cursor) {
      this.root.cursorElements.add(this);
    }

    this.isMounted = true;
  }

  getBoundingBox() {
    const { width, height } = this.size;

    const corners = [
      new DOMPoint(0, 0), // 左上
      new DOMPoint(width, 0), // 右上
      new DOMPoint(width, height), // 右下
      new DOMPoint(0, height) // 左下
    ];

    const globalCorners = corners.map((corner) =>
      corner.matrixTransform(this.matrixState.matrix)
    );

    // 计算 min/max
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    globalCorners.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      x: minX, // 包围盒左上角 x
      y: minY, // 包围盒左上角 y
      width: maxX - minX, // 包围盒宽度
      height: maxY - minY // 包围盒高度
    };
  }

  hasPointHint(x: number, y: number) {
    const local = this.globalToLocal(x, y);
    const size = this.size;
    return (
      local.x >= 0 &&
      local.x <= size.width &&
      local.y >= 0 &&
      local.y <= size.height
    );
  }

  getLocalCenter() {
    const size = this.size;
    return {
      x: size.width / 2,
      y: size.height / 2
    };
  }

  getGlobalCenter() {
    const localCenter = this.getLocalCenter();
    const point = new DOMPoint(localCenter.x, localCenter.y);
    const transformedPoint = point.matrixTransform(this.matrixState.matrix);
    return {
      x: transformedPoint.x,
      y: transformedPoint.y
    };
  }

  setTransform(x: number, y: number) {
    if (x === 0 && y === 0) return;
    this.x += x;
    this.y += y;
    // this.matrixState.matrix.translateSelf(x, y);
  }

  extendsMatrix(parentMatrix: Element["matrixState"]) {
    this.matrixState.matrix.preMultiplySelf(parentMatrix.matrix);
  }

  hasInView() {
    // const scrollEl = localMatrix.scrollEl as Scroll;
    // if (scrollEl) {
    //   const boxBound = quickAABB(this);
    //   const scrollBox = scrollEl.getBoundingBox();
    //   const inX =
    //     boxBound.x < scrollBox.x + scrollBox.width &&
    //     boxBound.x + boxBound.width > scrollBox.x;
    //   const inY =
    //     boxBound.y < scrollBox.y + scrollBox.height &&
    //     boxBound.y + boxBound.height > scrollBox.y;
    //   return inX && inY;
    // }
    return true;
  }

  unmounted() {
    if (this.key) {
      this.root.keyMap.delete(this.key);
    }
    this.root.quickElements.delete(this);
    this.parent = undefined;
    this.isMounted = false;
    this.eventManage.unmounted();
    if (this.children?.length) {
      this.children.forEach((child) => child.unmounted());
    }
  }

  //@ts-ignore
  addEventListener(
    type: EventName,
    callback: CanvasPointEvent,
    options?: AddEventListenerOptions | boolean
  ): void {
    this.eventManage.hasUserEvent = true;
    //@ts-ignore
    super.addEventListener(type, callback, options);
  }

  //@ts-ignore
  removeEventListener(
    type: EventName,
    callback: CanvasPointEvent,
    options?: AddEventListenerOptions | boolean
  ): void {
    //@ts-ignore
    super.removeEventListener(type, callback, options);
  }

  click = () => {
    this.eventManage.notify("click", {
      target: this,
      x: 0,
      y: 0,
      buttons: 0
    });
  };
}

export const element: TypeFn<ElementOptions, Element> = (
  option?: ElementOptions
) => {
  return new Element(option);
};

element.hFull = function (options: ElementOptions) {
  const g = element(options);
  g.height = Number.MAX_VALUE;
  return g;
};
