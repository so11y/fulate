import { Point } from "@fulate/util";
import { makeBoundingBoxFromRects } from "@fulate/util";
import { BaseElementOption, Element } from "@fulate/core";
import { DEFAULT_RECT_SCHEMA, type ControlSchema } from "./controls";
import { Snap } from "./snap";
import { paintSelect } from "./paint";
import { selectHitTest } from "./hitTest";
import { setupInteraction } from "./interaction";
import { doGroup, unGroup } from "./grouping";
import { alignElements, type AlignType } from "./align";
import { copyElements, pasteElements } from "./clipboard";
import { HistoryManager } from "../history";

export class Select extends Element {
  declare currentControl: { control: any; point: any };
  key = "select";
  controlSize = 6;
  hitPadding = 6;
  snapAngle = 45;
  snapThreshold = 5;
  declare controlCoords: Array<Point>;
  hoverElement: Element | null = null;
  history!: HistoryManager;
  selectEls: Element[] = [];

  private _cleanupInteraction?: () => void;

  constructor(options?: BaseElementOption) {
    super({
      width: 0,
      height: 0,
      originX: "center",
      originY: "center",
      ...options
    });
    this.isSubscribed = true;
  }

  get snapTool(): Snap | undefined {
    return this.root.keyElmenet?.get("snap") as Snap;
  }

  bodyHasPoint(point: Point): boolean {
    return super.hasPointHint(point);
  }

  getParentCoords(): Point[] {
    return super.getCoords() ?? [];
  }

  doGroup() {
    doGroup(this);
  }

  unGroup() {
    unGroup(this);
  }

  align(type: AlignType) {
    alignElements(this, type);
  }

  copy() {
    copyElements(this);
  }

  paste() {
    pasteElements(this);
  }

  canDiveIn(el: Element): boolean {
    if (el.type === "group") return true;
    return el.enableDiveIn === true;
  }

  updateSelectFrame(options: Partial<BaseElementOption>) {
    Object.assign(this, options);
    this.markNeedsLayout();
  }

  select(
    children: Array<Element>,
    geometry?: {
      left: number;
      top: number;
      width: number;
      height: number;
      angle?: number;
      scaleX?: number;
      scaleY?: number;
      skewX?: number;
      skewY?: number;
    }
  ) {
    for (const el of children) {
      if (el.type === "group" && (el as any).ensureBoundingBox) {
        (el as any).ensureBoundingBox();
      }
    }

    this.selectEls = children;
    this.currentControl = null as any;
    this.hoverElement = null;

    if (!this.selectEls.length) {
      this.setOptions({ width: 0, height: 0 });
    } else if (geometry) {
      this.setOptions({
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        height: geometry.height,
        angle: geometry.angle ?? 0,
        scaleX: geometry.scaleX ?? 1,
        scaleY: geometry.scaleY ?? 1,
        skewX: geometry.skewX ?? 0,
        skewY: geometry.skewY ?? 0
      });
    } else {
      const rect = makeBoundingBoxFromRects(
        this.selectEls.map((v) => v.getBoundingRect())
      );
      this.setOptions({
        ...rect,
        angle: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0
      });
    }

    this.dispatchEvent("select:end");
  }

  delete() {
    if (!this.selectEls.length) return;

    if (this.currentControl?.control?.onDelete) {
      this.history.snapshot(this.selectEls);
      const handled = this.currentControl.control.onDelete(this);
      if (handled) {
        this.history.commit();
        this.select(this.selectEls);
        return;
      }
    }

    const toDelete: Element[] = [...this.selectEls];
    const deletingIds = new Set(this.selectEls.map((el) => el.id));

    for (const el of this.selectEls) {
      if (el.type === "group") {
        for (const member of (el as any).groupEls ?? []) {
          if (!deletingIds.has(member.id)) {
            toDelete.push(member);
            deletingIds.add(member.id);
          }
        }
      }
    }

    for (let i = 0; i < toDelete.length; i++) {
      const deps = toDelete[i].getCascadeDeleteElements();
      for (const dep of deps) {
        if (!deletingIds.has(dep.id)) {
          toDelete.push(dep);
          deletingIds.add(dep.id);
        }
      }
    }

    const affected = [...toDelete];
    const passive = new Set<Element>();
    for (const el of toDelete) {
      for (const dep of el.getAffectedElements()) {
        if (deletingIds.has(dep.id) || affected.includes(dep)) continue;
        affected.push(dep);
        passive.add(dep);
      }
    }

    this.history.snapshot(affected, passive);

    toDelete.forEach((el) => {
      if (el.type === "group") {
        for (const member of (el as any).groupEls ?? []) {
          (member as any).groupParent = null;
          member.parent?.removeChild(member);
        }
      }
      el.parent?.removeChild(el);
    });
    this.dispatchEvent("select:delete-element", {
      data: { elements: toDelete }
    });
    this.select([]);
    this.root.nextTick(() => this.root.checkHit());
    this.history.commit();
  }

  // --- Lifecycle ---

  mounted() {
    this.history = new HistoryManager(this.root);
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

  // --- Schema ---

  getActiveSchema(): ControlSchema {
    if (this.selectEls.length !== 1) return DEFAULT_RECT_SCHEMA;
    const el = this.selectEls[0];
    const base = el.getControlSchema?.() ?? DEFAULT_RECT_SCHEMA;

    const needsOverride =
      el.enableRotation === false ||
      el.enableMove === false ||
      el.enableResize === false;

    if (!needsOverride) return base;

    const schema = { ...base };
    if (el.enableRotation === false) schema.enableRotation = false;
    if (el.enableMove === false) schema.enableBodyMove = false;
    if (el.enableResize === false) {
      schema.controls = [];
      schema.edges = [];
    }
    return schema;
  }

  // --- Coordinates & Bounds ---

  setCoords(): this {
    const finalMatrix = this.getOwnMatrix();
    const schema = this.getActiveSchema();
    const el = this.selectEls.length === 1 ? this.selectEls[0] : null;
    super.setCoords();
    this.controlCoords = schema.controls.map(
      (cp) => cp.localPosition(this, el).applyMatrix(finalMatrix) //new Point(finalMatrix.transformPoint(cp.localPosition(this, el)))
    );
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
    const padding =
      (this.controlSize + this.hitPadding) / this.root.viewport.scale;

    for (const p of coords) {
      baseRect.includePoint(p.x, p.y, padding);
    }

    return baseRect;
  }

  hasInView() {
    return true;
  }
}
