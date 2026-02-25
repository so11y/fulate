import {
  degreesToRadians,
  radiansToDegrees
} from "../../util/radiansDegreesConversion";
import { Point } from "../../util/point";
import { type Select } from "./index";
import { Element } from "../base";
import { FulateEvent } from "../eventManage";
import { qrDecompose } from "../../util/math";

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
  selectCenterPoint: Array<{
    width: number;
    height: number;
    matrix: DOMMatrix;
    worldCenterPoint: Point;
    el: Element;
    angle: number;
  }>;
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
  },
  // {
  //     type: "mb",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0,
  //     y: 0.5
  // },
  // {
  //     type: "ml",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: -0.5,
  //     y: 0
  // },
  // {
  //     type: "mr",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0.5,
  //     y: 0
  // },
  // {
  //     type: "mt",
  //     actionName: "scale",
  //     cursor: "crosshair",
  //     x: 0,
  //     y: -0.5
  // },
  {
    type: "mtr",
    actionName: "rotate",
    cursor: "crosshair",
    x: 0.5,
    y: 0,
    offsetY: -40,
    rotateObjectWithSnapping(
      //   eventData,
      { target, ex, ey, theta, originX, originY },
      x: number,
      y: number
    ) {
      const pivotPoint = target.translateToGivenOrigin(
        target.getRelativeCenterPoint(),
        originX,
        originY
      );
      // if (isLocked(target, "lockRotation")) {
      //     return false;
      // }
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
      // const hasRotated = target.angle !== angle;
      return angle;
    },
    callback(
      selectEL: Select,
      point: Point,
      { theta, selectCenterPoint }: SelectState,
      event: FulateEvent
    ) {
      const constraint = selectEL.getWorldCenterPoint();

      const angle = this.rotateObjectWithSnapping(
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

      const angleDelta = angle - selectEL.angle;

      const rotationMatrix = new DOMMatrix()
        .translate(constraint.x, constraint.y)
        .rotate(0, 0, angleDelta)
        .translate(-constraint.x, -constraint.y);

      selectCenterPoint.forEach(({ el }) => {
        const center = el.getPositionByOrigin(
          el.getWorldCenterPoint().matrixTransform(rotationMatrix)
        );
        el.setOptions({
          angle: el.angle + angleDelta,
          left: center.x,
          top: center.y
        }).layer.render();
      });

      selectEL
        .setOptions({
          angle
        })
        .layer.render();
    }
  }
] as const;

export function resizeObject(
  selectEL: any,
  preState: SelectState,
  event: any,
  type: string
) {
  const {
    left: pLeft,
    top: pTop,
    width: pWidth,
    height: pHeight,
    theta, // 选框初始弧度
    selectCenterPoint
  } = preState;

  // 1. 计算选框中心
  const cx = pLeft + pWidth / 2;
  const cy = pTop + pHeight / 2;
  const angleDeg = theta * (180 / Math.PI);

  // 2. 将鼠标坐标转换到选框的本地坐标系（未旋转状态）
  const unrotateMatrix = new DOMMatrix()
    .translate(cx, cy)
    .rotate(0, 0, -angleDeg)
    .translate(-cx, -cy);
  const mouse = new Point(event.detail).matrixTransform(unrotateMatrix);

  // 3. 计算缩放量 (sx, sy)
  // 逻辑：基于固定对角点(Fixed Point)计算拉伸比例
  const halfW = pWidth / 2;
  const halfH = pHeight / 2;
  let ox = 0,
    oy = 0;
  if (type.includes("r")) ox = -halfW;
  else if (type.includes("l")) ox = halfW;
  if (type.includes("b")) oy = -halfH;
  else if (type.includes("t")) oy = halfH;

  const fixedX = cx + ox;
  const fixedY = cy + oy;

  let sx = 1,
    sy = 1;
  if (type.includes("r")) sx = (mouse.x - fixedX) / pWidth;
  if (type.includes("l")) sx = (fixedX - mouse.x) / pWidth;
  if (type.includes("b")) sy = (mouse.y - fixedY) / pHeight;
  if (type.includes("t")) sy = (fixedY - mouse.y) / pHeight;

  // Shift 等比
  if (event.detail?.shiftKey && !["mt", "mb", "ml", "mr"].includes(type)) {
    const ratio = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx) * ratio;
    sy = Math.sign(sy) * ratio;
  }

  // 极小值保护
  sx = sx || 0.0001;
  sy = sy || 0.0001;

  const worldFixedPoint = new Point(fixedX, fixedY).matrixTransform(
    new DOMMatrix().translate(cx, cy).rotate(0, 0, angleDeg).translate(-cx, -cy)
  );

  const deltaMatrix = new DOMMatrix()
    .translate(worldFixedPoint.x, worldFixedPoint.y)
    .rotate(0, 0, angleDeg)
    .scale(sx, sy)
    .rotate(0, 0, -angleDeg)
    .translate(-worldFixedPoint.x, -worldFixedPoint.y);

  selectCenterPoint.forEach((snapshot) => {
    const { el, matrix, worldCenterPoint } = snapshot;

    const { angle, scaleX, scaleY, skewX } = qrDecompose(
      deltaMatrix.multiply(matrix)
    );

    const center = el.getPositionByOrigin(
      worldCenterPoint.matrixTransform(deltaMatrix)
    );
    el.setOptions({
      angle,
      scaleX,
      scaleY,
      skewX,
      left: center.x,
      top: center.y
    }).layer.render();

    // el.setOptions({
    //   angle,
    //   scaleX,
    //   scaleY,
    //   skewX
    // })
    //   .setPositionByOrigin(
    //     new Point(worldCenterPoint.matrixTransform(deltaMatrix)),
    //     "center",
    //     "center"
    //   )
    //   .layer.render();
  });

  // 6. 更新选框 UI 尺寸
  const newW = pWidth * Math.abs(sx);
  const newH = pHeight * Math.abs(sy);
  const newSelectCenter = new Point(cx, cy).matrixTransform(deltaMatrix);

  selectEL
    .setOptions({
      width: newW,
      height: newH,
      left: newSelectCenter.x - newW / 2,
      top: newSelectCenter.y - newH / 2
    })
    .render();
}
