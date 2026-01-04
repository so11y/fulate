import {
  degreesToRadians,
  radiansToDegrees
} from "../../util/radiansDegreesConversion";
import { Point } from "../../util/point";
import { type Select } from "./index";
import { Element } from "../base";
import { FulateEvent } from "../eventManage";

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
        // event,
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

      selectCenterPoint.forEach(({ el }, index) => {
        const childWorldCenter = el.getWorldCenterPoint();

        el.setOptions({
          angle: el.angle + angleDelta
        })
          .setPositionByOrigin(
            new Point(childWorldCenter.matrixTransform(rotationMatrix))
          )
          .layer.render();
      });

      selectEL
        .setOptions({
          angle
        })
        .render();
    }
  }
] as const;

export function resizeObject(
  selectEL: Select,
  preState: SelectState,
  event: FulateEvent,
  type: string
) {
  const {
    left: prevLeft,
    top: prevTop,
    width: prevWidth,
    height: prevHeight,
    theta,
    selectCenterPoint
  } = preState;

  // 1. 准备基础数据：中心点与角度
  const cx = prevLeft + prevWidth / 2;
  const cy = prevTop + prevHeight / 2;
  const degrees = radiansToDegrees(theta);

  // 逆旋转矩阵：将鼠标从【旋转世界】还原到【未旋转世界】 (Global -> Local)
  const unrotateMatrix = new DOMMatrix()
    .translate(cx, cy)
    .rotate(0, 0, -degrees)
    .translate(-cx, -cy);

  // 正向旋转矩阵：将计算好的点从【未旋转世界】放回【旋转世界】 (Local -> Global)
  const rotateMatrix = new DOMMatrix()
    .translate(cx, cy)
    .rotate(0, 0, degrees)
    .translate(-cx, -cy);

  //将当前鼠标位置“摆正”
  const mouse = new Point(event.detail).matrixTransform(unrotateMatrix);

  //在未旋转的坐标系下计算新尺寸和新中心
  const halfW = prevWidth / 2;
  const halfH = prevHeight / 2;

  let newW = prevWidth;
  let newH = prevHeight;
  let newCX = cx;
  let newCY = cy;

  switch (type) {
    case "tl": // 左上
      newW = cx + halfW - mouse.x;
      newH = cy + halfH - mouse.y;
      newCX = mouse.x + newW / 2;
      newCY = mouse.y + newH / 2;
      break;
    case "tr": // 右上
      newW = mouse.x - (cx - halfW);
      newH = cy + halfH - mouse.y;
      newCX = mouse.x - newW / 2;
      newCY = mouse.y + newH / 2;
      break;
    case "bl": // 左下
      newW = cx + halfW - mouse.x;
      newH = mouse.y - (cy - halfH);
      newCX = mouse.x + newW / 2;
      newCY = mouse.y - newH / 2;
      break;
    case "br": // 右下
      newW = mouse.x - (cx - halfW);
      newH = mouse.y - (cy - halfH);
      newCX = mouse.x - newW / 2;
      newCY = mouse.y - newH / 2;
      break;

    case "mt": // 中上 (Middle Top)
      // 宽度不变，只改高度。底边 (cy + halfH) 固定。
      // newW = prevWidth; // 保持默认
      newH = cy + halfH - mouse.y;
      newCY = mouse.y + newH / 2;
      // newCX = cx; // X轴中心保持不变
      break;
  }

  if (newW < 1 || newH < 1) {
    return;
  }

  // 将新的局部中心点旋转回全局坐标
  // newCX/newCY 是基于未旋转系算出来的，现在通过正向矩阵转回去
  const newGlobalCenter = new Point(newCX, newCY).matrixTransform(rotateMatrix);

  //  处理子元素缩放 (关键: 相对原中心的比例变换)
  const scaleX = newW / prevWidth;
  const scaleY = newH / prevHeight;

  if (selectCenterPoint && selectCenterPoint.length > 0) {
    selectCenterPoint.forEach(
      ({ el, worldCenterPoint, width, height, angle }) => {
        // 逆旋转到局部空间
        const localCenter = worldCenterPoint.matrixTransform(unrotateMatrix);

        // 计算相对于原中心(cx,cy)的向量并缩放
        const vecX = (localCenter.x - cx) * scaleX;
        const vecY = (localCenter.y - cy) * scaleY;

        //  算出缩放后的局部坐标
        const newLocalCenter = new Point(newCX + vecX, newCY + vecY);

        //  正向旋转回世界坐标
        const newChildCenter = newLocalCenter.matrixTransform(rotateMatrix);

        const childRad = degreesToRadians(angle);

        const relativeRad = childRad - theta; // 相对旋转弧度
        const cosValue = Math.cos(relativeRad);
        const sinValue = Math.sin(relativeRad);

        const childScaleX = Math.sqrt(
          Math.pow(scaleX * cosValue, 2) + Math.pow(scaleY * sinValue, 2)
        );

        const childScaleY = Math.sqrt(
          Math.pow(scaleX * sinValue, 2) + Math.pow(scaleY * cosValue, 2)
        );

        el.setOptions({
          width: (width || 0) * childScaleX,
          height: (height || 0) * childScaleY
        })
          .setPositionByOrigin(new Point(newChildCenter))
          .layer.render();
      }
    );
  }

  //  更新 Select 框 (left/top 为左上角)
  selectEL
    .setOptions({
      width: newW,
      height: newH,
      left: newGlobalCenter.x - newW / 2,
      top: newGlobalCenter.y - newH / 2
    })
    .render();
}
