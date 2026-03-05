import {
  degreesToRadians,
  radiansToDegrees
} from "../../../util/radiansDegreesConversion";
import { Point } from "../../../util/point";
import { type Select } from "./index";
import { FulateEvent } from "../../eventManage";
import { qrDecompose } from "../../../util/math";
import { Element } from "../../node/element";

interface Control {
  type: string;
  actionName: string;
  cursor: string;
  x: number;
  y: number;
  offsetY?: number;
  offsetX?: number;
  [key: string]: any;
}

interface SelectState {
  theta: number;
  left: number;
  top: number;
  width: number;
  height: number;
  worldCenterPoint: Point;
  angle: number;
  matrix: DOMMatrix;
}

export const Controls: Array<Control> = [
  {
    type: "tl",
    actionName: "scale",
    cursor: "crosshair",
    x: 0,
    y: 0,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, "tl");
    }
  },
  {
    type: "tr",
    actionName: "scale",
    cursor: "crosshair",
    x: 1,
    y: 0,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, "tr");
    }
  },
  {
    type: "br",
    actionName: "scale",
    cursor: "crosshair",
    x: 1,
    y: 1,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, "br");
    }
  },
  {
    type: "bl",
    actionName: "scale",
    cursor: "crosshair",
    x: 0,
    y: 1,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, "bl");
    }
  }
] as const;

export function rotateObjectWithSnapping(
  { target, ex, ey, theta, originX, originY }: any,
  x: number,
  y: number
) {
  const pivotPoint = target.translateToGivenOrigin(
    target.getRelativeCenterPoint(),
    originX,
    originY
  );
  const lastAngle = Math.atan2(ey - pivotPoint.y, ex - pivotPoint.x),
    curAngle = Math.atan2(y - pivotPoint.y, x - pivotPoint.x);
  let angle = radiansToDegrees(curAngle - lastAngle + theta);
  if (target.snapAngle && target.snapAngle > 0) {
    const snapAngle = target.snapAngle,
      snapThreshold = target.snapThreshold || snapAngle,
      rightAngleLocked = Math.ceil(angle / snapAngle) * snapAngle,
      leftAngleLocked = Math.floor(angle / snapAngle) * snapAngle;
    if (Math.abs(angle - leftAngleLocked) < snapThreshold) {
      angle = leftAngleLocked;
    } else if (Math.abs(angle - rightAngleLocked) < snapThreshold) {
      angle = rightAngleLocked;
    }
  }
  if (angle < 0) {
    angle = 360 + angle;
  }
  angle %= 360;
  return angle;
}

export function rotateCallback(
  selectEL: Select,
  point: Point,
  { theta }: SelectState,
  event: FulateEvent
) {
  console.log("rotateCallback");
  const angle = rotateObjectWithSnapping(
    {
      target: selectEL,
      ex: point.x,
      ey: point.y,
      originX: selectEL.originX,
      originY: selectEL.originY,
      theta
    },
    event.detail.x,
    event.detail.y
  );

  // Group._applyTransformToChildren ensures children are rotated automatically
  selectEL.setOptions({
    angle
  });
}

export function resizeObject(
  selectEL: any,
  preState: SelectState,
  event: any,
  type: string
) {
  const {
    width: pWidth,
    height: pHeight,
    matrix // 选框初始世界矩阵
  } = preState;

  // 1. 找出固定点(局部坐标)
  let fixedLocalX = 0;
  let fixedLocalY = 0;
  if (type.includes("r")) fixedLocalX = 0;
  else if (type.includes("l")) fixedLocalX = pWidth;

  if (type.includes("b")) fixedLocalY = 0;
  else if (type.includes("t")) fixedLocalY = pHeight;

  if (type === "mr") fixedLocalY = pHeight / 2;
  if (type === "ml") fixedLocalY = pHeight / 2;
  if (type === "mt") fixedLocalX = pWidth / 2;
  if (type === "mb") fixedLocalX = pWidth / 2;

  // 2. 将鼠标坐标转换到选框的未缩放局部坐标系中
  const mouseWorld = new Point(event.detail.x, event.detail.y);
  const inverseMatrix = DOMMatrix.fromMatrix(matrix).inverse();
  const mouseLocal = mouseWorld.matrixTransform(inverseMatrix);

  // 3. 计算局部坐标系下的拉伸比例
  let sx = 1;
  let sy = 1;

  if (type.includes("r")) sx = mouseLocal.x / pWidth;
  if (type.includes("l")) sx = (pWidth - mouseLocal.x) / pWidth;
  if (type.includes("b")) sy = mouseLocal.y / pHeight;
  if (type.includes("t")) sy = (pHeight - mouseLocal.y) / pHeight;

  if (type === "mr" || type === "ml") sy = 1;
  if (type === "mt" || type === "mb") sx = 1;

  // Shift 等比
  if (event.detail?.shiftKey && !["mt", "mb", "ml", "mr"].includes(type)) {
    const ratio = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx) * ratio;
    sy = Math.sign(sy) * ratio;
  }

  // 极小值保护
  sx = sx || 0.0001;
  sy = sy || 0.0001;

  // 4. 构造局部缩放矩阵，并求出新的世界矩阵
  const localScaleMatrix = new DOMMatrix()
    .translate(fixedLocalX, fixedLocalY)
    .scale(sx, sy)
    .translate(-fixedLocalX, -fixedLocalY);

  const newWorldMatrix = matrix.multiply(localScaleMatrix);

  // 5. 分解出新的 scaleX, scaleY, angle 等
  const { angle, scaleX, scaleY, skewX } = qrDecompose(newWorldMatrix);

  // 6. 求出新的中心点世界坐标，并反算出 left 和 top
  const newLocalCenter = new Point(pWidth / 2, pHeight / 2).matrixTransform(
    localScaleMatrix
  );
  const newWorldCenter = newLocalCenter.matrixTransform(matrix);

  const center = selectEL.getPositionByOrigin(newWorldCenter);

  selectEL.setOptions({
    angle,
    scaleX,
    scaleY,
    skewX,
    left: center.x,
    top: center.y
  });
}
