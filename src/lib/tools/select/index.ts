import { makeBoundingBoxFromPoints, Point } from "../../../util/point";
import { BaseElementOption, Element } from "../../node/element";
import { Controls } from "./controls";
import { Snap } from "./snap";
import { Group } from "../../ui/group";
import { Node } from "../../node/node";
import { paintSelect } from "./paint";
import { selectHitTest } from "./hitTest";
import { setupInteraction } from "./interaction";
import { doGroup, unGroup } from "./grouping";

export class Select extends Group {
  declare currentControl: { control: any; point: any };
  key = "select";
  controlSize = 6;
  hitPadding = 6;
  snapAngle = 45;
  snapThreshold = 5;
  controlCoords: Array<Point>;
  targetKey = "workspace";
  hoverElement: Element | null = null;

  private _cleanupInteraction?: () => void;

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
            child.children.forEach((child: any) => {
              if (!child.groupParent) callback(child);
            });
          }
        }
      });
    });
  }

  /** Delegates to parent Group's hasPointHint (body-only check, no controls). */
  bodyHasPoint(point: Point): boolean {
    return super.hasPointHint(point);
  }

  /** Exposes parent Group's getCoords for use by interaction module. */
  getParentCoords(): Point[] {
    return super.getCoords();
  }

  // --- Delegation ---

  doGroup() {
    doGroup(this);
  }

  unGroup() {
    unGroup(this);
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

  delete() {
    if (!this.selectEls.length) return;
    this.root.history.snapshot(this.selectEls);
    this.selectEls.forEach((el) => {
      el.parent?.removeChild(el);
    });
    this.select([]);
    this.root.history.commit();
    this.root.requestRender();
    this.root.container.style.cursor = "default";
  }

  // --- Lifecycle ---

  mounted() {
    this._cleanupInteraction = setupInteraction(this);
    super.mounted();
  }

  unmounted() {
    this._cleanupInteraction?.();
    super.unmounted();
  }

  paint() {
    paintSelect(this);
  }

  hasPointHint(hintPoint: Point) {
    return selectHitTest(this, hintPoint);
  }

  // --- Coordinates & Bounds ---

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

  hasInView() {
    return true;
  }
}
