import { Rectangle } from "./rectangle";
import { ShapeOption, Element } from "@fulate/core";
import { qrDecompose } from "@fulate/util";

interface PinnedOptions {
  /** 目标元素 */
  target: (e: Pinned) => Element;
  /** 钉在目标上的归一化 X 位置 (0=左, 0.5=中, 1=右) */
  anchorX?: number;
  /** 钉在目标上的归一化 Y 位置 (0=上, 0.5=中, 1=下) */
  anchorY?: number;
  /** 自身锚点 X (0=左, 0.5=中, 1=右) */
  pivotX?: number;
  /** 自身锚点 Y (0=上, 0.5=中, 1=下) */
  pivotY?: number;
}

export interface PinnedMatrix extends PinnedOptions {
  /** 是否继承目标的旋转 */
  inheritRotation?: boolean;
  /** 是否继承目标的缩放 */
  inheritScale?: boolean;
  /** 是否继承目标的倾斜 */
  inheritSkew?: boolean;
  isPin?: false;
}

export interface PinnedAABB extends PinnedOptions {
  isPin?: true;
}

export class Pinned extends Rectangle {
  declare target: (e: Pinned) => Element;
  declare isPin: boolean;
  declare anchorX: number;
  declare anchorY: number;
  declare pivotX: number;
  declare pivotY: number;
  declare inheritRotation: boolean;
  declare inheritScale: boolean;
  declare inheritSkew: boolean;

  selectctbale = false

  constructor(options: ShapeOption & PinnedAABB);
  constructor(options: ShapeOption & PinnedMatrix);
  constructor(options: any) {
    super(options);
    this.target = options.target;
    this.isPin = options.isPin ?? false;
    this.anchorX = options.anchorX ?? 0;
    this.anchorY = options.anchorY ?? 0;
    this.pivotX = options.pivotX ?? 0.5;
    this.pivotY = options.pivotY ?? 0.5;
    this.inheritRotation = options.inheritRotation ?? true;
    this.inheritScale = options.inheritScale ?? true;
    this.inheritSkew = options.inheritSkew ?? true;
  }

  mount() {
    super.mount();
    this.provide("selectctbale", this.selectctbale);
  }

  applyGroupTransform() {}

  onParentResize() {}

  calcWorldMatrix() {
    const m = this._ownMatrixCache;

    // 1. 重置为单位矩阵
    m.a = 1;
    m.b = 0;
    m.c = 0;
    m.d = 1;
    m.e = 0;
    m.f = 0;

    const target = this.target(this);

    if (this.isPin) {
      const aabb = target.getBoundingRect();
      const worldAnchorX = aabb.left + aabb.width * this.anchorX;
      const worldAnchorY = aabb.top + aabb.height * this.anchorY;
      const worldX = worldAnchorX - this.width * this.pivotX;
      const worldY = worldAnchorY - this.height * this.pivotY;
      m.e = worldX + this.left;
      m.f = worldY + this.top;
    } else {
      const targetMatrix = target.getOwnMatrix();
      const worldAnchor = targetMatrix.transformPoint(
        new DOMPoint(this.anchorX * target.width, this.anchorY * target.height)
      );
      const decomposed = qrDecompose(targetMatrix);
      m.translateSelf(worldAnchor.x, worldAnchor.y);
      if (this.inheritRotation) {
        m.rotateSelf(0, 0, decomposed.angle);
      }
      if (this.inheritSkew && decomposed.skewX) {
        m.skewXSelf(decomposed.skewX);
      }
      if (this.inheritScale) {
        m.scaleSelf(decomposed.scaleX, decomposed.scaleY);
      }
      m.translateSelf(this.left, this.top);
      // 应用自身的 pivot 偏移（让自身的 pivotX/Y 点对齐到锚点）
      m.translateSelf(-this.pivotX * this.width, -this.pivotY * this.height);
      // 应用自身的旋转/缩放（如果 PinnedElement 本身也有独立变换）
      if (this.angle || this.scaleX !== 1 || this.scaleY !== 1) {
        const cx = this.pivotX * this.width;
        const cy = this.pivotY * this.height;
        m.translateSelf(cx, cy);
        if (this.angle) m.rotateSelf(0, 0, this.angle);
        if (this.scaleX !== 1 || this.scaleY !== 1) {
          m.scaleSelf(this.scaleX, this.scaleY);
        }
        m.translateSelf(-cx, -cy);
      }
    }

    return m;
  }
}
