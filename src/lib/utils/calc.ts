import { Element, Point } from "../base";
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

// export function quickAABB(el: Element) {
//   const localMatrix = el.provideLocalCtx();
//   const point = el.getWordPoint();
//   const selfPoint = el.getLocalPoint(point);
//   const x = selfPoint.x + localMatrix.translateX;
//   const y = selfPoint.y + localMatrix.translateY;
//   const size = el.size;
//   return {
//     x,
//     y,
//     width: size.width, //x + size.width,
//     height: size.height // y + size.height
//   };
// }

//计算旋转后的四个角坐标
// export function calcRotateCorners(el: Element) {
//   const size = el.size;
//   // const localMatrix = el.provideLocalCtx();
//   const point = el.getWordPoint();
//   const selfPoint = el.getLocalPoint(point);
//   const { centerX, centerY } = el.getCenter();
//   // 计算旋转中心（元素的中心点）
//   // const centerX = selfPoint.x + localMatrix.translateX + size.width / 2;
//   // const centerY = selfPoint.y + localMatrix.translateY + size.height / 2;
//   // 将角度转换为弧度
//   const radians = (el.rotate * Math.PI) / 180;

//   // 计算旋转角度的余弦和正弦
//   const cos = Math.cos(radians);
//   const sin = Math.sin(radians);

//   // 未旋转时的四个角坐标
//   const corners = [
//     { x: selfPoint.x, y: selfPoint.y }, // 左上角
//     { x: selfPoint.x + size.width, y: selfPoint.y }, // 右上角
//     { x: selfPoint.x + size.width, y: selfPoint.y + size.height }, // 右下角
//     { x: selfPoint.x, y: selfPoint.y + size.height } // 左下角
//   ];

//   // 计算旋转后的四个角坐标
//   return corners.map((corner) => {
//     const translatedX = corner.x - centerX;
//     const translatedY = corner.y - centerY;

//     const rotatedX = centerX + translatedX * cos - translatedY * sin;
//     const rotatedY = centerY + translatedX * sin + translatedY * cos;

//     return { x: rotatedX, y: rotatedY };
//   });
// }

export function isOverlap(aabb: Rect, rotatedRect: Element) {
  const aabbVertices = [
    { x: aabb.x, y: aabb.y },
    { x: aabb.x + aabb.width, y: aabb.y },
    { x: aabb.x + aabb.width, y: aabb.y + aabb.height },
    { x: aabb.x, y: aabb.y + aabb.height }
  ];

  for (const vertex of aabbVertices) {
    if (rotatedRect.hasPointHint(vertex.x, vertex.y)) {
      return true;
    }
  }
  const rect = rotatedRect.getMinBoundingBox();
  for (const vertex of rect.vertices) {
    if (
      vertex.x >= aabb.x &&
      vertex.x <= aabb.x + aabb.width &&
      vertex.y >= aabb.y &&
      vertex.y <= aabb.y + aabb.height
    ) {
      return true;
    }
  }

  // 2. 新增：检查边交叉（SAT）
  const axes = [
    { x: 1, y: 0 }, // AABB 的 X 轴
    { x: 0, y: 1 }, // AABB 的 Y 轴
    ...getEdgeNormals(rect.vertices) // 旋转矩形的边法线
  ];

  for (const axis of axes) {
    if (!overlapOnAxis(aabbVertices, rect.vertices, axis)) {
      return false; // 存在分离轴，无碰撞
    }
  }

  return true; // 所有轴重叠，碰撞成立 所有顶点都在 Select 框内，才算完全包裹
}

// 获取旋转矩形的边法线
function getEdgeNormals(points: { x: number; y: number }[]) {
  const normals = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
    //@ts-ignore
    normals.push({ x: -edge.y, y: edge.x }); // 法向量（垂直边）
  }
  return normals;
}

// 检查投影是否重叠
function overlapOnAxis(
  pointsA: { x: number; y: number }[],
  pointsB: { x: number; y: number }[],
  axis: { x: number; y: number }
) {
  let minA = Infinity,
    maxA = -Infinity;
  let minB = Infinity,
    maxB = -Infinity;

  for (const p of pointsA) {
    const proj = p.x * axis.x + p.y * axis.y;
    minA = Math.min(minA, proj);
    maxA = Math.max(maxA, proj);
  }
  for (const p of pointsB) {
    const proj = p.x * axis.x + p.y * axis.y;
    minB = Math.min(minB, proj);
    maxB = Math.max(maxB, proj);
  }

  return maxA >= minB && maxB >= minA;
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

// export function mergeOverlappingRects(rects: Array<Rect>) {
//   const mergedRects: Array<Rect> = [];
//   for (const rect of rects) {
//     let isMerged = false;
//     // 检查是否可以与已合并的矩形合并
//     for (let i = 0; i < mergedRects.length; i++) {
//       if (isOverlap(rect, mergedRects[i])) {
//         mergedRects[i] = mergeTwoRects(mergedRects[i], rect);
//         isMerged = true;
//         break;
//       }
//     }
//     // 如果不能合并，则添加到已合并的矩形列表中
//     if (!isMerged) {
//       mergedRects.push(rect);
//     }
//   }

//   return mergedRects;
// }

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
// export function isPartiallyIntersecting(rect1: Rect, rect2: Rect) {
//   // const isRect2ContainsRect1 =
//   //   rect2.x <= rect1.x &&
//   //   rect2.y <= rect1.y &&
//   //   rect2.x + rect2.width >= rect1.x + rect1.width &&
//   //   rect2.y + rect2.height >= rect1.y + rect1.height;
//   //  &&   !isRect2ContainsRect1
//   return isOverlap(rect1, rect2) && !isContaining(rect1, rect2);
// }

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

export function calcRotate(point: Point, rotate?: number) {
  if (!rotate) {
    return point;
  }
  const rad = (rotate * Math.PI) / 180;

  point.x = point.x * Math.cos(rad) - point.y * Math.sin(rad); // 修正 x
  point.y = point.x * Math.sin(rad) + point.y * Math.cos(rad); // 修正 y
}

// 辅助函数：计算两个点之间的向量
export function createVector(
  start: { x: number; y: number },
  end: { x: number; y: number }
): [number, number] {
  return [end.x - start.x, end.y - start.y];
}

// 辅助函数：计算旋转角度（基于getRotateAng）
export function calculateRotationAngle(
  vct1: [number, number],
  vct2: [number, number]
) {
  let EPSILON = 1.0e-8;
  let dist, dot, cross, degree, angle;

  // 归一化第一个向量
  dist = Math.sqrt(vct1[0] * vct1[0] + vct1[1] * vct1[1]);
  vct1[0] /= dist;
  vct1[1] /= dist;

  // 归一化第二个向量
  dist = Math.sqrt(vct2[0] * vct2[0] + vct2[1] * vct2[1]);
  vct2[0] /= dist;
  vct2[1] /= dist;

  // 计算点积
  dot = vct1[0] * vct2[0] + vct1[1] * vct2[1];

  // 处理特殊情况
  if (Math.abs(dot - 1.0) <= EPSILON) {
    angle = 0;
  } else if (Math.abs(dot + 1.0) <= EPSILON) {
    angle = Math.PI;
  } else {
    angle = Math.acos(dot);
    cross = vct1[0] * vct2[1] - vct2[0] * vct1[1];
    if (cross < 0) {
      angle = 2 * Math.PI - angle;
    }
  }

  // 转换为度数
  degree = (angle * 180) / Math.PI;
  return degree;
}
