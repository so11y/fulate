import { Intersection } from "../../../util/Intersection";
import { makeBoundingBoxFromPoints, Point } from "../../../util/point";
import { degreesToRadians } from "../../../util/radiansDegreesConversion";
import { Element } from "../../node/element";
import { FulateEvent } from "../../eventManage";
// import { Layer } from "../layer";
// import { Element } from "../base";
import { Controls, resizeObject } from "./controls";
import { Snap } from "./snap";

export class Select extends Element {
  declare selectEls: Element[];
  declare currentControl: { control: any; point: any };
  declare coords: any;
  key = "select";
  controlSize = 8;
  hitPadding = 6;
  controlCoords: Array<Point>;
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

  get snapTool(): Snap | undefined {
    return this.root.keyElmenet?.get("snap") as Snap;
  }

  mounted() {
    const checkElementIntersects = (object: Element) => {
      const [tl, , br] = this.getControlCoords();
      if (
        object.visible &&
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
      //@ts-ignore
      const directEl = this.root.children?.filter((v) => v !== this);
      const startPoint = new Point(e.detail.x, e.detail.y);
      this.setOptionsSync({
        left: startPoint.x,
        top: startPoint.y,
        width: 0,
        height: 0,
        angle: 0
      });

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
        });
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
          this.setOptions(rect);
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
        angle: this.angle ?? 0,
        width: this.width,
        height: this.height,
        left: this.left,
        top: this.top,
        worldCenterPoint: this.getWorldCenterPoint(),
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

      this.snapTool?.start(
        this.selectEls
          .concat(this)
          .concat(this.root.children.filter((v) => v.type === "layer"))
      );

      const originalSelectLeft = this.left;
      const originalSelectTop = this.top;

      const coords = super.getCoords().map((p) => new Point(p.x, p.y));

      const snapshots = this.selectEls.map((child: any) => {
        const wc = child.getWorldCenterPoint();
        return { child, worldCenter: wc };
      });

      const pointermove = (ev: FulateEvent) => {
        const current = new Point(ev.detail.x, ev.detail.y);
        let dx = current.x - startPoint.x;
        let dy = current.y - startPoint.y;

        const snapResult = this.snapTool?.detect(coords, dx, dy);

        if (snapResult) {
          dx += snapResult.dx;
          dy += snapResult.dy;
        }

        const targets = snapshots.map(({ child, worldCenter }) => {
          return {
            child,
            targetWorld: new Point(worldCenter.x + dx, worldCenter.y + dy)
          };
        });

        for (const { child, targetWorld } of targets) {
          const center = child.getPositionByOrigin(targetWorld);
          child.quickSetOptions({
            left: center.x,
            top: center.y
          });
        }

        this.setOptions({
          left: originalSelectLeft + dx,
          top: originalSelectTop + dy
        });
      };

      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          this.root.removeEventListener("pointermove", pointermove);
          this.snapTool?.stop();
        },
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
    if (!this.width || !this.height) {
      return;
    }
    const ctx = this.layer.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setTransform(
      this.root.getViewPointMtrix().multiply(this.getOwnMatrix())
    );
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
    }
    ctx.roundRect(0, 0, this.width!, this.height!, this.radius ?? 0);
    if (this.backgroundColor) {
      ctx.fill();
    }
    ctx.restore();

    if (this.selectEls.length) {
      this.getControlCoords().forEach((point, index) =>
        this.drawControlPoint(ctx, point, Controls[index])
      );
    }
  }

  drawControlPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    control: (typeof Controls)[0]
  ) {
    const size = this.controlSize;
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, size - 4, 0, Math.PI * 2);
    if (control.type === "mtr") {
      ctx.fillStyle = "#ff4757";
    } else {
      ctx.fillStyle = "#0078ff";
    }
    ctx.fill();
    ctx.restore();
  }

  hasPointHint(x: number, y: number): boolean {
    if (!this.selectEls.length) {
      return false;
    }
    if (this.width === 0 || this.height === 0) {
      return false;
    }
    const coords = this.getControlCoords();
    const hintPoint = new Point(x, y);
    this.currentControl = null;
    this.cursor = "default";
    for (let i = 0; i < coords.length; i++) {
      const point = coords[i];

      const distance = Math.sqrt(
        Math.pow(hintPoint.x - point.x, 2) + Math.pow(hintPoint.y - point.y, 2)
      );

      if (distance <= this.controlSize) {
        this.cursor = Controls[i].cursor;
        this.currentControl = {
          point: hintPoint,
          control: Controls[i]
        };
        return true;
      }
    }

    const map = new Map();
    coords.forEach((c, i) => map.set(Controls[i].type, c));

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
        this.cursor = edge.cursor;

        this.currentControl = {
          point: hintPoint,
          control: {
            type: edge.type,
            actionName: "scale",
            cursor: edge.cursor,
            callback: (selectEL: any, point: any, preState: any, event: any) =>
              resizeObject(selectEL, preState, event, edge.type)
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

  setCoords(): this {
    const finalMatrix = this.getOwnMatrix();
    const dim = this._getTransformedDimensions();
    super.setCoords();
    this.controlCoords = Controls.map((control) => {
      const x = control.x * dim.x + (control.offsetX ?? 0);
      const y = control.y * dim.y + (control.offsetY ?? 0);
      return new Point(finalMatrix.transformPoint(new Point(x, y)));
    });
    return this;
  }

  getControlCoords() {
    this.getCoords();
    return this.controlCoords;
  }
}
