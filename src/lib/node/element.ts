import { Intersection } from "../../util/Intersection";
import { Point } from "../../util/point";
import { FulateEvent } from "../../util/event";
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
  groupParent?: any;
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
    if (!this._lastBoundingRect) return current;

    const minX = Math.min(current.left, this._lastBoundingRect.left);
    const minY = Math.min(current.top, this._lastBoundingRect.top);
    const maxX = Math.max(
      current.left + current.width,
      this._lastBoundingRect.left + this._lastBoundingRect.width
    );
    const maxY = Math.max(
      current.top + current.height,
      this._lastBoundingRect.top + this._lastBoundingRect.height
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
    if (this.isDirtyPaintChild) return false;
    if (
      !this.breakDirtyRectCheck &&
      this.layer.finalDirtyRects &&
      this.layer.finalDirtyRects.length > 0
    ) {
      const bound = this.getBoundingRect();
      const hit = this.layer.finalDirtyRects.some((r) =>
        Intersection.intersectRect(bound, r)
      );
      if (!hit) return true;
    }
    return false;
  }

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
    this.isDirtyPaintChild = false;
  }

  /** Override to provide custom control points for selection. */
  getControlSchema(): any {
    return null;
  }

  hasPointHint(point: Point): boolean {
    if (!this.visible) {
      return false;
    }
    return super.hasPointHint(point);
  }

  hasInView() {
    if (!this.visible || !this.width || !this.height) return false;

    const root = this.root;
    const { x: vx, y: vy, scale } = root.viewport;
    const vw = root.width / scale;
    const vh = root.height / scale;

    const viewLeft = -vx / scale;
    const viewTop = -vy / scale;

    const m = this._ownMatrixCache;

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

  /**
   * 设置选项（标记脏，延迟计算）
   * @param syncCalc 是否立即同步计算（用于需要立即获取坐标的场景）
   */
  setOptions(options?: BaseElementOption, syncCalc = false) {
    if (!options) return this;

    if (options.children && this.isActiveed) {
      this.children = options.children as any;
      this._afterMutate(this.children);
    }

    this.attrs(options);

    this.markDirty();

    if (syncCalc && this.isActiveed) {
      super.updateTransform(this.parent ? this.parent.isDirty : false);
    }

    return this;
  }

  setOptionsSync(options?: any) {
    return this.setOptions(options, true);
  }

  quickSetOptions(options: BaseElementOption) {
    Object.assign(this, options);
    this.markDirty();
    return this;
  }

  toJson(includeChildren = false): BaseElementOption {
    const json = {
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      angle: this.angle,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      skewX: this.skewX,
      skewY: this.skewY,
      originX: this.originX,
      originY: this.originY,
      visible: this.visible,
      backgroundColor: this.backgroundColor,
      radius: this.radius,
      cursor: this.cursor,
      selectctbale: this.selectctbale,
      silent: this.silent,
      breakDirtyRectCheck: this.breakDirtyRectCheck
    } as any;

    if (includeChildren && this.children && this.children.length > 0) {
      json.children = this.children.map((c) => c.toJson(true)) as any;
    }

    return json;
  }
}
