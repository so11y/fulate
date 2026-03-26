import { Intersection } from "@fulate/util";
import { Point } from "@fulate/util";
import { makeBoundingBoxFromPoints, RectWithCenter } from "@fulate/util";
import { BaseElementOption, Element } from "@fulate/core";
import type { ForkNode } from "../fork-node";
import {
  connectToElement,
  disconnectFromElement,
  syncAllForkRelations,
  unregisterAnchor,
  syncAnchorPoint,
  bindEndpoints,
  handleSelectMoveEnd,
  syncConnectedLines,
  getTailForkNode,
  getHeadForkNode,
  getParentLine as _getParentLine,
  getChildLines as _getChildLines,
  getCascadeDeleteElements as _getCascadeDeleteElements
} from "./helpers";

export interface LineAnchor {
  elementId: string;
  anchorType: string;
}

export interface LinePointData {
  x: number;
  y: number;
  anchor?: LineAnchor;
}

export type LineDecoration = "none" | "arrow" | "dot";

export interface LineOption extends BaseElementOption {
  linePoints?: LinePointData[];
  strokeColor?: string;
  strokeWidth?: number;
  headDecoration?: LineDecoration;
  tailDecoration?: LineDecoration;
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
  headDecoration: LineDecoration = "none";
  tailDecoration: LineDecoration = "arrow";

  private _snapshotLinePoints: LinePointData[] | null = null;
  private _snapshotWorldMatrix: DOMMatrix | null = null;
  private _snapshotLeft: number = 0;
  private _snapshotTop: number = 0;

  private _syncAnchorsCallback = () => {
    if (this.syncAnchors()) {
      this.markNeedsLayout();
    }
  };

  private _handleTransformUpdated = () => {
    this.layer?.addPostUpdate(this._syncAnchorsCallback);
  };

  private _connectEl = (el: Element) =>
    connectToElement(this, el, this._handleTransformUpdated);

  private _disconnectEl = (el: Element) =>
    disconnectFromElement(this, el, this._handleTransformUpdated);

  constructor(options?: LineOption) {
    super(options);
  }

  attrs(options: any): void {
    if (options.linePoints) {
      const points: LinePointData[] = options.linePoints;
      if (options.left != null || options.top != null) {
        options.linePoints = points.map((p: LinePointData) => ({
          x: p.x,
          y: p.y,
          anchor: p.anchor ? { ...p.anchor } : undefined
        }));
      } else if (points.length > 0) {
        const originX = points[0].x;
        const originY = points[0].y;
        options.left = originX;
        options.top = originY;
        options.linePoints = points.map((p: LinePointData) => ({
          x: p.x - originX,
          y: p.y - originY,
          anchor: p.anchor ? { ...p.anchor } : undefined
        }));
      }
    }
    super.attrs(options);
  }

  // --- Anchor endpoint access ---

  get headPoint(): LinePointData {
    return this.linePoints[0];
  }

  get tailPoint(): LinePointData {
    return this.linePoints[this.linePoints.length - 1];
  }

  // --- Coordinate conversion ---

  worldToLocal(wx: number, wy: number): Point {
    return this.getGlobalToLocal(new Point(wx, wy));
  }

  getWorldLinePoints(): { x: number; y: number; anchor?: LineAnchor }[] {
    const m = this.getOwnMatrix();
    return this.linePoints.map((p) => {
      const wp = m.transformPoint({ x: p.x, y: p.y });
      return { x: wp.x, y: wp.y, anchor: p.anchor };
    });
  }

  // --- Relationship queries (delegated to helpers) ---

  getTailForkNode(): ForkNode | null {
    return getTailForkNode(this);
  }

  getHeadForkNode(): ForkNode | null {
    return getHeadForkNode(this);
  }

  getParentLine(): BaseLine | null {
    return _getParentLine(this);
  }

  getChildLines(): BaseLine[] {
    return _getChildLines(this);
  }

  getCascadeDeleteElements(): Element[] {
    return _getCascadeDeleteElements(this);
  }

  // --- Point management (all accept WORLD coordinates) ---

  addPoint(x: number, y: number, anchor?: LineAnchor) {
    const wasIncomplete = this.linePoints.length < 2;
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
      if (el) this._connectEl(el);
    }
    if (wasIncomplete && this.linePoints.length >= 2 && this.root) {
      syncAllForkRelations(this);
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
    unregisterAnchor(this, elementId, this._disconnectEl);
  }

  // --- Bounds ---

  _syncBoundsFromPoints() {
    if (this.linePoints.length === 0) {
      this.width = 0;
      this.height = 0;
      return;
    }
    const rect = makeBoundingBoxFromPoints(this.linePoints as Point[]);
    this.width = rect.width || 1;
    this.height = rect.height || 1;
  }

  // --- Anchor sync ---

  onSelectMoveEnd(): void {
    if (handleSelectMoveEnd(this, (id) => this._unregisterAnchor(id))) {
      this._syncBoundsFromPoints();
      this.markNeedsLayout();
    }
  }

  syncAnchors(): boolean {
    if (!this.root) return false;
    let changed = syncAnchorPoint(this, this.headPoint);
    changed = syncAnchorPoint(this, this.tailPoint) || changed;
    if (changed) this._syncBoundsFromPoints();
    return changed;
  }

  // --- Options (history restore) ---

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
      syncConnectedLines(
        this,
        oldPoints,
        this.linePoints,
        (id) => this._unregisterAnchor(id),
        this._connectEl
      );
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
    for (const p of [this.headPoint, this.tailPoint]) {
      if (!p.anchor) continue;
      const el = this.root?.idElements.get(p.anchor.elementId);
      if (el?.type === "forkNode" && el.hasPointHint(point)) return false;
    }

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

  // --- Group transform ---

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

  applyTransformMatrix(targetMatrix: DOMMatrix): void {
    this.applyGroupTransform(targetMatrix);
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
    if (this.linePoints.length) {
      json.linePoints = this.linePoints.map((p) => ({
        x: p.x,
        y: p.y,
        anchor: p.anchor ? { ...p.anchor } : undefined
      }));
    }
    if (this.strokeColor !== "#333333") json.strokeColor = this.strokeColor;
    if (this.strokeWidth !== 2) json.strokeWidth = this.strokeWidth;
    if (this.headDecoration !== "none") json.headDecoration = this.headDecoration;
    if (this.tailDecoration !== "arrow") json.tailDecoration = this.tailDecoration;
    return json;
  }

  // --- Connected-lines lifecycle ---

  rebindAnchors() {
    bindEndpoints(this, false, this._connectEl, this._disconnectEl);
    bindEndpoints(this, true, this._connectEl, this._disconnectEl);
  }

  activate() {
    super.activate();
    bindEndpoints(this, true, this._connectEl, this._disconnectEl);
  }

  deactivate() {
    if (!this.shouldFastDeactivate()) {
      bindEndpoints(this, false, this._connectEl, this._disconnectEl);
    }
    super.deactivate();
  }

  mounted() {
    super.mounted();
    this._syncBoundsFromPoints();
    bindEndpoints(this, true, this._connectEl, this._disconnectEl);
  }

  unmounted() {
    bindEndpoints(this, false, this._connectEl, this._disconnectEl);
    super.unmounted();
  }
}
