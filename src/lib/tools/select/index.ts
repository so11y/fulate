import { Intersection } from "../../../util/Intersection";
import { makeBoundingBoxFromPoints, Point } from "../../../util/point";
import { degreesToRadians } from "../../../util/radiansDegreesConversion";
import { BaseElementOption, Element } from "../../node/element";
import { FulateEvent } from "../../eventManage";
import { Controls, resizeObject, rotateCallback } from "./controls";
import { Snap } from "./snap";
import { Group } from "../../ui/group";
import { Node } from "../../node/node";

const rotateCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"></path><path d="M21 13a9 9 0 1 1-3-7.7L21 8"></path></svg>') 9 9, crosshair`;

export class Select extends Group {
  declare currentControl: { control: any; point: any };
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
    this.eventManage.hasUserEvent = true;
  }

  get selectEls() {
    return this.groupEls;
  }

  set selectEls(els: Element[]) {
    this.groupEls = els;
  }

  get snapTool(): Snap | undefined {
    return this.root.keyElmenet?.get("snap") as Snap;
  }

  get targetElement(): Node {
    return this.root.keyElmenet.get(this.targetKey) ?? this.root;
  }

  forEachTarget(callback: (el: Element) => void) {
    this.targetElement.children?.forEach((artboard) => {
      artboard.children?.forEach((child: any) => {
        if (child !== this) {
          if (!child.isLayer) {
            if (!child.groupParent) callback(child);
          } else {
            child.children.forEach((child) => {
              if (!child.groupParent) callback(child);
            });
          }
        }
      });
    });
  }

  doGroup() {
    if (this.selectEls.length <= 1) return null;

    const firstEl = this.selectEls[0];
    const parent = firstEl.parent;
    if (!parent) return null;

    const group = new Group({
      left: this.left,
      top: this.top,
      width: this.width,
      height: this.height,
      angle: this.angle,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      skewX: this.skewX,
      skewY: this.skewY,
      originX: "center",
      originY: "center"
    });

    group.groupEls = [...this.selectEls];
    group.groupEls.forEach((el) => (el.groupParent = group));

    parent.append(group);
    group.snapshotChildren();

    this.selectEls = [group as any];
    this.snapshotChildren();
  }

  unGroup() {
    if (this.selectEls.length !== 1 || this.selectEls[0].type !== "group") {
      return;
    }

    const group = this.selectEls[0] as Group;

    group.groupEls.forEach((el) => (el.groupParent = null));
    this.selectEls = [...group.groupEls] as any;

    if (group.parent) {
      group.parent.removeChild(group as any);
    }

    const rect = makeBoundingBoxFromPoints(
      this.selectEls.map((v) => v.getCoords()).flat(1)
    );
    this.setOptions({
      ...rect,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    });
    this.snapshotChildren();
  }

  select(children: Array<Element>) {
    this.selectEls = children;
    if (!this.selectEls.length) {
      this.setOptions({ width: 0, height: 0 });
      return;
    }
    const rect = makeBoundingBoxFromPoints(
      this.selectEls.map((v) => v.getCoords()).flat(1)
    );
    this.setOptions({
      ...rect,
      angle: 0,
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    });
    this.snapshotChildren();
  }

  mounted() {
    const checkElementIntersects = (object: Element) => {
      if (object === this) {
        return;
      }
      const [tl, , br] = this.getControlCoords();
      if (
        object.visible &&
        (object.intersectsWithRect(tl, br) ||
          object.isContainedWithinRect(tl, br) ||
          object.hasPointHint(tl) ||
          object.hasPointHint(br))
      ) {
        return object;
      }
    };

    const handleSelect = (e: FulateEvent) => {
      this.selectEls = [];
      const startPoint = new Point(e.detail.x, e.detail.y);
      this.setOptionsSync({
        left: startPoint.x,
        top: startPoint.y,
        width: 0,
        height: 0,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
      });

      const selectEls = new Set<Element>();

      this.root.searchHitElements(startPoint, ({ element }) => {
        const intersected = checkElementIntersects(element);
        if (intersected) {
          selectEls.add(intersected);
        }
      });

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
            this.root.searchArea(this, ({ element }) => {
              const intersected = checkElementIntersects(element);
              if (intersected) {
                selectEls.add(intersected);
              }
            });
          }
          this.select(Array.from(selectEls));
        },
        {
          once: true
        }
      );
    };

    const handleControl = (e: FulateEvent) => {
      const { control, point } = this.currentControl;

      this.root.history.snapshot(this.selectEls);

      const theta = degreesToRadians(this.angle ?? 0);
      const selectPrevState = {
        theta,
        angle: this.angle ?? 0,
        width: this.width,
        height: this.height,
        left: this.left,
        top: this.top,
        worldCenterPoint: this.getWorldCenterPoint(),
        matrix: DOMMatrix.fromMatrix(this.getOwnMatrix())
      };
      const pointermove = (e: FulateEvent) => {
        control.callback(this, point, selectPrevState, e);
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          this.root.removeEventListener("pointermove", pointermove);
          this.root.history.commit();
        },
        {
          once: true
        }
      );
    };

    const handleSelectMove = (e: FulateEvent) => {
      const startPoint = new Point(e.detail.x, e.detail.y);

      this.root.history.snapshot(this.selectEls);

      this.snapTool?.start(this.selectEls.concat(this as any));

      const originalSelectLeft = this.left;
      const originalSelectTop = this.top;

      const coords = super.getCoords();

      const pointermove = (ev: FulateEvent) => {
        const current = new Point(ev.detail.x, ev.detail.y);
        let dx = current.x - startPoint.x;
        let dy = current.y - startPoint.y;

        const snapResult = this.snapTool?.detect(coords, dx, dy);

        if (snapResult) {
          dx += snapResult.dx;
          dy += snapResult.dy;
        }

        // Just move the Select bounding box.
        // Group._applyTransformToChildren will automatically move the selected items.
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
          this.root.history.commit();
        },
        { once: true }
      );
    };

    const pointerdown = (e: FulateEvent) => {
      const hasSelection =
        this.selectEls.length > 0 &&
        this.root.getCurrnetEelement()?.element === this;

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

    const coords = this.getCoords();

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    ctx.lineTo(coords[1].x, coords[1].y);
    ctx.lineTo(coords[2].x, coords[2].y);
    ctx.lineTo(coords[3].x, coords[3].y);
    ctx.closePath();

    const scale = this.root.viewport.scale;
    ctx.strokeStyle = "#4F81FF";
    ctx.lineWidth = 1 / scale;
    ctx.stroke();

    ctx.restore();
    if (this.selectEls.length) {
      this.getControlCoords().forEach((point) =>
        this.drawControlPoint(ctx, point)
      );
    }
    this.drawInfoPanel(ctx);
  }

  drawControlPoint(ctx: CanvasRenderingContext2D, point: Point) {
    const scale = this.root.viewport.scale;
    const size = this.controlSize / scale;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(degreesToRadians(this.angle ?? 0));
    ctx.beginPath();
    ctx.fillStyle = "#4F81FF";
    ctx.roundRect(-size / 2, -size / 2, size, size, 1 / scale);
    ctx.fill();
    ctx.restore();
  }

  drawInfoPanel(ctx: CanvasRenderingContext2D) {
    const vp = this.root.getViewPointMtrix();
    const dpr = window.devicePixelRatio || 1;
    const cornerPts = this.getControlCoords().map((p) => p.matrixTransform(vp));
    const minX = Math.min(...cornerPts.map((p) => p.x));
    const maxX = Math.max(...cornerPts.map((p) => p.x));
    const maxY = Math.max(...cornerPts.map((p) => p.y));
    const centerX = (minX + maxX) / 2;

    const text = `x: ${Math.round(this.left)}  y: ${Math.round(this.top)}  ${Math.round(this.angle ?? 0)}°`;

    ctx.save();
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

  hasPointHint(hintPoint: Point): boolean {
    if (!this.selectEls.length) {
      return false;
    }
    if (this.width === 0 || this.height === 0) {
      return false;
    }
    const coords = this.getControlCoords();
    this.currentControl = null;
    this.cursor = "default";
    for (let i = 0; i < coords.length; i++) {
      const point = coords[i];

      const scale = this.root.viewport.scale;
      const scaledControlSize = this.controlSize / scale;
      const scaledRotatePadding = 8 / scale;

      if (hintPoint.pointDistance(point, scaledControlSize)) {
        this.cursor = Controls[i].cursor;
        this.currentControl = {
          point: hintPoint,
          control: Controls[i]
        };
        return true;
      } else if (
        hintPoint.pointDistance(
          point,
          scaledControlSize + scaledRotatePadding
        ) &&
        !super.hasPointHint(hintPoint)
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
      { start: tl, end: tr, type: "mt", cursor: "ns-resize" },
      { start: tr, end: br, type: "mr", cursor: "ew-resize" },
      { start: br, end: bl, type: "mb", cursor: "ns-resize" },
      { start: bl, end: tl, type: "ml", cursor: "ew-resize" }
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

    if (super.hasPointHint(hintPoint)) {
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

  delete() {
    if (!this.selectEls.length) return;
    this.root.history.snapshot(this.selectEls);
    this.selectEls.forEach((el) => {
      el.parent?.removeChild(el);
    });
    this.select([]); // 立即更新框（隐藏掉）
    this.root.history.commit();
    this.root.requestRender();
  }
}
