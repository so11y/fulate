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
