import { Intersection } from "../../../util/Intersection";
import { makeBoundingBoxFromPoints, Point } from "../../../util/point";
import { degreesToRadians } from "../../../util/radiansDegreesConversion";
import { BaseElementOption, Element } from "../../node/element";
import { FulateEvent } from "../../eventManage";
// import { Layer } from "../layer";
// import { Element } from "../base";
import { Controls, resizeObject, rotateCallback } from "./controls";
import { Snap } from "./snap";

const rotateCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>') 9 9, crosshair`;

export class Select extends Element {
  declare selectEls: Element[];
  declare currentControl: { control: any; point: any };
  declare _coords: any;
  key = "select";
  controlSize = 6;
  hitPadding = 6;
  snapAngle = 45;
  snapThreshold = 5;
  controlCoords: Array<Point>;
  targetKey = "workspace";

  constructor(options?: BaseElementOption) {
    super({
      width: 0,
      height: 0,
      originX: "center",
      originY: "center",
      ...options
    });
    this.selectEls = [];
    this.eventManage.hasUserEvent = true;
  }

  get snapTool(): Snap | undefined {
    return this.root.keyElmenet?.get("snap") as Snap;
  }

  get targetElement(): Element {
    return this.root.keyElmenet.get(this.targetKey) ?? this.root;
  }

  forEachTarget(callback: (el: Element) => void) {
    this.targetElement.children?.forEach((artboard) => {
      artboard.children?.forEach((child) => {
        if (child !== this) {
          if (child.type !== "layer") {
            callback(child);
          } else {
            child.children.forEach((child) => callback(child));
          }
        }
      });
    });
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
      const directEl: Element[] = [];
      this.forEachTarget((el) => directEl.push(el));
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

      this.snapTool?.start(this.selectEls.concat(this));

      const originalSelectLeft = this.left;
      const originalSelectTop = this.top;

      const coords = super.getCoords();
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
      const hasSelection =
        this.selectEls.length > 0 && this.root.currentElement === this;

      if (!hasSelection) {
        handleSelect(e);
        return;
      }

      if (this.currentControl) {
        handleControl(e);
      } else {
        handleSelectMove(e);
      }
    };

    this.root.addEventListener("pointerdown", pointerdown);

    this.unmounted = () => {
      this.root.removeEventListener("pointerdown", pointerdown);
      super.unmounted();
    };

    super.mounted();
  }

  paint() {
    if (!this.width || !this.height) {
      return;
    }
    const ctx = this.layer.ctx;
    ctx.save();
    ctx.beginPath();
    this.applyTransformToCtx(ctx);

    const scale = this.root.viewport.scale;
    const padding = 1 / scale;
    ctx.strokeStyle = "#0078ff";
    ctx.lineWidth = 1 / scale;
    ctx.roundRect(
      -padding,
      -padding,
      this.width! + padding * 2,
      this.height! + padding * 2,
      this.radius ?? 0
    );
    ctx.stroke();

    ctx.restore();
    if (this.selectEls.length) {
      this.getControlCoords().forEach((point, index) =>
        this.drawControlPoint(ctx, point, Controls[index])
      );
    }
    this.drawInfoPanel(ctx);
  }

  drawControlPoint(
    ctx: CanvasRenderingContext2D,
    point: Point,
    control: (typeof Controls)[0]
  ) {
    const scale = this.root.viewport.scale;
    const size = this.controlSize / scale;
    ctx.save();

    ctx.translate(point.x, point.y);
    ctx.rotate(degreesToRadians(this.angle ?? 0));

    ctx.beginPath();
    ctx.fillStyle = "#0078ff";
    ctx.roundRect(-size / 2, -size / 2, size, size);
    ctx.fill();
    ctx.restore();
  }

  drawInfoPanel(ctx: CanvasRenderingContext2D) {
    const vp = this.root.getViewPointMtrix();
    const dpr = window.devicePixelRatio || 1;
    const allPts = this.getControlCoords().map((p) => p.matrixTransform(vp));
    const cornerPts = allPts.slice(0, 4);
    const minX = Math.min(...cornerPts.map((p) => p.x));
    const maxX = Math.max(...cornerPts.map((p) => p.x));
    const maxY = Math.max(...allPts.map((p) => p.y));
    const centerX = (minX + maxX) / 2;

    const text = `x: ${Math.round(this.left)}  y: ${Math.round(this.top)}  ${Math.round(this.angle ?? 0)}°`;

    ctx.save();
    // 彻底重置画笔，并使用 DPR 放大的物理像素坐标系
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "12px Arial";
    const pw = ctx.measureText(text).width + 12;
    const ph = 22;
    const px = centerX - pw / 2;
    const py = maxY + 8;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 4);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillText(text, px + 6, py + 15);
    ctx.restore();
  }

  getBoundingRect() {
    if (this._boundingRectCache) return this._boundingRectCache;
    const baseRect = super.getBoundingRect();

    if (
      !this.selectEls ||
      !this.selectEls.length ||
      !this.width ||
      !this.height
    ) {
      return baseRect;
    }

    const coords = this.getControlCoords();
    let minX = baseRect.left;
    let minY = baseRect.top;
    let maxX = baseRect.left + baseRect.width;
    let maxY = baseRect.top + baseRect.height;

    const scale = this.root.viewport.scale;
    const padding = (this.controlSize + this.hitPadding) / scale;

    for (const p of coords) {
      minX = Math.min(minX, p.x - padding);
      minY = Math.min(minY, p.y - padding);
      maxX = Math.max(maxX, p.x + padding);
      maxY = Math.max(maxY, p.y + padding);
    }

    this._boundingRectCache = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };

    return this._boundingRectCache;
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

      const scale = this.root.viewport.scale;
      const scaledControlSize = this.controlSize / scale;
      const scaledRotatePadding = 8 / scale;

      if (distance <= scaledControlSize) {
        this.cursor = Controls[i].cursor;
        this.currentControl = {
          point: hintPoint,
          control: Controls[i]
        };
        return true;
      } else if (
        distance <= scaledControlSize + scaledRotatePadding &&
        !super.hasPointHint(x, y)
      ) {
        this.cursor = rotateCursor;
        this.currentControl = {
          point: hintPoint,
          control: {
            type: "rotate",
            actionName: "rotate",
            cursor: rotateCursor,
            callback: rotateCallback
          }
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

      const scaledHitPadding = this.hitPadding / this.root.viewport.scale;

      if (dist <= scaledHitPadding) {
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

  hasInView(): boolean {
    return true;
  }
}
