//@ts-nocheck

import { Intersection } from "../util/Intersection";
import { Point, TOriginX, TOriginY } from "../util/point";
import { resolveOrigin } from "../util/resolveOrigin";
import { EventManage } from "./eventManage";
import { type Layer } from "./layer";
import { type Root } from "./root";

export interface BaseElementOption {
  left?: number;
  top?: number;
  angle?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  backgroundColor?: string | null;
  radius?: number | null;
  skewX?: number;
  skewY?: number;
  strokeWidth?: number;
  cursor?: string;
  selectable?: boolean;
  visible?: boolean;

  children?: Array<Element>;
}

export class Element extends EventTarget {
  type = "element";

  eventManage = new EventManage(this);

  root: Root;
  layer: Layer;
  parent: Element | undefined;
  children: Element[] | null = null;
  ownMatrixCache: DOMMatrix | null = null;
  isMounted = false;
  isDirty = true;

  left = 0;
  top = 0;
  angle = 0;
  width: number | undefined;
  height: number | undefined;
  scaleX = 1;
  scaleY = 1;
  originX: string = "center";
  originY: string = "center";
  backgroundColor: string | null = null;
  radius: number | null = null;
  skewX = 0;
  skewY = 0;
  strokeWidth = 0;
  cursor?: string;
  selectable?: boolean;
  visible?: boolean;

  constructor(options?: BaseElementOption) {
    super();
    this.setOptions(options, false);
  }

  render(ctx = this.layer.ctx) {
    if (this.children) {
      for (const child of this.children) {
        child.render(ctx);
      }
    }
    this.isDirty = false;
  }

  setOptions(options?: BaseElementOption, calc = true) {
    // this.isDirty = true;
    if (options) {
      Object.assign(this, options);
    }
    if (calc) {
      this.calcOwnMatrix();
      this.setCoords();
    }
    return this;
  }

  append(...children: Element[]) {
    if (!this.children) {
      this.children = [];
    }
    children.forEach((child) => {
      if (child.parent) {
        return;
      }
      child.parent = this;
      this.children.push(child);
    });
    return this;
  }

  addEventListener<T = MouseEvent>(
    type: string,
    callback: (ev: T) => void,
    options?: AddEventListenerOptions | boolean
  ): void {
    this.eventManage.hasUserEvent = true;
    super.addEventListener(type, callback, options);
  }

  setPositionByOrigin(
    pos: Point,
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
    this.setOptions({ left: center.x, top: center.y });
    this.isDirty = true;
    return this;
  }

  getOwnMatrix() {
    if (this.isDirty || !this.ownMatrixCache) {
      this.calcOwnMatrix();
      this.children?.forEach((v) => (v.isDirty = true));
    }
    return this.ownMatrixCache;
  }

  calcOwnMatrix() {
    const topLeft = this.getRelativeTopLeftPoint();
    const center = this.getRelativeCenterPoint();

    const matrix = new DOMMatrix();

    if (this.parent && this.parent !== this.root) {
      const parentMatrix = this.parent.getOwnMatrix();
      matrix.multiplySelf(parentMatrix);
    }

    matrix.translateSelf(topLeft.x, topLeft.y);

    if (this.angle) {
      // 2. 计算偏移量（左上角到旋转中心）
      const offsetX = center.x - topLeft.x;
      const offsetY = center.y - topLeft.y;

      matrix.translateSelf(offsetX, offsetY);
      matrix.rotateSelf(0, 0, this.angle);
      matrix.translateSelf(-offsetX, -offsetY);
    }

    this.ownMatrixCache = matrix;
    return matrix;
  }

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

  getWorldCenterPoint() {
    const relativeCenter = this.getRelativeCenterPoint(new Point(0, 0));
    return this.getWorldPoint(relativeCenter);
  }

  getWorldPoint(point) {
    const matrix = this.getOwnMatrix();
    return new Point(matrix.transformPoint(point));
  }

  getGlobalToLocal(point) {
    const inverseMatrix = this.getOwnMatrix().inverse();
    return point.matrixTransform(inverseMatrix);
  }

  getBoundingRect() {
    const corners = [
      new Point(0, 0), // 左上
      new Point(this.width, 0), // 右上
      new Point(this.width, this.height), // 右下
      new Point(0, this.height) // 左下
    ];

    const globalCorners = corners.map((corner) =>
      corner.matrixTransform(this.getOwnMatrix())
    );

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

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      left: minX, // 包围盒左上角 x
      top: minY, // 包围盒左上角 y
      width: maxX - minX, // 包围盒宽度
      height: maxY - minY // 包围盒高度
    };
  }

  getCoords() {
    return this.coords ?? this.setCoords().coords;
  }

  setCoords() {
    const finalMatrix = this.getOwnMatrix();
    const dim = this._getTransformedDimensions();

    const localPoints = [
      new Point(0, 0), // 左上
      new Point(dim.x, 0), // 右上
      new Point(dim.x, dim.y), // 右下
      new Point(0, dim.y) // 左下
    ];
    this.coords = localPoints.map(
      (point) => new Point(finalMatrix.transformPoint(point))
    );
    return this;
  }

  translateToGivenOrigin(
    point: Point,
    fromOriginX: TOriginX,
    fromOriginY: TOriginY,
    toOriginX: TOriginX,
    toOriginY: TOriginY
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

  hasPointHint(x: number, y: number): boolean {
    if (this.width === undefined || this.height === undefined) {
      return false;
    }

    const point = new Point(x, y);

    const localPoint = this.getGlobalToLocal(point);

    return (
      localPoint.x >= 0 &&
      localPoint.x <= this.width &&
      localPoint.y >= 0 &&
      localPoint.y <= this.height
    );
  }

  hasInView() {
    return true;
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

  containsPoint(point) {
    return Intersection.isPointInPolygon(point, this.getCoords());
  }

  _getTransformedDimensions(options?) {
    const dimOptions = {
      // if scaleX or scaleY are negative numbers,
      // this will return dimensions that are negative.
      // and this will break assumptions around the codebase
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      skewX: this.skewX,
      skewY: this.skewY,
      width: this.width,
      height: this.height,
      strokeWidth: this.strokeWidth,
      ...options
    };
    const strokeWidth = dimOptions.strokeWidth;
    let preScalingStrokeValue = strokeWidth,
      postScalingStrokeValue = 0;
    if (this.strokeUniform) {
      preScalingStrokeValue = 0;
      postScalingStrokeValue = strokeWidth;
    }
    const dimX = dimOptions.width + preScalingStrokeValue,
      dimY = dimOptions.height + preScalingStrokeValue,
      noSkew = dimOptions.skewX === 0 && dimOptions.skewY === 0;
    let finalDimensions;
    if (noSkew) {
      finalDimensions = new Point(
        dimX * dimOptions.scaleX,
        dimY * dimOptions.scaleY
      );
    } else {
      // finalDimensions = sizeAfterTransform(dimX, dimY, calcDimensionsMatrix(dimOptions));
    }
    // return finalDimensions.scalarAdd(postScalingStrokeValue);
    return new Point(
      finalDimensions.x + postScalingStrokeValue,
      finalDimensions.y + postScalingStrokeValue
    );
  }

  mounted() {
    this.isMounted = true;
    if (this.children) {
      for (const child of this.children) {
        child.parent = this;
        child.root = this.root;
        if (!child.layer) {
          child.layer = this.layer;
        }
        child.mounted();
      }
    }
  }

  unmounted() {
    if (this.children) {
      for (const child of this.children) {
        child.unmounted();
      }
    }
  }
}
