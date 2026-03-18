import { Node } from "./node";
import { Point, PointType, TOriginX, TOriginY } from "@fulate/util";
import { resolveOrigin } from "@fulate/util";
import { RectWithCenter, makeBoundingBoxFromPoints } from "@fulate/util";
import { CustomEvent } from "@fulate/util";

export interface TransformableOptions {
  left?: number;
  top?: number;
  angle?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: TOriginX;
  originY?: TOriginY;
  skewX?: number;
  skewY?: number;
  fitWidth?: boolean;
  fitHeight?: boolean;
  [P: string]: any;
}

export class Transformable extends Node {
  left = 0;
  top = 0;
  angle = 0;
  scaleX = 1;
  scaleY = 1;
  skewX = 0;
  skewY = 0;
  originX: TOriginX = "center";
  originY: TOriginY = "center";
  declare parent: this;

  width: number | undefined;
  height: number | undefined;
  fitWidth = false;
  fitHeight = false;
  _hasExplicitWidth = false;
  _hasExplicitHeight = false;

  protected _ownMatrixCache: DOMMatrix = new DOMMatrix();
  protected _inverseOwnMatrixCache: DOMMatrix | null;
  protected _coords: Array<Point> | null = null;
  protected _snapPoints: Array<Point> | null = null;
  protected _boundingRectCache: RectWithCenter | null = null;
  _unionBoundsCache: RectWithCenter | null = null;
  _lastUnionBounds: RectWithCenter | null = null;

  private _tempCenter = new Point(0, 0);

  getRelativeCenterPoint(x = this.left, y = this.top) {
    const c = this._tempCenter;
    const ox = resolveOrigin(this.originX) - resolveOrigin("left" as TOriginX);
    const oy = resolveOrigin(this.originY) - resolveOrigin("top" as TOriginY);
    c.x = x + ox * this.width!;
    c.y = y + oy * this.height!;
    return c;
  }

  // --- 矩阵与坐标核心逻辑 ---

  getOwnMatrix() {
    return this._ownMatrixCache;
  }

  calcWorldMatrix() {
    const m = this._ownMatrixCache;

    m.a = 1;
    m.b = 0;
    m.c = 0;
    m.d = 1;
    m.e = 0;
    m.f = 0;

    if (this.parent) {
      m.multiplySelf(this.parent._ownMatrixCache);
      if ((this.parent as any).isScrollContainer) {
        m.translateSelf(
          -(this.parent as any).scrollX,
          -(this.parent as any).scrollY
        );
      }
    }

    const center = this.getRelativeCenterPoint();

    m.translateSelf(this.left, this.top);

    const hasAngle = this.angle !== 0;
    const hasScale = this.scaleX !== 1 || this.scaleY !== 1;
    const hasSkew = this.skewX !== 0 || this.skewY !== 0;

    if (hasAngle || hasScale || hasSkew) {
      const offsetX = center.x - this.left;
      const offsetY = center.y - this.top;

      m.translateSelf(offsetX, offsetY);

      if (hasAngle) m.rotateSelf(0, 0, this.angle);
      if (hasSkew) {
        if (this.skewX) m.skewXSelf(this.skewX);
        if (this.skewY) m.skewYSelf(this.skewY);
      }
      if (hasScale) m.scaleSelf(this.scaleX, this.scaleY);

      m.translateSelf(-offsetX, -offsetY);
    }

    return m;
  }

  applyTransformToCtx(ctx: CanvasRenderingContext2D) {
    this.root.applyViewPointTransform(ctx, this._ownMatrixCache);
  }

  getWorldPoint(point: Point) {
    const matrix = this.getOwnMatrix();
    return new Point(matrix.transformPoint(point));
  }

  getGlobalToLocal(point: Point) {
    if (this._inverseOwnMatrixCache) {
      return new Point(this._inverseOwnMatrixCache.transformPoint(point));
    }
    const inverseMatrix = this.getOwnMatrix().inverse();
    this._inverseOwnMatrixCache = inverseMatrix;
    return new Point(inverseMatrix.transformPoint(point));
  }

  // --- 几何与碰撞检测 ---

  //这个是自己的范围，不包含子的，处理碰撞，检查鼠标 ，aabb
  getBoundingRect(): RectWithCenter {
    if (this._boundingRectCache) return this._boundingRectCache;
    this._boundingRectCache = makeBoundingBoxFromPoints(this.getCoords());
    return this._boundingRectCache;
  }

  //包含自己的，也包含所有子节点的，用来一般做脏矩形清理
  //绘制select的矩形大小
  getUnionBoundingRect(): RectWithCenter {
    return this._unionBoundsCache ?? this.getBoundingRect();
  }

  _computeUnionBounds() {
    const own = this.getBoundingRect();
    if (!this.children?.length) {
      this._unionBoundsCache = own;
      return;
    }

    let minX = own.left;
    let minY = own.top;
    let maxX = own.left + own.width;
    let maxY = own.top + own.height;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i] as any;
      if (!child.visible || child.width === undefined) continue;
      const cb: RectWithCenter | null = child._unionBoundsCache;
      if (!cb) continue;
      if (
        cb.left >= minX &&
        cb.top >= minY &&
        cb.left + cb.width <= maxX &&
        cb.top + cb.height <= maxY
      ) {
        continue;
      }
      if (cb.left < minX) minX = cb.left;
      if (cb.top < minY) minY = cb.top;
      if (cb.left + cb.width > maxX) maxX = cb.left + cb.width;
      if (cb.top + cb.height > maxY) maxY = cb.top + cb.height;
    }

    this._unionBoundsCache = {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  }

  getSnapPoints(): Point[] {
    if (this._snapPoints) {
      return this._snapPoints;
    }
    const finalMatrix = this.getOwnMatrix();
    this._snapPoints = this.getLocalSnapPoints().map(
      (point) => new Point(finalMatrix.transformPoint(point))
    );
    return this._snapPoints;
  }

  /**
   * 专用来复写， 绘制吸附点位 默认复用getLocalPoints
   */
  getLocalSnapPoints() {
    return this.getLocalPoints();
  }

  /**
   * 专用来复写， 绘制图形的顶点，默认矩形
   */
  getLocalPoints() {
    return [
      new Point(0, 0),
      new Point(this.width!, 0),
      new Point(this.width!, this.height!),
      new Point(0, this.height!)
    ];
  }

  getCoords() {
    return this._coords ?? this.setCoords()._coords;
  }

  setCoords() {
    const finalMatrix = this.getOwnMatrix();
    this._coords = this.getLocalPoints().map(
      (point) => new Point(finalMatrix.transformPoint(point))
    );
    return this;
  }

  hasPointHint(point: Point): boolean {
    if (this.width === undefined || this.height === undefined) {
      return false;
    }
    const localPoint = this.getGlobalToLocal(point);

    return (
      localPoint.x >= 0 &&
      localPoint.x <= this.width &&
      localPoint.y >= 0 &&
      localPoint.y <= this.height
    );
  }

  getPositionByOrigin(
    point: PointType,
    fromOriginX: TOriginX = this.originX,
    fromOriginY: TOriginY = this.originY,
    toOriginX: TOriginX = "left",
    toOriginY: TOriginY = "top",
    out?: Point
  ) {
    let x = point.x,
      y = point.y;
    const offsetX = resolveOrigin(toOriginX) - resolveOrigin(fromOriginX),
      offsetY = resolveOrigin(toOriginY) - resolveOrigin(fromOriginY);
    if (offsetX || offsetY) {
      x += offsetX * this.width!;
      y += offsetY * this.height!;
    }
    if (out) {
      out.x = x;
      out.y = y;
      return out;
    }
    return new Point(x, y);
  }

  getWorldCenterPoint() {
    const relativeCenter = this.getRelativeCenterPoint(0, 0);
    return this.getWorldPoint(relativeCenter);
  }

  // ========== 脏标记机制 ==========

  /**
   * 清除几何缓存。
   *
   * @param trackDirtyBounds 是否将当前 _unionBoundsCache 合并到 _lastUnionBounds。
   *   - true（markNeedsLayout 调用）：记录"脏之前的渲染位置"，用于 getDirtyRect
   *     计算需要清除的旧像素区域。使用 merge 而非覆盖，确保同一帧内多次
   *     dirty cycle（如 updateTransform → postUpdate → 再次 markNeedsLayout）
   *     不会丢失最初的渲染位置。
   *   - false（updateTransform 调用）：仅清除缓存以便重新计算，
   *     不修改 _lastUnionBounds，避免中间计算值（从未被渲染）
   *     污染脏区域追踪。
   */
  private invalidateCache(trackDirtyBounds = false) {
    this._coords = null;
    this._snapPoints = null;
    if (trackDirtyBounds && this._unionBoundsCache) {
      if (this._lastUnionBounds) {
        const minX = Math.min(this._lastUnionBounds.left, this._unionBoundsCache.left);
        const minY = Math.min(this._lastUnionBounds.top, this._unionBoundsCache.top);
        const maxX = Math.max(
          this._lastUnionBounds.left + this._lastUnionBounds.width,
          this._unionBoundsCache.left + this._unionBoundsCache.width
        );
        const maxY = Math.max(
          this._lastUnionBounds.top + this._lastUnionBounds.height,
          this._unionBoundsCache.top + this._unionBoundsCache.height
        );
        this._lastUnionBounds = {
          left: minX, top: minY,
          width: maxX - minX, height: maxY - minY,
          centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2
        };
      } else {
        this._lastUnionBounds = this._unionBoundsCache;
      }
    }
    this._boundingRectCache = null;
    this._unionBoundsCache = null;
    this._inverseOwnMatrixCache = null;
  }

  markPaintDirty() {
    if (this.layer) {
      this.layer.addPaintDirtyNode(this as any);
      this.layer.requestRender?.();
    }
    return this;
  }

  markNeedsLayout() {
    if (this.isDirty) return this;

    this.isDirty = true;
    this.invalidateCache(true);
    this.markChildDirty();
    if (this.layer) {
      this.layer.addDirtyNode(this as any);
      this.layer.requestRender?.();
    }

    return this;
  }

  resolveFitSize() {
    if (this.parent) {
      if (this.fitWidth && !this._hasExplicitWidth && this.parent.width !== undefined) {
        this.width = this.parent.width;
      }
      if (this.fitHeight && !this._hasExplicitHeight && this.parent.height !== undefined) {
        this.height = this.parent.height;
      }
    }
  }

  bubbleUpdateTransform() {
    const frameId = this.layer?._frameId ?? 0;
    if (this._lastUpdateFrame === frameId) return;
    this._lastUpdateFrame = frameId;

    if (this.parent && this.parent._lastUpdateFrame !== frameId && this.parent.isDirty) {
      (this.parent as Transformable).bubbleUpdateTransform();
    }

    this.updateTransform(false);
  }

  updateTransform(parentWorldDirty: boolean = false) {
    const shouldUpdate = parentWorldDirty || this.isDirty;

    if (shouldUpdate) {
      this.resolveFitSize();
      this.calcWorldMatrix();
      this.invalidateCache();
      this.layer?.syncRbush(this as any);
      this.isDirty = false;

      if ((this as any).connectedLines?.size) {
        this.dispatchEvent(
          new CustomEvent("transformUpdated", { bubbles: false })
        );
      }
    }

    if (shouldUpdate || this.isDirtyChild) {
      if (this.children) {
        for (let i = 0; i < this.children.length; i++) {
          const child = this.children[i] as any;
          if (
            child.updateTransform &&
            (child.isDirty || child.isDirtyChild || shouldUpdate)
          ) {
            child.updateTransform(shouldUpdate);
          }
        }
      }
      this.isDirtyChild = false;
      this._computeUnionBounds();
    }
  }

  unmounted(): void {
    this._lastUnionBounds = this._unionBoundsCache ?? this._lastUnionBounds;
    this._coords = null;
    this._ownMatrixCache = null;
    this._snapPoints = null;
    this._boundingRectCache = null;
    this._unionBoundsCache = null;
    super.unmounted();
  }
}
