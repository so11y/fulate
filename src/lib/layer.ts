import { BaseElementOption } from "./node/element";
import { Rectangle } from "./ui/rectangle";

export class Layer extends Rectangle {
  type = "layer";
  canvasEl: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zIndex: number;

  private isRender: boolean = false;

  constructor(options?: BaseElementOption & { zIndex?: number }) {
    super(options);
    this.zIndex = options?.zIndex ?? 1;
    this.canvasEl = document.createElement("canvas");
    this.ctx = (this.canvasEl as HTMLCanvasElement).getContext("2d")!;
    this.layer = this;
    this.isRender = false;
  }

  get _width() {
    return this.width ?? this.root.width!;
  }

  get _height() {
    return this.height ?? this.root.height!;
  }

  mounted() {
    super.mounted();
    const root = this.root!;
    this.canvasEl.width = this._width;
    this.canvasEl.height = this._height;
    this.canvasEl.style.width = this._width + "px";
    this.canvasEl.style.height = this._height! + "px";
    this.canvasEl.style.position = "absolute";
    this.canvasEl.style.left = "0px";
    this.canvasEl.style.top = "0px";
    this.canvasEl.style.zIndex = this.zIndex.toString();
    root.container.appendChild(this.canvasEl);
  }

  markChildDirty() {
    this.requestRender();
  }

  requestRender() {
    if (this.isRender) return;
    this.isRender = true;

    requestAnimationFrame(() => {
      this.updateTransform(false);
      this.clear();
      super.render(this.ctx);
      this.isRender = false;
    });
  }

  render() {
    this.requestRender();
  }

  clear() {
    // this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this._width!, this._height!);
  }
}
