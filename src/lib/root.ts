import { Element, ElementOptions } from "./base";
import { Constraint } from "./utils/constraint";

type _ElementOptions = Omit<ElementOptions, "width" | "height"> &
  Required<Pick<ElementOptions, "width" | "height">>;

interface RootOptions extends _ElementOptions {
  el: HTMLCanvasElement;
}

export class Root extends Element {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  type = "root";
  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.el.width = options.width;
    this.el.height = options.height;
    this.ctx = this.el.getContext("2d")!;
  }
  render() {
    const point = this.getLocalPoint();
    this.constraint = new Constraint(this.width!, this.height!);
    this.isDirty = true;
    super.layout();
    super.render(point);
    this.isDirty = false;
    return point;
  }
}
