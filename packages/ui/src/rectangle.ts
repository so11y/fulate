import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { Shape } from "@fulate/core";

export class Rectangle extends Shape {
  type = "rectangle";

  hasPointHint(point: Point): boolean {
    if (!this.radius) {
      return super.hasPointHint(point);
    }
    const localPoint = this.getGlobalToLocal(point);
    return Intersection.isPointInRoundRect(
      localPoint,
      this.width,
      this.height,
      this.radius
    );
  }
}
