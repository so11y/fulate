import { radiansToDegrees } from "./radiansDegreesConversion";

export function decomposeMatrix(a: DOMMatrix) {
  const angle = Math.atan2(a.b, a.a),
    denom = Math.pow(a.a, 2) + Math.pow(a.b, 2),
    scaleX = Math.sqrt(denom),
    scaleY = (a.a * a.d - a.c * a.b) / scaleX,
    skewX = Math.atan2(a.a * a.c + a.b * a.d, denom);
  return {
    angle: radiansToDegrees(angle),
    scaleX,
    scaleY,
    skewX: radiansToDegrees(skewX),
    skewY: 0,
    translateX: a.e || 0,
    translateY: a.f || 0
  };
}

export function extractPhysicalTransform(matrix: DOMMatrix) {
  const { a, b, c, d, e, f } = matrix;

  // 1. 计算真实的物理拉伸量（斜边/底边的绝对像素长度）
  const stretchX = Math.sqrt(a * a + b * b);
  const stretchY = Math.sqrt(c * c + d * d);

  // 2. 提取绝对的纯净旋转角度（基于 X 轴的朝向）
  const angle = Math.atan2(b, a);

  // 3. 判断是否发生了镜像翻转 (行列式小于0)
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
