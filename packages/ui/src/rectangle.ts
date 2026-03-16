import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { Shape } from "@fulate/core";

export class Rectangle extends Shape {
  type = "rectangle";

  hasPointHint(point: Point): boolean {
    if (!this.visible || this.width === undefined || this.height === undefined) {
      return false;
    }
    const expand = this.getBorderOutset();
    const localPoint = this.getGlobalToLocal(point);

    if (!this.radius) {
      return (
        localPoint.x >= -expand &&
        localPoint.x <= this.width + expand &&
        localPoint.y >= -expand &&
        localPoint.y <= this.height + expand
      );
    }
    if (expand > 0) {
      return Intersection.isPointInRoundRect(
        new Point(localPoint.x + expand, localPoint.y + expand),
        this.width + expand * 2,
        this.height + expand * 2,
        this.radius + expand
      );
    }
    return Intersection.isPointInRoundRect(
      localPoint,
      this.width,
      this.height,
      this.radius
    );
  }
}
