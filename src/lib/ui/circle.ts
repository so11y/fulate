import { BaseElementOption, Element } from "../node/element";


export class Circle extends Element {
  type = "circle";

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.notInDitry()) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    this.applyTransformToCtx(ctx);

    const w = this.width || 0;
    const h = this.height || 0;
    const r = this.radius ?? Math.min(w / 2, h / 2);
    const cx = w / 2;
    const cy = h / 2;

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }

    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    if (this.backgroundColor) {
      ctx.fill();
    }
    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }
}
