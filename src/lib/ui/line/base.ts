import { Intersection } from "../../../util/Intersection";
import { makeBoundingBoxFromPoints, Point } from "../../../util/point";
import { BaseElementOption, Element } from "../../node/element";
import { RectWithCenter } from "../../node/transformable";
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
 * Abstract base class for all line-type elements (straight, bezier, etc.).
 * Manages linePoints in world coordinates, anchor connections, history
 * serialization, group transforms, and bounding-box computation.
 * Subclasses only need to implement paint() and getControlSchema().
 */
export abstract class BaseLine extends Element {
  linePoints: LinePointData[] = [];
  strokeColor = "#333333";
  strokeWidth = 2;

  constructor(options?: LineOption) {
    super(options);
    if (options?.linePoints) this.linePoints = options.linePoints;
    if (options?.strokeColor) this.strokeColor = options.strokeColor;
    if (options?.strokeWidth != null) this.strokeWidth = options.strokeWidth;
    this._syncBoundsFromPoints();
  }

  // --- Point management ---

  addPoint(x: number, y: number, anchor?: LineAnchor) {
    this.linePoints.push({ x, y, anchor });
    this._syncBoundsFromPoints();
    this.markDirty();
    if (anchor && this.root) {
      const el = this.root.idElements.get(anchor.elementId);
      if (el) (el.connectedLines ??= new Set()).add(this.id);
    }
  }

  movePoint(index: number, x: number, y: number) {
    const p = this.linePoints[index];
    if (p.anchor) {
      this._unregisterAnchor(p.anchor.elementId);
    }
    p.x = x;
    p.y = y;
    p.anchor = undefined;
    this._syncBoundsFromPoints();
    this.markDirty();
  }

  insertPoint(index: number, x: number, y: number) {
    this.linePoints.splice(index, 0, { x, y });
    this._syncBoundsFromPoints();
    this.markDirty();
  }

  removePoint(index: number) {
    if (this.linePoints.length <= 2) return;
    const p = this.linePoints[index];
    if (p.anchor) {
      this._unregisterAnchor(p.anchor.elementId);
    }
    this.linePoints.splice(index, 1);
    this._syncBoundsFromPoints();
    this.markDirty();
  }

  _unregisterAnchor(elementId: string) {
    if (!this.root) return;
    const stillConnected = this.linePoints.some(
      (p) => p.anchor?.elementId === elementId
    );
    if (!stillConnected) {
      const el = this.root.idElements.get(elementId);
      if (el) el.connectedLines?.delete(this.id);
    }
  }

  // --- Bounds ---

  _syncBoundsFromPoints() {
    if (this.linePoints.length === 0) {
      this.left = 0;
      this.top = 0;
      this.width = 0;
      this.height = 0;
      return;
    }
    const rect = makeBoundingBoxFromPoints(this.linePoints as Point[]);
    this.left = rect.left;
    this.top = rect.top;
    this.width = rect.width || 1;
    this.height = rect.height || 1;
  }

  syncAnchors(): boolean {
    if (!this.root) return false;
    let changed = false;
    for (const p of this.linePoints) {
      if (!p.anchor) continue;
      const el = this.root.idElements.get(p.anchor.elementId);
      if (!el) continue;
      const pos = getElementAnchorPoint(el, p.anchor.anchorType);
      if (Math.abs(pos.x - p.x) > 0.01 || Math.abs(pos.y - p.y) > 0.01) {
        p.x = pos.x;
        p.y = pos.y;
        changed = true;
      }
    }
    if (changed) {
      this._syncBoundsFromPoints();
    }
    return changed;
  }

  // --- Options (translation + history restore) ---

  private _syncConnectedLines(
    oldPoints: LinePointData[],
    newPoints: LinePointData[]
  ) {
    if (!this.root) return;
    for (const p of oldPoints) {
      if (p.anchor) this._unregisterAnchor(p.anchor.elementId);
    }
    for (const p of newPoints) {
      if (p.anchor) {
        const el = this.root.idElements.get(p.anchor.elementId);
        if (el) (el.connectedLines ??= new Set()).add(this.id);
      }
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

    const prevLeft = this.left;
    const prevTop = this.top;
    const result = super.quickSetOptions(options);
    if (this.linePoints.length > 0) {
      const dx = this.left - prevLeft;
      const dy = this.top - prevTop;
      if (dx !== 0 || dy !== 0) {
        for (const p of this.linePoints) {
          p.x += dx;
          p.y += dy;
        }
      }
    }
    return result;
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

    const prevLeft = this.left;
    const prevTop = this.top;
    const result = super.setOptions(options, syncCalc);
    if (this.linePoints.length > 0 && options) {
      const dx = this.left - prevLeft;
      const dy = this.top - prevTop;
      if (dx !== 0 || dy !== 0) {
        for (const p of this.linePoints) {
          p.x += dx;
          p.y += dy;
        }
      }
    }
    return result;
  }

  // --- Geometry ---

  protected _getVisualPadding(): number {
    const scale = this.root?.viewport?.scale || 1;
    return Math.max(10, Math.ceil(this.strokeWidth / scale + 6 / scale));
  }

  getBoundingRect(): RectWithCenter {
    if (this._boundingRectCache) return this._boundingRectCache;
    if (this.linePoints.length < 2) return super.getBoundingRect();

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of this.linePoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const pad = this._getVisualPadding();
    this._boundingRectCache = {
      left: minX - pad,
      top: minY - pad,
      width: maxX - minX + pad * 2 || 1,
      height: maxY - minY + pad * 2 || 1,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
    return this._boundingRectCache;
  }

  hasPointHint(point: Point): boolean {
    if (this.linePoints.length < 2) return false;
    const threshold = Math.max(5 / (this.root?.viewport?.scale || 1), 3);

    for (let i = 0; i < this.linePoints.length - 1; i++) {
      const a = this.linePoints[i];
      const b = this.linePoints[i + 1];
      const dist = Intersection.pointToLineSegmentDistance(
        point,
        new Point(a.x, a.y),
        new Point(b.x, b.y)
      );
      if (dist <= threshold) return true;
    }

    const vertexThreshold = Math.max(6 / (this.root?.viewport?.scale || 1), 4);
    for (const p of this.linePoints) {
      if (point.pointDistance(p, vertexThreshold)) return true;
    }
    return false;
  }

  getCoords() {
    if (this._coords) return this._coords;
    const rect = this.getBoundingRect();
    this._coords = [
      new Point(rect.left, rect.top),
      new Point(rect.left + rect.width, rect.top),
      new Point(rect.left + rect.width, rect.top + rect.height),
      new Point(rect.left, rect.top + rect.height)
    ];
    return this._coords;
  }

  setCoords() {
    this._coords = null;
    this.getCoords();
    return this;
  }

  getSnapPoints(): Point[] {
    return this.linePoints.map((p) => new Point(p.x, p.y));
  }

  hasInView(): boolean {
    if (this.linePoints.length < 2) return false;
    return super.hasInView();
  }

  // --- Group transform protocol ---

  private _snapshotLinePoints: LinePointData[] | null = null;
  private _snapshotWorldMatrix: DOMMatrix | null = null;

  snapshotForGroup(): void {
    this._snapshotLinePoints = this.linePoints.map((p) => ({
      x: p.x,
      y: p.y,
      anchor: p.anchor ? { ...p.anchor } : undefined
    }));
    this._snapshotWorldMatrix = DOMMatrix.fromMatrix(this.calcWorldMatrix());
  }

  applyGroupTransform(targetMatrix: DOMMatrix): void {
    if (!this._snapshotLinePoints || !this._snapshotWorldMatrix) return;
    const delta = targetMatrix.multiply(this._snapshotWorldMatrix.inverse());
    for (
      let i = 0;
      i < this._snapshotLinePoints.length && i < this.linePoints.length;
      i++
    ) {
      const sp = this._snapshotLinePoints[i];
      const np = new DOMPoint(sp.x, sp.y, 0, 1).matrixTransform(delta);
      this.linePoints[i].x = np.x;
      this.linePoints[i].y = np.y;
      this.linePoints[i].anchor = sp.anchor;
    }
    this._syncBoundsFromPoints();
    this.markDirty();
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

  activate() {
    super.activate();
    for (const p of this.linePoints) {
      if (p.anchor) {
        const el = this.root?.idElements.get(p.anchor.elementId);
        if (el) (el.connectedLines ??= new Set()).add(this.id);
      }
    }
  }

  deactivate() {
    for (const p of this.linePoints) {
      if (p.anchor) {
        const el = this.root?.idElements.get(p.anchor.elementId);
        if (el) el.connectedLines?.delete(this.id);
      }
    }
    super.deactivate();
  }

  mounted() {
    super.mounted();
    for (const p of this.linePoints) {
      if (p.anchor) {
        const el = this.root?.idElements.get(p.anchor.elementId);
        if (el) (el.connectedLines ??= new Set()).add(this.id);
      }
    }
  }

  unmounted() {
    for (const p of this.linePoints) {
      if (p.anchor) {
        const el = this.root?.idElements.get(p.anchor.elementId);
        if (el) el.connectedLines?.delete(this.id);
      }
    }
    super.unmounted();
  }
}
