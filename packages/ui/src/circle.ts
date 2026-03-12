import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { ShapeOption, Shape } from "@fulate/core";

export class Circle extends Shape {
  type = "circle";

  constructor(options?: ShapeOption & { radius?: number }) {
    super(options);
    this.radius =
      options?.radius ?? Math.min(this.width ?? 0, this.height ?? 0) / 2;
  }

  protected buildPath(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(
      (this.width || 0) / 2,
      (this.height || 0) / 2,
      this.radius,
      0,
      Math.PI * 2
    );
  }

  protected buildBorderPath(ctx: CanvasRenderingContext2D) {
    const half = this.borderWidth / 2;
    const offset = this.borderPosition === "inside" ? -half : half;
    ctx.beginPath();
    ctx.arc(
      (this.width || 0) / 2,
      (this.height || 0) / 2,
      this.radius + offset,
      0,
      Math.PI * 2
    );
  }

  hasPointHint(point: Point) {
    const localPoint = this.getGlobalToLocal(point);
    return Intersection.isPointInCircle(
      localPoint,
      new Point(this.radius, this.radius),
      this.radius
    );
  }
}
