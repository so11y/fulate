import { Element } from "../node/element";

export class Triangle extends Element {
  type = "triangle";

  paint(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    if (this.notInDitry()) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.setTransform(
      this.root.getViewPointMtrix().multiply(this.getOwnMatrix())
    );

    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }

    const w = this.width || 0;
    const h = this.height || 0;

    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    if (this.backgroundColor) {
      ctx.fill();
    }
    if (this.children?.length) {
      super.paint(ctx);
    }
    ctx.restore();
  }
}
