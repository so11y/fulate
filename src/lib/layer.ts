import { AnimationController, } from "ac";
import { Element, ElementOptions, Point } from "./base";
import { Constraint, } from "./utils/constraint";
import { generateFont, } from "./text";
import { group } from "./group";

interface LayerOptions extends ElementOptions {
  animationSwitch?: boolean;
  animationTime?: number;
}

export class Layer extends Element {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  type = "layer";
  ac: AnimationController;
  layer: Layer
  constructor(options: LayerOptions) {
    super(options);

    this.children = [
      group({
        flexDirection: "column",
        children: options.children
      })
    ]
    this.el = document.createElement("canvas") as HTMLCanvasElement
    this.el.width = options.width ?? 0;
    this.el.height = options.height ?? 0;
    this.ctx = this.el.getContext("2d")!;
    this.ac = new AnimationController(
      options.animationSwitch ? options.animationTime ?? 300 : 0
    );
    this.layer = this
  }

  render(parentPoint: Point = this.parentOrSiblingPoint) {
    this.renderBefore(parentPoint);
    if (!this.isDirty && this.isMounted) {
      this.root.ctx.drawImage(this.el, parentPoint.x, parentPoint.y);
      return parentPoint
    }
    if (this.isDirty) {
      return parentPoint;
    }
    this.isDirty = true;
    const size = this.size
    this.el.width = 50//size.width;
    this.el.height = 100//size.height;
    this.ctx.clearRect(0, 0, size.width!, size.height!);
    this.ctx.font = generateFont(this.root.font);
    const point = { x: 0, y: 0 } //this.getWordPoint();
    const selfPoint = this.getLocalPoint(point);
    this.draw(point)
    // super.layout(Constraint.loose(size.width, size.height));
    super.render(selfPoint);
    this.root.ctx.drawImage(this.el, parentPoint.x, parentPoint.y);
    this.isDirty = false;
    return parentPoint;
  }
}

export function layer(options: LayerOptions) {
  return new Layer(options);
}
