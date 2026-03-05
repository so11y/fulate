import { Node } from "./node";
import { Point, PointType, TOriginX, TOriginY } from "../../util/point";
import { resolveOrigin } from "../../util/resolveOrigin";
import { Intersection } from "../../util/Intersection";
import { cloneDeep } from "lodash-es";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RectWithCenter extends Rect {
  centerX?: number;
  centerY?: number;
}

export interface RectPoint extends Omit<
  RectWithCenter,
  "centerX" | "centerY"
> {}

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
}

export class Transformable extends Node {
  // 变换属性
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

  // 尺寸 (用于计算包围盒)
  width: number | undefined;
  height: number | undefined;
  // strokeWidth = 0;

  // 缓存（对象池化，避免 GC）
  protected _ownMatrixCache: DOMMatrix = new DOMMatrix();
  protected _inverseOwnMatrixCache: DOMMatrix | null;
  protected _coords: Array<Point> | null = null;
  protected _snapPoints: Array<Point> | null = null;
  protected _boundingRectCache: RectWithCenter | null = null;
  _lastBoundingRect: RectWithCenter | null = null;


  getRelativeTopLeftPoint() {
    return new Point(this.left, this.top);
  }

  getRelativeCenterPoint(point = this.getRelativeTopLeftPoint()) {
    return this.translateToGivenOrigin(
      point,
      "left", // 从左上角开始
      "top",
      this.originX, // 到用户指定的原点
      this.originY
    );
  }

  // --- 矩阵与坐标核心逻辑 ---

  getOwnMatrix() {
    return this._ownMatrixCache;
  }

  calcWorldMatrix() {
    const m = this._ownMatrixCache;

    // 重置为单位矩阵
    m.a = 1;
    m.b = 0;
    m.c = 0;
    m.d = 1;
    m.e = 0;
    m.f = 0;

    // 继承父级世界矩阵
    if (this.parent) {
      m.multiplySelf(this.parent._ownMatrixCache);
    }

    // 应用本地变换
    const topLeft = this.getRelativeTopLeftPoint();
    const center = this.getRelativeCenterPoint(topLeft);

    m.translateSelf(topLeft.x, topLeft.y);

    const hasAngle = this.angle !== 0;
    const hasScale = this.scaleX !== 1 || this.scaleY !== 1;
    const hasSkew = this.skewX !== 0 || this.skewY !== 0;

    if (hasAngle || hasScale || hasSkew) {
      const offsetX = center.x - topLeft.x;
      const offsetY = center.y - topLeft.y;

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

  applyTransformToCtx(ctx: CanvasRenderingContext2D, customMatrix?: DOMMatrix) {
    const dpr = window.devicePixelRatio || 1;
    const matrix =
      customMatrix ??
      this.root.getViewPointMtrix().multiply(this.getOwnMatrix());

    ctx.setTransform(
      matrix.a * dpr,
      matrix.b * dpr,
      matrix.c * dpr,
      matrix.d * dpr,
      matrix.e * dpr,
      matrix.f * dpr
    );
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

  getBoundingRect(): RectWithCenter {
    if (this._boundingRectCache) return this._boundingRectCache;

    const globalCorners = this.getCoords();

    // 计算 min/max
    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    globalCorners.forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

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

  getLocalSnapPoints() {
    return this.getLocalPoints();
  }

  getLocalPoints() {
    const dim = this._getTransformedDimensions();
    return [
      new Point(0, 0), // 左上
      new Point(dim.x, 0), // 右上
      new Point(dim.x, dim.y), // 右下
      new Point(0, dim.y) // 左下
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
    // return Intersection.isPointInPolygon(point, this.getCoords());
  }

  _getTransformedDimensions(options?) {
    const dimOptions = {
      // if scaleX or scaleY are negative numbers,
      // this will return dimensions that are negative.
      // and this will break assumptions around the codebase
      // scaleX: this.scaleX,
      // scaleY: this.scaleY,
      // skewX: this.skewX,
      // skewY: this.skewY,
      width: this.width,
      height: this.height,
      //   strokeWidth: this.strokeWidth,
      ...options
    };
    const strokeWidth = 0; // dimOptions.strokeWidth;
    let preScalingStrokeValue = strokeWidth,
      postScalingStrokeValue = 0;
    // if (this.strokeUniform) {
    //   preScalingStrokeValue = 0;
    //   postScalingStrokeValue = strokeWidth;
    // }
    const dimX = dimOptions.width + preScalingStrokeValue,
      dimY = dimOptions.height + preScalingStrokeValue;

    return new Point(
      dimX + postScalingStrokeValue,
      dimY + postScalingStrokeValue
    );
  }

  translateToGivenOrigin(
    point: PointType,
    fromOriginX: TOriginX,
    fromOriginY: TOriginY,
    toOriginX: TOriginX = this.originX,
    toOriginY: TOriginY = this.originY
  ) {
    let x = point.x,
      y = point.y;
    const offsetX = resolveOrigin(toOriginX) - resolveOrigin(fromOriginX),
      offsetY = resolveOrigin(toOriginY) - resolveOrigin(fromOriginY);
    if (offsetX || offsetY) {
      const dim = this._getTransformedDimensions();
      x += offsetX * dim.x;
      y += offsetY * dim.y;
    }
    return new Point(x, y);
  }

  isContainedWithinRect(tl, br) {
    const { left, top, width, height } = this.getBoundingRect();
    return (
      left >= tl.x &&
      left + width <= br.x &&
      top >= tl.y &&
      top + height <= br.y
    );
  }

  intersectsWithRect(tl, br) {
    const intersection = Intersection.intersectPolygonRectangle(
      this.getCoords(),
      tl,
      br
    );
    return intersection.status === "Intersection";
  }

  getWorldCenterPoint() {
    const relativeCenter = this.getRelativeCenterPoint(new Point(0, 0));
    return this.getWorldPoint(relativeCenter);
  }

  setPositionByOrigin(
    pos: PointType,
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ) {
    const center = this.translateToGivenOrigin(
      pos,
      originX,
      originY,
      "left",
      "top"
    );
    //@ts-ignore
    this.setOptions({ left: center.x, top: center.y });
    this.markDirty();
    return this;
  }

  getPositionByOrigin(
    pos: PointType,
    originX: TOriginX = this.originX,
    originY: TOriginY = this.originY
  ) {
    return this.translateToGivenOrigin(pos, originX, originY, "left", "top");
  }

  // ========== 脏标记机制 ==========

  hasDirty() {
    return this.isDirty;
  }

  clearDirty() {
    this.isDirty = false;
  }

  markDirty() {
    if (this.isDirty) return this;

    this.isDirty = true;
    this._coords = null;
    this._snapPoints = null;
    this._lastBoundingRect = cloneDeep(this._boundingRectCache);
    this._boundingRectCache = null;
    this._inverseOwnMatrixCache = null;
    this.markChildDirty();
    if (this.layer) {
      this.layer.addDirtyNode(this as any);
      this.layer.requestRender?.();
    }

    return this;
  }

  updateTransform(parentWorldDirty: boolean = false) {
    const shouldUpdate = parentWorldDirty || this.isDirty;

    if (shouldUpdate) {
      this.calcWorldMatrix();
      this._boundingRectCache = null;
      if (this.width && this.height) {
        this.setCoords();
      }
      this.isDirty = false;
      this.layer?.syncRbush(this as any);
    }

    if (shouldUpdate || this.hasDirtyChild) {
      if (this.children) {
        for (let i = 0; i < this.children.length; i++) {
          const child = this.children[i] as any;
          if (child.updateTransform && (child.isDirty || shouldUpdate)) {
            child.updateTransform(shouldUpdate);
          }
        }
      }
      this.hasDirtyChild = false;
    }
  }
}
