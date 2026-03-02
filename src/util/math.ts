import { RectPoint } from "../lib/node/transformable";
import { halfPI } from "./constants";
import { radiansToDegrees } from "./radiansDegreesConversion";
export function cos(angle: number) {
  if (angle === 0) {
    return 1;
  }
  const angleSlice = Math.abs(angle) / halfPI;
  switch (angleSlice) {
    case 1:
    case 3:
      return 0;
    case 2:
      return -1;
  }
  return Math.cos(angle);
}

export function sin(angle: number) {
  if (angle === 0) {
    return 0;
  }
  const angleSlice = angle / halfPI;
  const value = Math.sign(angle);
  switch (angleSlice) {
    case 1:
      return value;
    case 2:
      return 0;
    case 3:
      return -value;
  }
  return Math.sin(angle);
}

export function qrDecompose(matrix: DOMMatrix) {
  const { a, b, c, d } = matrix;

  const newAngleRad = Math.atan2(b, a);
  const cos = Math.cos(-newAngleRad);
  const sin = Math.sin(-newAngleRad);

  // “回旋”矩阵，消除旋转影响，剩下 Skew 和 Scale
  // mUnrotated = R(-theta) * M = K * S
  const a1 = a * cos - b * sin;
  const c1 = c * cos - d * sin;
  //   const b1 = a * sin + b * cos; // 理论上应为 0
  const d1 = c * sin + d * cos;

  const resScaleX = a1;
  const resScaleY = d1;
  const resSkewXRad = Math.atan2(c1, d1); // 从 K*S 中提取 skewX

  return {
    angle: radiansToDegrees(newAngleRad),
    scaleX: resScaleX,
    scaleY: resScaleY,
    skewX: radiansToDegrees(resSkewXRad)
  };
}

export function mergeTwoRects(rect1: RectPoint, rect2: RectPoint): RectPoint {
  if (!rect1) return { ...rect2 };
  if (!rect2) return { ...rect1 };

  return {
    left: Math.min(rect1.left, rect2.left),
    top: Math.min(rect1.top, rect2.top),
    width:
      Math.max(rect1.left + rect1.width, rect2.left + rect2.width) -
      Math.min(rect1.left, rect2.left),
    height:
      Math.max(rect1.top + rect1.height, rect2.top + rect2.height) -
      Math.min(rect1.top, rect2.top)
  };
}
