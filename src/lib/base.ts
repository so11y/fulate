//@ts-nocheck

import { Intersection } from "../util/Intersection";
import { Point, TOriginX, TOriginY } from "../util/point";
import { resolveOrigin } from "../util/resolveOrigin";
import { EventManage } from "./eventManage";
import { type Layer } from "./layer";
import { type Root } from "./root";

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

  constructor(options: any) {
    super();
    this.setOptions(options);
  }

  mounted() {
    this.isMounted = true;
    if (this.children) {
      for (const child of this.children) {
        child.parent = this;
        child.root = this.root;
        child.mounted();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (this.children) {
      for (const child of this.children) {
        child.calcOwnMatrix();
        child.render(ctx);
      }
    }
  }

  setOptions(options: any) {
    Object.assign(this, options);
    this.isDirty = true;
    this.calcOwnMatrix();
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

  setCoord() {
    // const center = this.getCenterPoint();
    // return new DOMMatrix()
    //   .translate(center.x, center.y)
    //   .rotate(0, 0, this.angle)
    //   .translate(-center.x, -center.y);
    // const center = this.getCenterPoint();
    // const tMatrix = createTranslateMatrix(center.x, center.y);
    // const rMatrix = createRotateMatrix({ angle: this.angle });
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
    // position = this.translateToGivenOrigin(
    //   center,
    //   this.originX,
    //   this.originY,
    //   CENTER,
    //   CENTER,
    // );
    this.setOptions({ left: center.x, top: center.y });
    return this;
  }

  calcOwnMatrix() {
    const topLeft = this.getRelativeTopLeftPoint();
    const center = this.getRelativeCenterPoint();

    const matrix = new DOMMatrix();

    if (this.parent && this.parent !== this.root) {
      const parentMatrix =
        this.parent.ownMatrixCache || this.parent.calcOwnMatrix();
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
    const matrix = this.ownMatrixCache;
    return new Point(matrix.transformPoint(point));
  }

  getGlobalToLocal(point) {
    const inverseMatrix = this.ownMatrixCache.inverse();
    return point.matrixTransform(inverseMatrix);
  }

  getBoundingBox() {
    const corners = [
      new Point(0, 0), // 左上
      new Point(this.width, 0), // 右上
      new Point(this.width, this.height), // 右下
      new Point(0, this.height) // 左下
    ];

    const globalCorners = corners.map((corner) =>
      corner.matrixTransform(this.ownMatrixCache)
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
    const finalMatrix = this.ownMatrixCache;
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
    return this.coords;
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

  hasPointHint(x, y): boolean {
    const point = new Point(x, y);
    // 如果元素没有宽度或高度，直接返回 false
    if (this.width === undefined || this.height === undefined) {
      return false;
    }

    // 将世界坐标点转换到元素的局部坐标
    const localPoint = this.getGlobalToLocal(point);

    // 检查点是否在元素的局部坐标边界内
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
    const { left, top, width, height } = this.getBoundingBox();
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
    if (this.children) {
      for (const child of this.children) {
        child.root = this.root;
        child.layer = this.layer;
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
