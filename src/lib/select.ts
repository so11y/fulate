//@ts-nocheck
import { makeBoundingBoxFromPoints, Point } from "../util/point";
import {
  degreesToRadians,
  radiansToDegrees
} from "../util/radiansDegreesConversion";
import { BaseElementOption, Element } from "./base";
import { Layer } from "./layer";

const size = 8; // 控制点尺寸

interface Control {
  type: string;
  actionName: string;
  cursor: string;
  x: number;
  y: number;
  offsetY?: number;
  offsetX?: number;
}

const controls: Array<Control> = [
  {
    type: "tl",
    actionName: "scale",
    cursor: "crosshair",
    x: 0,
    y: 0
  },
  {
    type: "tr",
    actionName: "scale",
    cursor: "crosshair",
    x: 1,
    y: 0
  },
  {
    type: "br",
    actionName: "scale",
    cursor: "crosshair",
    x: 1,
    y: 1
  },
  {
    type: "bl",
    actionName: "scale",
    cursor: "crosshair",
    x: 0,
    y: 1
  },
  // {
  //     type: "mb",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0,
  //     y: 0.5
  // },
  // {
  //     type: "ml",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: -0.5,
  //     y: 0
  // },
  // {
  //     type: "mr",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0.5,
  //     y: 0
  // },
  // {
  //     type: "mt",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0,
  //     y: -0.5
  // },
  {
    type: "mtr",
    actionName: "rotate",
    cursor: "crosshair",
    x: 0.5,
    y: 0,
    offsetY: -40,
    rotateObjectWithSnapping(
      eventData,
      { target, ex, ey, theta, originX, originY },
      x,
      y
    ) {
      const pivotPoint = target.translateToGivenOrigin(
        target.getRelativeCenterPoint(),
        originX,
        originY
      );
      // if (isLocked(target, "lockRotation")) {
      //     return false;
      // }
      const lastAngle = Math.atan2(ey - pivotPoint.y, ex - pivotPoint.x),
        curAngle = Math.atan2(y - pivotPoint.y, x - pivotPoint.x);
      let angle = radiansToDegrees(curAngle - lastAngle + theta);
      if (target.snapAngle && target.snapAngle > 0) {
        const snapAngle = target.snapAngle,
          snapThreshold = target.snapThreshold || snapAngle,
          rightAngleLocked = Math.ceil(angle / snapAngle) * snapAngle,
          leftAngleLocked = Math.floor(angle / snapAngle) * snapAngle;
        if (Math.abs(angle - leftAngleLocked) < snapThreshold) {
          angle = leftAngleLocked;
        } else if (Math.abs(angle - rightAngleLocked) < snapThreshold) {
          angle = rightAngleLocked;
        }
      }
      if (angle < 0) {
        angle = 360 + angle;
      }
      angle %= 360;
      // const hasRotated = target.angle !== angle;
      return angle;
    },
    callback(selectEL: Select, point: Point, theta: number, event: MouseEvent) {
      const constraint = selectEL.getWorldCenterPoint();

      const angle = this.rotateObjectWithSnapping(
        event,
        {
          target: selectEL,
          ex: point.x,
          ey: point.y,
          originX: selectEL.originX,
          originY: selectEL.originY,
          theta
        },
        event.detail.x,
        event.detail.y
      );

      const angleDelta = angle - selectEL.angle;

      const rotationMatrix = new DOMMatrix()
        .translate(constraint.x, constraint.y)
        .rotate(0, 0, angleDelta)
        .translate(-constraint.x, -constraint.y);

      selectEL.selectEls.forEach((child: Element, index) => {
        const childWorldCenter = child.getWorldCenterPoint();
        child
          .setOptions({
            angle: child.angle + angleDelta
          })
          .setPositionByOrigin(childWorldCenter.matrixTransform(rotationMatrix))
          .layer.render();
      });

      selectEL
        .setOptions({
          angle
        })
        .render();
    }
  }
] as const;

export class Select extends Layer {
  constructor() {
    super({
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      width: 0,
      height: 0,
      originX: "center",
      originY: "center"
    });
    this.selectEls = [];
    this.ControlSize = 8;
    this.eventManage.hasUserEvent = true;
  }

  mounted() {
    const checkElementIntersects = (object: Element) => {
      const [{ point: tl }, , { point: br }] = this.getCoords();
      if (
        !object.selectable &&
        !object.visible &&
        (object.intersectsWithRect(tl, br) ||
          object.isContainedWithinRect(tl, br) ||
          object.containsPoint(tl) ||
          object.containsPoint(br))
      ) {
        return object;
      }
    };

    const handleSelect = (e) => {
      this.selectEls = [];
      const directEl = this.root.children?.filter((v) => v !== this);
      const startPoint = new Point(e.detail.x, e.detail.y);
      this.setOptions({
        left: startPoint.x,
        top: startPoint.y,
        width: 0,
        height: 0,
        angle: 0
      }).render();

      const selectEls = new Set(
        [directEl.find(checkElementIntersects)].filter(Boolean)
      );

      let hasMove = false;
      const pointermove = (e: PointerEvent) => {
        hasMove = true;
        const endPoint = new Point(e.detail.x, e.detail.y);
        this.setOptions({
          left: Math.min(startPoint.x, endPoint.x),
          top: Math.min(startPoint.y, endPoint.y),
          width: Math.abs(endPoint.x - startPoint.x),
          height: Math.abs(endPoint.y - startPoint.y)
        }).render();
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          this.root.removeEventListener("pointermove", pointermove);
          if (hasMove) {
            const [{ point: tl }, , { point: br }] = this.getCoords();
            directEl
              ?.filter(checkElementIntersects)
              .forEach((child) => selectEls.add(child));
          }
          this.selectEls = Array.from(selectEls);
          const rect = makeBoundingBoxFromPoints(
            this.selectEls?.map((v) => v.coords).flat(1)
          );
          this.setOptions(rect).render();
        },
        {
          once: true
        }
      );
    };

    const handleControl = (e) => {
      const { control, point } = this.currentControl;
      const theta = degreesToRadians(this.angle ?? 0);
      const pointermove = (e: PointerEvent) => {
        const endPoint = new Point(e.detail.x, e.detail.y);
        control.callback(this, point, theta, e);
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => this.root.removeEventListener("pointermove", pointermove),
        {
          once: true
        }
      );
    };

    const handleSelectMove = (e) => {
      const startPoint = new Point(e.detail.x, e.detail.y);

      const originalSelectLeft = this.left;
      const originalSelectTop = this.top;

      const snapshots = this.selectEls.map((child: any) => {
        const wc = child.getWorldCenterPoint();
        return { child, worldCenter: wc };
      });

      const pointermove = (ev: PointerEvent) => {
        const current = new Point(ev.detail.x, ev.detail.y);
        const dx = current.x - startPoint.x;
        const dy = current.y - startPoint.y;

        const targets = snapshots.map(({ child, worldCenter }) => {
          return {
            child,
            targetWorld: new Point(worldCenter.x + dx, worldCenter.y + dy)
          };
        });

        for (const { child, targetWorld } of targets) {
          child
            .setPositionByOrigin(targetWorld, child.originX, child.originY)
            .layer.render();
        }
        this.setOptions({
          left: originalSelectLeft + dx,
          top: originalSelectTop + dy
        }).layer.render();
      };

      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => this.root.removeEventListener("pointermove", pointermove),
        { once: true }
      );
    };

    const pointerdown = (e: PointerEvent) => {
      if (!this.currentControl) {
        if (this.selectEls.length && this.root.currentElement === this) {
          handleSelectMove(e);
        } else {
          handleSelect(e);
        }
      } else {
        handleControl(e);
      }
    };

    this.root.addEventListener("pointerdown", pointerdown);

    this.unmounted = () => {
      this.root.removeEventListener("pointerdown", pointerdown);
      super.unmounted();
    };

    super.mounted();
  }

  render() {
    this.clear();
    if (!this.width || !this.height) {
      return;
    }
    super.render();
    if (this.selectEls.length) {
      const coords = this.getCoords();
      coords.forEach(({ point, control }) =>
        this.drawControlPoint(this.ctx, point, control)
      );
    }
  }

  drawControlPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    control: (typeof controls)[0]
  ) {
    ctx.save();
    if (control.type === "mtr") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.ControlSize - 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4757";
      ctx.fill();
    } else {
      ctx.beginPath();
      this.drawRoundedRect(
        ctx,
        point.x - this.ControlSize / 2,
        point.y - this.ControlSize / 2,
        this.ControlSize,
        this.ControlSize
      );
      ctx.fillStyle = "#0078ff";
      ctx.fill();
    }
    ctx.restore();
  }

  drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius = 2
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  hasPointHint(x: number, y: number): boolean {
    if (!this.selectEls.length) {
      return false;
    }
    if (this.width === 0 || this.height === 0) {
      return false;
    }
    const coords = this.getCoords();
    this.currentControl = null;
    this.cursor = "default";
    for (let i = 0; i < coords.length; i++) {
      const { point, control } = coords[i];

      const distance = Math.sqrt(
        Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)
      );

      if (distance <= this.ControlSize) {
        this.cursor = control.cursor;
        this.currentControl = coords[i];
        return true;
      }
    }

    if (super.hasPointHint(x, y)) {
      this.cursor = "grab";
      return true;
    }
    return false;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.root.width, this.root.height);
  }

  setCoords(): this {
    const finalMatrix = this.getOwnMatrix();
    const dim = this._getTransformedDimensions({
      width: this.width ?? 0,
      height: this.height ?? 0
    });
    this.coords = controls.map((control, index) => {
      const x = control.x * dim.x + (control.offsetX ?? 0);
      const y = control.y * dim.y + (control.offsetY ?? 0);
      return {
        control,
        point: new Point(finalMatrix?.transformPoint(new Point(x, y)))
      };
    });
    return this;
  }
}
