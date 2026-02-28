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

  /**
   * 纯净渲染函数（只负责绘制，不处理数学计算）
   */
  paint(ctx = this.layer.ctx) {
    if (!this.visible) return;

    if (this.children) {
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].paint(ctx);
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
