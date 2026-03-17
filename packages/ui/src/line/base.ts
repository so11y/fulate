import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { makeBoundingBoxFromPoints, RectWithCenter } from "@fulate/util";
import { BaseElementOption, Element } from "@fulate/core";
import { getElementAnchorPoint } from "./anchor";

export interface LineAnchor {
  elementId: string;
  anchorType: string;
}

export interface LinePointData {
  x: number;
  y: number;
  anchor?: LineAnchor;
}

export interface LineOption extends BaseElementOption {
  linePoints?: LinePointData[];
  strokeColor?: string;
  strokeWidth?: number;
}

/**
 * Abstract base class for all line-type elements.
 * linePoints are stored in LOCAL coordinates (relative to left/top).
 * left/top is anchored to the first point's world position.
 */
export abstract class BaseLine extends Element {
  linePoints: LinePointData[] = [];
  strokeColor = "#333333";
  strokeWidth = 2;

  private _snapshotLinePoints: LinePointData[] | null = null;
  private _snapshotWorldMatrix: DOMMatrix | null = null;
  private _snapshotLeft: number = 0;
  private _snapshotTop: number = 0;

  private _syncAnchorsCallback = () => {
    if (this.syncAnchors()) {
      this.markNeedsLayout();
      // this.layer?.syncRbush(this as any);
    }
  };

  private _handleTransformUpdated = () => {
    this.layer?.addPostUpdate(this._syncAnchorsCallback);
  };

  constructor(options?: LineOption) {
    super(options);
    if (options?.linePoints) {
      if (options.left != null || options.top != null) {
        this.linePoints = options.linePoints.map((p) => ({
          x: p.x,
          y: p.y,
          anchor: p.anchor ? { ...p.anchor } : undefined
        }));
      } else {
        this._initFromWorldPoints(options.linePoints);
      }
    }
    if (options?.strokeColor) this.strokeColor = options.strokeColor;
    if (options?.strokeWidth != null) this.strokeWidth = options.strokeWidth;
    this._syncBoundsFromPoints();
  }

  private _initFromWorldPoints(worldPoints: LinePointData[]) {
    if (worldPoints.length === 0) {
      this.linePoints = [];
      return;
    }
    const originX = worldPoints[0].x;
    const originY = worldPoints[0].y;
    this.left = originX;
    this.top = originY;
    this.linePoints = worldPoints.map((p) => ({
      x: p.x - originX,
      y: p.y - originY,
      anchor: p.anchor ? { ...p.anchor } : undefined
    }));
  }

  // --- Anchor endpoint access ---

  get headPoint(): LinePointData {
    return this.linePoints[0];
  }

  get tailPoint(): LinePointData {
    return this.linePoints[this.linePoints.length - 1];
  }

  // --- Coordinate conversion ---

  /** World point → local point (uses cached inverse matrix) */
  worldToLocal(wx: number, wy: number): Point {
    return this.getGlobalToLocal(new Point(wx, wy));
  }

  /** Get linePoints in world coordinates (for rendering, hit-testing, etc.) */
  getWorldLinePoints(): { x: number; y: number; anchor?: LineAnchor }[] {
    const m = this.getOwnMatrix();
    return this.linePoints.map((p) => {
      const wp = m.transformPoint({ x: p.x, y: p.y });
      return { x: wp.x, y: wp.y, anchor: p.anchor };
    });
  }

  // --- Anchor connection helpers ---

  private _connectToElement(el: Element) {
    (el.connectedLines ??= new Set()).add(this.id);
    el.addEventListener("transformUpdated", this._handleTransformUpdated);
  }

  private _disconnectFromElement(el: Element) {
    el.connectedLines?.delete(this.id);
    el.removeEventListener("transformUpdated", this._handleTransformUpdated);
  }

  // --- Point management (all accept WORLD coordinates) ---

  addPoint(x: number, y: number, anchor?: LineAnchor) {
    if (this.linePoints.length === 0) {
      this.left = x;
      this.top = y;
      this.linePoints.push({ x: 0, y: 0, anchor });
    } else {
      const local = this.worldToLocal(x, y);
      this.linePoints.push({ x: local.x, y: local.y, anchor });
    }
    this._syncBoundsFromPoints();
    this.markNeedsLayout();
    if (anchor && this.root) {
      const el = this.root.idElements.get(anchor.elementId);
      if (el) this._connectToElement(el);
    }
  }

  movePoint(index: number, worldX: number, worldY: number) {
    const p = this.linePoints[index];
    if (p.anchor) {
      this._unregisterAnchor(p.anchor.elementId);
    }
    const local = this.worldToLocal(worldX, worldY);
    p.x = local.x;
    p.y = local.y;
    p.anchor = undefined;
    this._syncBoundsFromPoints();
    this.markNeedsLayout();
  }

  insertPoint(index: number, worldX: number, worldY: number) {
    const local = this.worldToLocal(worldX, worldY);
    this.linePoints.splice(index, 0, { x: local.x, y: local.y });
    this._syncBoundsFromPoints();
    this.markNeedsLayout();
  }

  removePoint(index: number) {
    if (this.linePoints.length <= 2) return;
    const p = this.linePoints[index];
    if (p.anchor) {
      this._unregisterAnchor(p.anchor.elementId);
    }
    this.linePoints.splice(index, 1);
    this._syncBoundsFromPoints();
    this.markNeedsLayout();
  }

  _unregisterAnchor(elementId: string) {
    if (!this.root) return;
    const stillConnected =
      this.headPoint.anchor?.elementId === elementId ||
      this.tailPoint.anchor?.elementId === elementId;
    if (!stillConnected) {
      const el = this.root.idElements.get(elementId);
      if (el) this._disconnectFromElement(el);
    }
  }

  // --- Bounds ---

  _syncBoundsFromPoints() {
    if (this.linePoints.length === 0) {
      this.width = 0;
      this.height = 0;
      return;
    }
    const worldPoints = this.getWorldLinePoints();
    const rect = makeBoundingBoxFromPoints(worldPoints as Point[]);
    this.width = rect.width || 1;
    this.height = rect.height || 1;
  }

  private _syncAnchorPoint(p: LinePointData): boolean {
    if (!p.anchor) return false;
    const el = this.root!.idElements.get(p.anchor.elementId);
    if (!el) return false;
    const pos = getElementAnchorPoint(el, p.anchor.anchorType);
    const local = this.worldToLocal(pos.x, pos.y);
    if (Math.abs(local.x - p.x) > 0.01 || Math.abs(local.y - p.y) > 0.01) {
      p.x = local.x;
      p.y = local.y;
      return true;
    }
    return false;
  }

  syncAnchors(): boolean {
    if (!this.root) return false;
    let changed = this._syncAnchorPoint(this.headPoint);
    changed = this._syncAnchorPoint(this.tailPoint) || changed;
    if (changed) this._syncBoundsFromPoints();
    return changed;
  }

  // --- Options (history restore) ---

  private _syncConnectedLines(
    oldPoints: LinePointData[],
    newPoints: LinePointData[]
  ) {
    if (!this.root) return;
    if (oldPoints[0]?.anchor)
      this._unregisterAnchor(oldPoints[0].anchor.elementId);
    const oldTail =
      oldPoints.length > 1 ? oldPoints[oldPoints.length - 1] : undefined;
    if (oldTail?.anchor) this._unregisterAnchor(oldTail.anchor.elementId);

    for (const p of [
      newPoints[0],
      newPoints.length > 1 ? newPoints[newPoints.length - 1] : undefined
    ]) {
      if (!p?.anchor) continue;
      const el = this.root.idElements.get(p.anchor.elementId);
      if (el) this._connectToElement(el);
    }
  }

  quickSetOptions(options: BaseElementOption) {
    if ((options as any).linePoints) {
      const oldPoints = this.linePoints;
      super.quickSetOptions(options);
      this.linePoints = (options as any).linePoints.map((p: any) => ({
        x: p.x,
        y: p.y,
        anchor: p.anchor ? { ...p.anchor } : undefined
      }));
      this._syncBoundsFromPoints();
      this._syncConnectedLines(oldPoints, this.linePoints);
      return this;
    }

    return super.quickSetOptions(options);
  }

  setOptions(options?: any, syncCalc = false) {
    if (options?.linePoints) {
      const oldPoints = this.linePoints;
      super.setOptions(options, syncCalc);
      this.linePoints = options.linePoints.map((p: any) => ({
        x: p.x,
        y: p.y,
        anchor: p.anchor ? { ...p.anchor } : undefined
      }));
      this._syncBoundsFromPoints();
      this._syncConnectedLines(oldPoints, this.linePoints);
      return this;
    }

    return super.setOptions(options, syncCalc);
  }

  // --- Geometry ---

  protected _getVisualPadding(): number {
    const scale = this.root?.viewport?.scale || 1;
    return Math.max(10, Math.ceil(this.strokeWidth / scale + 6 / scale));
  }

  getLocalPoints() {
    return this.linePoints.map((p) => new Point(p.x, p.y));
  }

  getBoundingRect(): RectWithCenter {
    if (this._boundingRectCache) return this._boundingRectCache;

    const worldPoints = this.getWorldLinePoints();
    const rect = makeBoundingBoxFromPoints(worldPoints);
    const pad = this._getVisualPadding();
    rect.left -= pad;
    rect.top -= pad;
    rect.width = rect.width + pad * 2 || 1;
    rect.height = rect.height + pad * 2 || 1;

    this._boundingRectCache = rect;
    return this._boundingRectCache;
  }

  hasPointHint(point: Point): boolean {
    const threshold = Math.max(5 / (this.root?.viewport?.scale || 1), 3);
    const wp = this.getWorldLinePoints();

    for (let i = 0; i < wp.length - 1; i++) {
      const a = wp[i];
      const b = wp[i + 1];
      const dist = Intersection.pointToLineSegmentDistance(
        point,
        new Point(a.x, a.y),
        new Point(b.x, b.y)
      );
      if (dist <= threshold) return true;
    }

    const vertexThreshold = Math.max(6 / (this.root?.viewport?.scale || 1), 4);
    for (const p of wp) {
      if (point.pointDistance(p, vertexThreshold)) return true;
    }
    return false;
  }

  snapshotForGroup(): void {
    this._snapshotLinePoints = this.linePoints.map((p) => ({
      x: p.x,
      y: p.y,
      anchor: p.anchor ? { ...p.anchor } : undefined
    }));
    this._snapshotLeft = this.left;
    this._snapshotTop = this.top;
    this._snapshotWorldMatrix = DOMMatrix.fromMatrix(this.calcWorldMatrix());
  }

  applyGroupTransform(targetMatrix: DOMMatrix): void {
    if (!this._snapshotLinePoints || !this._snapshotWorldMatrix) return;
    const delta = targetMatrix.multiply(this._snapshotWorldMatrix.inverse());

    const newOrigin = new DOMPoint(
      this._snapshotLeft,
      this._snapshotTop,
      0,
      1
    ).matrixTransform(delta);
    this.left = newOrigin.x;
    this.top = newOrigin.y;

    for (
      let i = 0;
      i < this._snapshotLinePoints.length && i < this.linePoints.length;
      i++
    ) {
      const sp = this._snapshotLinePoints[i];
      const worldX = this._snapshotLeft + sp.x;
      const worldY = this._snapshotTop + sp.y;
      const np = new DOMPoint(worldX, worldY, 0, 1).matrixTransform(delta);
      this.linePoints[i].x = np.x - this.left;
      this.linePoints[i].y = np.y - this.top;
      this.linePoints[i].anchor = sp.anchor;
    }
    this._syncBoundsFromPoints();
    this.markNeedsLayout();
  }

  // --- Serialization ---

  toJson(includeChildren = false) {
    const json = super.toJson(includeChildren) as any;
    json.linePoints = this.linePoints.map((p) => ({
      x: p.x,
      y: p.y,
      anchor: p.anchor ? { ...p.anchor } : undefined
    }));
    json.strokeColor = this.strokeColor;
    json.strokeWidth = this.strokeWidth;
    return json;
  }

  // --- Connected-lines lifecycle ---

  rebindAnchors() {
    this._bindEndpoints(false);
    this._bindEndpoints(true);
  }

  private _bindEndpoints(connect: boolean) {
    const action = connect
      ? (el: Element) => this._connectToElement(el)
      : (el: Element) => this._disconnectFromElement(el);
    for (const p of [this.headPoint, this.tailPoint]) {
      if (!p.anchor) continue;
      const el = this.root?.idElements.get(p.anchor.elementId);
      if (el) action(el);
    }
  }

  activate() {
    super.activate();
    this._bindEndpoints(true);
  }

  deactivate() {
    if (!this.shouldFastDeactivate()) {
      this._bindEndpoints(false);
    }
    super.deactivate();
  }

  mounted() {
    super.mounted();
    this._bindEndpoints(true);
  }

  unmounted() {
    this._bindEndpoints(false);
    super.unmounted();
  }
}
