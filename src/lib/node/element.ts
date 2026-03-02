import { Intersection } from "../../util/Intersection";
import { Point } from "../../util/point";
import { FulateEvent } from "../eventManage";
import { Transformable, TransformableOptions } from "./transformable";

export interface BaseElementOption<T = Element> extends TransformableOptions {
  key?: string;
  backgroundColor?: string | null;
  radius?: number | null;
  cursor?: string;
  visible?: boolean;
  selectctbale?: boolean;
  silent?: boolean;
  breakDirtyRectCheck?: boolean;

  onclick?: (e: FulateEvent<T>) => any;
  onpointermove?: (e: FulateEvent<T>) => any;
  onpointerdown?: (e: FulateEvent<T>) => any;
  onpointerup?: (e: FulateEvent<T>) => any;

  children?: Array<Element>;
}

export const EVENT_KEYS = [
  "onclick",
  "onpointerdown",
  "onpointermove",
  "onpointerup"
];

export class Element extends Transformable {
  type = "element";

  backgroundColor: string | null = null;
  radius: number | null = null;
  cursor?: string;
  visible: boolean = true;
  selectctbale?: boolean;
  breakDirtyRectCheck = false;
  declare children: this[];
  declare parent: this;

  constructor(options?: BaseElementOption) {
    super();
    if (options) {
      const { children, ...props } = options;
      this.attrs(props);
      if (children) this.children = children as any;
    }
  }

  attrs(options: any, O: { target?: any; assign?: boolean } = {}): void {
    const { target = this, assign = false } = O;

    EVENT_KEYS.forEach((v) => {
      if (options[v]) {
        this.addEventListener(v.slice(2), options[v]);
      }
    });

    Object.assign(target, options);

    if (assign && target !== this._options) {
      Object.assign(this._options, options);
    }
  }

  getDirtyRect() {
    const current = this.getBoundingRect();
    if (!this.lastBoundingRect) return current;

    const minX = Math.min(current.left, this.lastBoundingRect.left);
    const minY = Math.min(current.top, this.lastBoundingRect.top);
    const maxX = Math.max(
      current.left + current.width,
      this.lastBoundingRect.left + this.lastBoundingRect.width
    );
    const maxY = Math.max(
      current.top + current.height,
      this.lastBoundingRect.top + this.lastBoundingRect.height
    );

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  notInDitry() {
    if (
      !this.breakDirtyRectCheck &&
      this.layer.finalDirtyRect &&
      !Intersection.intersectRect(
        this.getBoundingRect(),
        this.layer.finalDirtyRect
      )
    ) {
      return true;
    }
    return false;
  }

  /**
   * 纯净渲染函数（只负责绘制，不处理数学计算）
   */
  paint(ctx = this.layer.ctx) {
    if (!this.visible) return;

    if (this.children) {
      for (let i = 0; i < this.children.length; i++) {
        const child = this.children[i];
        if (child.hasInView()) {
          child.paint(ctx);
        }
      }
    }
  }

  hasPointHint(x: number, y: number): boolean {
    if (
      this.width === undefined ||
      this.height === undefined ||
      !this.visible
    ) {
      return false;
    }

    const point = new Point(x, y);
    const localPoint = this.getGlobalToLocal(point);

    return (
      localPoint.x >= 0 &&
      localPoint.x <= this.width &&
      localPoint.y >= 0 &&
      localPoint.y <= this.height
    );
  }

  hasInView() {
    if (!this.visible || !this.width || !this.height) return false;

    const root = this.root;
    const { x: vx, y: vy, scale } = root.viewport;
    const vw = root.width / scale;
    const vh = root.height / scale;

    const viewLeft = -vx / scale;
    const viewTop = -vy / scale;

    const m = this.ownMatrixCache;

    // 无旋转无skew时，直接用矩阵平移分量做快速判断
    if (m.b === 0 && m.c === 0) {
      const sx = m.a;
      const sy = m.d;
      const left = m.e;
      const top = m.f;
      const w = this.width * Math.abs(sx);
      const h = this.height * Math.abs(sy);

      return (
        left + w > viewLeft &&
        left < viewLeft + vw &&
        top + h > viewTop &&
        top < viewTop + vh
      );
    }

    // 有旋转/skew时走完整包围盒计算
    const { left, top, width, height } = this.getBoundingRect();

    return (
      left + width > viewLeft &&
      left < viewLeft + vw &&
      top + height > viewTop &&
      top < viewTop + vh
    );
  }

  nextTick(fn: () => void): void {
    if (this.layer) {
      this.layer.nextTick(fn);
    } else {
      setTimeout(fn, 0);
    }
  }

  /**
   * 设置选项（标记脏，延迟计算）
   * @param syncCalc 是否立即同步计算（用于需要立即获取坐标的场景）
   */
  setOptions(options?: BaseElementOption, syncCalc = false) {
    if (!options) return this;

    if (options.children && this.isMounted) {
      this.removeChild(...(this.children ?? []));
      this.append(...options.children);
    }

    this.attrs(options);

    this.markDirty();

    if (syncCalc && this.isMounted) {
      super.updateTransform(this.parent ? this.parent.isDirty : false);
    }

    return this;
  }

  setOptionsSync(options?: any) {
    return this.setOptions(options, true);
  }

  /**
   * 快速更新变换属性（用于高频操作如拖拽）
   */
  quickSetOptions(options: BaseElementOption) {
    Object.assign(this, options);
    this.markDirty();
    return this;
  }
}
