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
  "visible",
]);

export class Element extends Transformable {
  type = "element";

  backgroundColor: string | null = null;
  radius: number | null = null;
  cursor?: string;
  visible?: boolean;
  declare children: Element[];

  _pendingOption: any = {};

  constructor(options?: BaseElementOption) {
    super();
    Object.assign(this._pendingOption, options);
  }

  attrs(
    options: any,
    O: { target?: any; assign?: boolean; KEYS?: Set<string> } = {},
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

  render(ctx = this.layer.ctx) {
    if (this.children) {
      for (const child of this.children) {
        child.render(ctx);
      }
    }
    this.isDirty = false;
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
      this.setOptions(this._pendingOption);
      this._pendingOption = {};
    }
    super.mounted();
  }
}
