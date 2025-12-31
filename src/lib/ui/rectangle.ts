import { Element } from "../base";

export class Rectangle extends Element {
  type = "rectangle";

  render(ctx: CanvasRenderingContext2D = this.layer.ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.setTransform(this.getOwnMatrix());
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }
    ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
    if (this.backgroundColor) {
      ctx.fill();
    }
    super.render(ctx);
    ctx.restore();
  }
}
