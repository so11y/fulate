import { AnimationController } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { generateFont, TextOptions } from "./text";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLCanvasElement;
  width: number;
  height: number;
  children?: Element[];
  font?: TextOptions["font"] & {
    color?: string;
  };
}

export class Root extends Element {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  type = "root";
  ac: AnimationController;
  keyMap = new Map<string, Element[]>();
  font: Required<RootOptions["font"]>;
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
    this.font = {
      style: options.font?.style ?? "normal",
      variant: options.font?.variant ?? "normal",
      stretch: options.font?.stretch ?? "normal",
      size: options.font?.size ?? 16,
      lineHeight: options.font?.lineHeight ?? 1.2,
      family: options.font?.family ?? "sans-serif",
      color: options.font?.color ?? "black",
      weight: options.font?.weight ?? "normal"
    };
  }
  render() {
    this.ctx.clearRect(0, 0, this.width!, this.height!);
    const point = this.getLocalPoint();
    this.isDirty = true;
    this.ctx.font = generateFont(this.font);
    // this.ctx.textBaseline ="ideographic"
    super.layout(Constraint.loose(this.width!, this.height!));
    super.render(point);
    this.isDirty = false;
    return point;
  }
}
