import { Element } from "../base";
import { Rect } from "../types";
import { Size } from "./constraint";

export function calcMarinWidth(el: Element) {
  return el.size.width + el.margin.left + el.margin.right;
}
export function calcMarinHeight(height: number, el: Element) {
  return height + el.margin.top + el.margin.bottom;
}

export function CalcAABB(el: Element) {
  return new Size(
    el.size.width + el.margin.left + el.margin.right,
    el.size.height + el.margin.top + el.margin.bottom
  );
}

export function quickAABB(el: Element) {
  const localMatrix = el.provideLocalCtx();
  const point = el.getWordPoint();
  const selfPoint = el.getLocalPoint(point);
  const x = selfPoint.x + localMatrix.translateX;
  const y = selfPoint.y + localMatrix.translateY;
  const size = el.size;
  return {
    x,
    y,
    width: size.width, //x + size.width,
    height: size.height // y + size.height
  };
}

//计算旋转后的四个角坐标
export function calcRotateCorners(el: Element) {
  const size = el.size;
  const localMatrix = el.provideLocalCtx();
  const point = el.getWordPoint();
  const selfPoint = el.getLocalPoint(point);
  const { centerX, centerY } = el.getCenter()
  // 计算旋转中心（元素的中心点）
  // const centerX = selfPoint.x + localMatrix.translateX + size.width / 2;
  // const centerY = selfPoint.y + localMatrix.translateY + size.height / 2;
  // 将角度转换为弧度
  const radians = (localMatrix.rotate * Math.PI) / 180;

  // 计算旋转角度的余弦和正弦
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  // 未旋转时的四个角坐标
  const corners = [
    { x: selfPoint.x, y: selfPoint.y }, // 左上角
    { x: selfPoint.x + size.width, y: selfPoint.y }, // 右上角
    { x: selfPoint.x + size.width, y: selfPoint.y + size.height }, // 右下角
    { x: selfPoint.x, y: selfPoint.y + size.height } // 左下角
  ];

  // 计算旋转后的四个角坐标
  return corners.map((corner) => {
    const translatedX = corner.x - centerX;
    const translatedY = corner.y - centerY;

    const rotatedX = centerX + translatedX * cos - translatedY * sin;
    const rotatedY = centerY + translatedX * sin + translatedY * cos;

    return { x: rotatedX, y: rotatedY };
  });
}

//检查是否重叠，相邻
export function isOverlap(rect1: Rect, rect2: Rect) {
  return (
    rect1.x <= rect2.x + rect2.width &&
    rect1.x + rect1.width >= rect2.x &&
    rect1.y <= rect2.y + rect2.height &&
    rect1.y + rect1.height >= rect2.y
  );
}
//检查是否重叠，不相邻
export function isOverlapAndNotAdjacent(rect1: Rect, rect2: Rect) {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

// 合并两个矩形范围
export function mergeTwoRects(rect1: Rect, rect2: Rect) {
  const minX = Math.min(rect1.x, rect2.x);
  const minY = Math.min(rect1.y, rect2.y);
  const maxX = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
  const maxY = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

export function mergeOverlappingRects(rects: Array<Rect>) {
  const mergedRects: Array<Rect> = [];
  for (const rect of rects) {
    let isMerged = false;
    // 检查是否可以与已合并的矩形合并
    for (let i = 0; i < mergedRects.length; i++) {
      if (isOverlap(rect, mergedRects[i])) {
        mergedRects[i] = mergeTwoRects(mergedRects[i], rect);
        isMerged = true;
        break;
      }
    }
    // 如果不能合并，则添加到已合并的矩形列表中
    if (!isMerged) {
      mergedRects.push(rect);
    }
  }

  return mergedRects;
}

//A包含B
export function isContaining(rect1: Rect, rect2: Rect) {
  return (
    rect1.x <= rect2.x &&
    rect1.y <= rect2.y &&
    rect1.x + rect1.width >= rect2.x + rect2.width &&
    rect1.y + rect1.height >= rect2.y + rect2.height
  );
}

//A不包含B && B不包含A,但是相交
export function isPartiallyIntersecting(rect1: Rect, rect2: Rect) {
  // const isRect2ContainsRect1 =
  //   rect2.x <= rect1.x &&
  //   rect2.y <= rect1.y &&
  //   rect2.x + rect2.width >= rect1.x + rect1.width &&
  //   rect2.y + rect2.height >= rect1.y + rect1.height;
  //  &&   !isRect2ContainsRect1
  return isOverlap(rect1, rect2) && !isContaining(rect1, rect2);
}

//处理宽高可能的负数，然后再计算x,y
export function calculateElementBounds(rect: Rect) {
  // 计算左上角坐标
  const x = rect.width >= 0 ? rect.x : rect.x + rect.width;
  const y = rect.height >= 0 ? rect.y : rect.y + rect.height;

  const width = Math.abs(rect.width);
  const height = Math.abs(rect.height);

  return {
    x,
    y,
    width,
    height
  };
}
