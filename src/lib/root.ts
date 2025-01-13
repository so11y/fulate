import { AnimationController } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLCanvasElement;
  width: number;
  height: number;
  children?: Element[];
}

export class Root extends Element {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  type = "root";
  ac: AnimationController;
  keyMap = new Map<string, Element[]>();
  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.el.width = options.width;
    this.el.height = options.height;
    this.ctx = this.el.getContext("2d")!;
    this.ac = new AnimationController(
      options.animationSwitch ? options.animationTime ?? 300 : 0
    );
  }
  render() {
    this.ctx.clearRect(0, 0, this.width!, this.height!);
    const point = this.getLocalPoint();
    this.isDirty = true;
    super._layout(Constraint.loose(this.width!, this.height!));
    super.render(point);
    this.isDirty = false;
    return point;
  }
}
