import { Rectangle } from "./ui/rectangle";

export class Layer extends Rectangle {
  type = "layer";
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;
  isRender: boolean;
  constructor(options?: any) {
    super(options);
    this.zIndex = options?.zIndex ?? 1;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
    this.layer = this;
    this.isRender = false;
  }

  mounted() {
    const root = this.root!;
    this.canvasEl.width = root.width!;
    this.canvasEl.height = root.height!;
    this.canvasEl.style.width = root.width! + "px";
    this.canvasEl.style.height = root.height! + "px";
    this.canvasEl.style.position = "absolute";
    this.canvasEl.style.left = "0px";
    this.canvasEl.style.top = "0px";
    this.canvasEl.style.zIndex = this.zIndex.toString();
    root.container.appendChild(this.canvasEl);
    super.mounted();
  }

  render() {
    if (!this.isRender) {
      this.isRender = true;
      Promise.resolve().then(() => {
        this.clear();
        // const vp = this.root?.viewport;
        // this.ctx.setTransform(vp.scale, 0, 0, vp.scale, vp.x, vp.y);
        super.render();
        this.isRender = false;
      });
    }
  }

  clear() {
    // this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.width!, this.height!);
  }
}

export class FullLayer extends Layer {
  clear() {
    // this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.root.width!, this.root.height!);
  }
}
