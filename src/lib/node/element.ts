import { Point } from "../../util/point";
import { FulateEvent } from "../eventManage";
import { Transformable } from "./transformable";

export interface BaseElementOption {
  left?: number;
  top?: number;
  angle?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  backgroundColor?: string | null;
  radius?: number | null;
  skewX?: number;
  skewY?: number;
  strokeWidth?: number;
  cursor?: string;
  selectable?: boolean;
  visible?: boolean;

  children?: Array<Element>;

  onclick?: (e: FulateEvent) => any;
  onpointermove?: (e: FulateEvent) => any;
  onpointerdown?: (e: FulateEvent) => any;
  onpointerup?: (e: FulateEvent) => any;
}

export class Element extends Transformable {
  type = "element";

  backgroundColor: string | null = null;
  radius: number | null = null;
  cursor?: string;
  selectable?: boolean;
  visible?: boolean;
  declare children: Element[];

  constructor(options?: BaseElementOption) {
    super();
    this.setOptions(options);
  }

  setOptions(options?: any) {
    if (options) {
      const event = Object.keys(options).filter((v) => v.startsWith("on"));
      event.forEach((key) => this.addEventListener(key.slice(2), options[key]));
    }

    super.setOptions(options);
    return this;
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
}
