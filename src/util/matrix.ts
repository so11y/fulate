import { radiansToDegrees } from "./radiansDegreesConversion";

/**
 * QR 分解：从 2D 仿射矩阵中提取旋转角度、缩放和斜切。
 *
 * 原理：将矩阵 M 分解为 M = R(θ) · K · S，
 * 其中 R 是旋转、K 是斜切、S 是缩放。
 * 先通过 atan2 得到旋转角 θ，再用反向旋转消除 R，
 * 从剩余矩阵中提取 scale 和 skew。
 */
export function qrDecompose(matrix: DOMMatrix) {
  const { a, b, c, d } = matrix;

  const angleRad = Math.atan2(b, a);
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);

  // mUnrotated = R(-θ) · M = K · S
  const a1 = a * cos - b * sin;
  const c1 = c * cos - d * sin;
  const d1 = c * sin + d * cos;

  return {
    angle: radiansToDegrees(angleRad),
    scaleX: a1,
    scaleY: d1,
    skewX: radiansToDegrees(Math.atan2(c1, d1))
  };
}

/**
 * 从矩阵中提取物理变换参数（拉伸、旋转、翻转、位移）。
 * 与 qrDecompose 不同，此函数返回的是绝对拉伸量而非 scale/skew 分解。
 */
export function extractPhysicalTransform(matrix: DOMMatrix) {
  const { a, b, c, d, e, f } = matrix;

  const stretchX = Math.sqrt(a * a + b * b);
  const stretchY = Math.sqrt(c * c + d * d);
  const angle = Math.atan2(b, a);
  const det = a * d - b * c;
  const flip = det < 0 ? -1 : 1;

  return {
    stretchX,
    stretchY,
    angle,
    flip,
    translateX: e,
    translateY: f
  };
}
