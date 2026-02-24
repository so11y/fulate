import {
  degreesToRadians,
  radiansToDegrees,
} from '../../util/radiansDegreesConversion';
import { Point } from '../../util/point';
import { type Select } from './index';
import { Element } from '../base';
import { FulateEvent } from '../eventManage';

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
    type: 'tl',
    actionName: 'scale',
    cursor: 'crosshair',
    x: 0,
    y: 0,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, 'tl');
    },
  },
  {
    type: 'tr',
    actionName: 'scale',
    cursor: 'crosshair',
    x: 1,
    y: 0,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, 'tr');
    },
  },
  {
    type: 'br',
    actionName: 'scale',
    cursor: 'crosshair',
    x: 1,
    y: 1,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, 'br');
    },
  },
  {
    type: 'bl',
    actionName: 'scale',
    cursor: 'crosshair',
    x: 0,
    y: 1,
    callback(
      selectEL: Select,
      point: Point,
      selectState: SelectState,
      event: FulateEvent
    ) {
      return resizeObject(selectEL, selectState, event, 'bl');
    },
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
    type: 'mtr',
    actionName: 'rotate',
    cursor: 'crosshair',
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
          theta,
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
          angle: el.angle + angleDelta,
        })
          .setPositionByOrigin(
            new Point(childWorldCenter.matrixTransform(rotationMatrix))
          )
          .layer.render();
      });

      selectEL
        .setOptions({
          angle,
        })
        .render();
    },
  },
] as const;

export function resizeObject(
  selectEL: any,
  preState: any, // 你的快照：包含 selectCenterPoint, theta, width, height, left, top
  event: any,
  type: string
) {
  const {
    left: pLeft,
    top: pTop,
    width: pWidth,
    height: pHeight,
    theta, // 选框初始弧度
    selectCenterPoint, // 快照数组: { el, matrix, worldCenterPoint, width, height }
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
  if (type.includes('r')) ox = -halfW;
  else if (type.includes('l')) ox = halfW;
  if (type.includes('b')) oy = -halfH;
  else if (type.includes('t')) oy = halfH;

  const fixedX = cx + ox;
  const fixedY = cy + oy;

  let sx = 1,
    sy = 1;
  if (type.includes('r')) sx = (mouse.x - fixedX) / pWidth;
  if (type.includes('l')) sx = (fixedX - mouse.x) / pWidth;
  if (type.includes('b')) sy = (mouse.y - fixedY) / pHeight;
  if (type.includes('t')) sy = (fixedY - mouse.y) / pHeight;

  // Shift 等比
  if (event.detail?.shiftKey && !['mt', 'mb', 'ml', 'mr'].includes(type)) {
    const ratio = Math.max(Math.abs(sx), Math.abs(sy));
    sx = Math.sign(sx) * ratio;
    sy = Math.sign(sy) * ratio;
  }

  // 极小值保护
  sx = sx || 0.0001;
  sy = sy || 0.0001;

  // 4. 构建全局【空间增量变换矩阵】 (Delta Matrix)
  // 这是 LeaferJS 的核心：它代表了从按下鼠标到这一帧，整个选区发生的形变
  const worldFixedPoint = new Point(fixedX, fixedY).matrixTransform(
    new DOMMatrix().translate(cx, cy).rotate(0, 0, angleDeg).translate(-cx, -cy)
  );

  const deltaMatrix = new DOMMatrix()
    .translate(worldFixedPoint.x, worldFixedPoint.y)
    .rotate(0, 0, angleDeg)
    .scale(sx, sy)
    .rotate(0, 0, -angleDeg)
    .translate(-worldFixedPoint.x, -worldFixedPoint.y);

  // 5. 应用到子元素并精准分解
  selectCenterPoint.forEach((snapshot: any) => {
    const { el, matrix, worldCenterPoint } = snapshot;

    // A. 算出该元素最新的世界矩阵 (Delta * Original)
    const m = deltaMatrix.multiply(matrix);

    // B. 【精准分解逻辑】 匹配 base.ts 顺序: Rotate -> SkewX -> Scale
    // 设矩阵 M = R * K * S
    const newAngleRad = Math.atan2(m.b, m.a);
    const cos = Math.cos(-newAngleRad);
    const sin = Math.sin(-newAngleRad);

    // “回旋”矩阵，消除旋转影响，剩下 Skew 和 Scale
    // mUnrotated = R(-theta) * M = K * S
    const a1 = m.a * cos - m.b * sin;
    const c1 = m.c * cos - m.d * sin;
    const b1 = m.a * sin + m.b * cos; // 理论上应为 0
    const d1 = m.c * sin + m.d * cos;

    const resScaleX = a1;
    const resScaleY = d1;
    const resSkewXRad = Math.atan2(c1, d1); // 从 K*S 中提取 skewX

    // C. 计算物体新的中心点
    const newCenter = new Point(
      worldCenterPoint.x,
      worldCenterPoint.y
    ).matrixTransform(deltaMatrix);

    // D. 写入属性（不改 width/height）
    el.setOptions({
      angle: radiansToDegrees(newAngleRad),
      scaleX: resScaleX,
      scaleY: resScaleY,
      skewX: radiansToDegrees(resSkewXRad),
    });

    // E. 核心：使用你的方法同步位置
    // 这会根据 scale 后的 bounds 重新调整 left/top
    el.setPositionByOrigin(
      new Point(newCenter.x, newCenter.y),
      'center',
      'center'
    );

    el.layer.render();
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
      top: newSelectCenter.y - newH / 2,
    })
    .render();
}
