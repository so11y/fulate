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
  visible?: boolean;
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

  update(options?: any) {
    return this.setOptions(options).layer.render();
  }

  render(ctx = this.layer.ctx, forcedDirty = false) {
    const shouldUpdate = forcedDirty || this.isDirty;
    // if (shouldUpdate) {
    //   this.calcOwnMatrix();
    //   this.setCoords();
    //   // this.markDirty(false);
    // }
    if (this.children) {
      for (const child of this.children) {
        child.render(ctx, shouldUpdate);
      }
    }
    this.ditryDone();
  }

  hasPointHint(x: number, y: number): boolean {
    if (this.width === undefined || this.height === undefined) {
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
    return true;
  }

  mounted(): void {
    if (this._pendingOption) {
      this._setOptions(this._pendingOption, false);
      this._pendingOption = {};
    }
    super.mounted();
  }

  //用户调用or覆盖
  setOptions(options?: any, syncCalc = true) {
    return this._setOptions(options, syncCalc);
  }

  //内部调用
  _setOptions(options?: any, syncCalc = true) {
    if (options) {
      this.attrs(options);
      if (options.children) {
        this.removeChild(...(this.children ?? []));
        this.append(...options.children);
      }
      // if (syncCalc) {
        this.markDirty();
      // }
    }
    if (this.hasDirty() && this.isMounted && syncCalc) {
      this.calcOwnMatrix();
      this.setCoords();
    }
    return this;
  }

  //提供给select操作的
  quickSetOptions(options: BaseElementOption) {
    Object.assign(this, options);
    this.markDirty();
    if (this.hasDirty() && this.isMounted) {
      this.calcOwnMatrix();
      this.setCoords();
    }
    return this;
  }
}
