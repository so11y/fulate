import { Point } from "../../util/point";
import { FulateEvent } from "../eventManage";
import { Transformable, TransformableOptions } from "./transformable";

export interface BaseElementOption extends TransformableOptions {
  backgroundColor?: string | null;
  radius?: number | null;
  cursor?: string;
  visible?: boolean;

  onclick?: (e: FulateEvent) => any;
  onpointermove?: (e: FulateEvent) => any;
  onpointerdown?: (e: FulateEvent) => any;
  onpointerup?: (e: FulateEvent) => any;

  children?: Array<Element>;
}

export const KEYS = new Set([
  "left",
  "top",
  "width",
  "height",
  "angle",
  "scaleX",
  "scaleY",
  "skewX",
  "skewY",
  "originX",
  "originY",
  "backgroundColor",
  "radius",
  "cursor",
  "visible"
]);

export class Element extends Transformable {
  type = "element";

  backgroundColor: string | null = null;
  radius: number | null = null;
  cursor?: string;
  visible: boolean = true;
  declare children: this[];
  declare parent: this;

  _pendingOption: any = {};

  constructor(options?: BaseElementOption) {
    super();
    Object.assign(this._pendingOption, options);
  }

  attrs(
    options: any,
    O: { target?: any; assign?: boolean; KEYS?: Set<string> } = {}
  ): void {
    const { target = this, assign = false, KEYS: K = KEYS } = O;
    const keys = Object.keys(options ?? {});
    const event = keys.filter((v) => v.startsWith("on"));
    if (event.length) {
      event.forEach((key) => this.addEventListener(key.slice(2), options[key]));
    }

    keys.forEach((key) => {
      if (K.has(key)) {
        target[key] = options[key];
      }
    });

    if (assign) {
      Object.assign(this._options, options);
    }
  }

  /**
   * 纯净渲染函数（只负责绘制，不处理数学计算）
   */
  render(ctx = this.layer.ctx) {
    if (!this.visible) return;

    if (this.children) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].render(ctx);
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
    return this.visible;
  }

  mounted(): void {
    if (this._pendingOption) {
      this.setOptions(this._pendingOption, false);
      this._pendingOption = {};
    }
    super.mounted();
  }

  /**
   * 设置选项（标记脏，延迟计算）
   * @param syncCalc 是否立即同步计算（用于需要立即获取坐标的场景）
   */
  setOptions(options?: any, syncCalc = false) {
    if (!options) return this;

    this.attrs(options);

    if (options.children) {
      this.removeChild(...(this.children ?? []));
      this.append(...options.children);
    }

    // 标记脏
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
