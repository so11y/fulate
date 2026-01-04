import { Intersection } from "../../util/Intersection";
import { makeBoundingBoxFromPoints, Point } from "../../util/point";
import { degreesToRadians } from "../../util/radiansDegreesConversion";
import { Element } from "../base";
import { FulateEvent } from "../eventManage";
import { Layer } from "../layer";
import { Controls, resizeObject } from "./controls";

export class Select extends Layer {
  declare selectEls: Element[];
  declare currentControl: { control: any; point: any };
  declare coords: any;
  controlSize = 8;
  hitPadding = 6;
  constructor() {
    super({
      backgroundColor: "rgba(0, 0, 0, 0.1)",
      width: 0,
      height: 0,
      originX: "center",
      originY: "center"
    });
    this.selectEls = [];
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

    const handleSelect = (e: FulateEvent) => {
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
      const pointermove = (e: FulateEvent) => {
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
            directEl
              ?.filter(checkElementIntersects)
              .forEach((child) => selectEls.add(child));
          }
          this.selectEls = Array.from(selectEls);
          const rect = makeBoundingBoxFromPoints(
            this.selectEls?.map((v) => v.getCoords()).flat(1)
          );
          this.setOptions(rect).render();
        },
        {
          once: true
        }
      );
    };

    const handleControl = (e: FulateEvent) => {
      const { control, point } = this.currentControl;
      const theta = degreesToRadians(this.angle ?? 0);
      const selectPrevState = {
        theta,
        width: this.width,
        height: this.height,
        left: this.left,
        top: this.top,
        center: this.getWorldCenterPoint(),
        selectCenterPoint: this.selectEls.map((v) => {
          return {
            angle: v.angle,
            width: v.width,
            height: v.height,
            worldCenterPoint: v.getWorldCenterPoint(),
            matrix: DOMMatrix.fromMatrix(v.getOwnMatrix()),
            el: v
          };
        })
      };
      const pointermove = (e: FulateEvent) => {
        // const endPoint = new Point(e.detail.x, e.detail.y);
        control.callback(this, point, selectPrevState, e);
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

    const handleSelectMove = (e: FulateEvent) => {
      const startPoint = new Point(e.detail.x, e.detail.y);

      const originalSelectLeft = this.left;
      const originalSelectTop = this.top;

      const snapshots = this.selectEls.map((child: any) => {
        const wc = child.getWorldCenterPoint();
        return { child, worldCenter: wc };
      });

      const pointermove = (ev: FulateEvent) => {
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

    const pointerdown = (e: FulateEvent) => {
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
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.setTransform(this.getOwnMatrix());
    if (this.backgroundColor) {
      this.ctx.fillStyle = this.backgroundColor;
    }
    this.ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
    if (this.backgroundColor) {
      this.ctx.fill();
    }
    this.ctx.restore();
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
    control: (typeof Controls)[0]
  ) {
    ctx.save();
    if (control.type === "mtr") {
      ctx.beginPath();
      ctx.arc(point.x, point.y, this.controlSize - 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ff4757";
      ctx.fill();
    } else {
      ctx.beginPath();
      const matrix = this.getOwnMatrix();
      this.ctx.setTransform(matrix);
      const localPoint = point.matrixTransform(matrix.inverse());
      this.drawRoundedRect(
        ctx,
        localPoint.x - this.controlSize / 2,
        localPoint.y - this.controlSize / 2,
        this.controlSize,
        this.controlSize
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
    const hintPoint = new Point(x, y);
    this.currentControl = null;
    this.cursor = "default";
    for (let i = 0; i < coords.length; i++) {
      const { point, control } = coords[i];

      const distance = Math.sqrt(
        Math.pow(hintPoint.x - point.x, 2) + Math.pow(hintPoint.y - point.y, 2)
      );

      if (distance <= this.controlSize) {
        this.cursor = control.cursor;
        this.currentControl = coords[i];
        return true;
      }
    }

    const map = new Map();
    coords.forEach((c) => map.set(c.control.type, c.point));

    const tl = map.get("tl");
    const tr = map.get("tr");
    const br = map.get("br");
    const bl = map.get("bl");

    const edges = [
      { start: tl, end: tr, type: "mt", cursor: "ns-resize" }, // 上边 (Middle Top)
      { start: tr, end: br, type: "mr", cursor: "ew-resize" }, // 右边 (Middle Right)
      { start: br, end: bl, type: "mb", cursor: "ns-resize" }, // 下边 (Middle Bottom)
      { start: bl, end: tl, type: "ml", cursor: "ew-resize" } // 左边 (Middle Left)
    ];

    for (const edge of edges) {
      const dist = Intersection.pointToLineSegmentDistance(
        hintPoint,
        edge.start,
        edge.end
      );

      if (dist <= this.hitPadding) {
        this.cursor = "grabbing"; //edge.cursor;

        this.currentControl = {
          point: hintPoint,
          control: {
            type: edge.type,
            actionName: "scale",
            cursor: edge.cursor,
            callback: (
              selectEL: any,
              point: any,
              preState: any,
              event: any
            ) => {
              return resizeObject(selectEL, preState, event, edge.type);
            }
          }
        };
        return true;
      }
    }

    if (super.hasPointHint(x, y)) {
      this.cursor = "move";
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
    this.coords = Controls.map((control, index) => {
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
