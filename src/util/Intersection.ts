import { Point, createVector } from "./point";
/**
    Intersection：有交点（1个或多个）

    Coincident：对象重合/共线（无限个交点）

    Parallel：平行无交点

    undefined：无交点（不相交也不平行）
 */

type IntersectionStatus =
  | "Intersection"
  | "Coincident"
  | "Parallel"
  | undefined;

export class Intersection {
  points: Point[];
  status?: IntersectionStatus;
  constructor(status?: IntersectionStatus) {
    this.status = status;
    this.points = [];
  }
  /**
   * Used to verify if a point is alredy in the collection
   * @param {Point} point
   * @returns {boolean}
   */
  includes(point: Point) {
    return this.points.some((p) => p.eq(point));
  }

  /**
   * Appends points of intersection
   * @param {...Point[]} points
   * @return {Intersection} thisArg
   * @chainable
   */
  append(...points: Point[]) {
    this.points = this.points.concat(
      points.filter((point) => {
        return !this.includes(point);
      })
    );
    return this;
  }

  /**
   * 判断点 T 是否在线段（或直线）AB 上
   * @param T 待检测的点
   * @param A 线段端点 A
   * @param B 线段端点 B
   * @param infinite 是否视为无限长的直线（true则不判断端点范围）
   * @returns 如果点在线上返回 true
   */
  static isPointContained(T: Point, A: Point, B: Point, infinite = false) {
    if (A.eq(B)) {
      return T.eq(A);
    } else if (A.x === B.x) {
      return (
        T.x === A.x &&
        (infinite || (T.y >= Math.min(A.y, B.y) && T.y <= Math.max(A.y, B.y)))
      );
    } else if (A.y === B.y) {
      return (
        T.y === A.y &&
        (infinite || (T.x >= Math.min(A.x, B.x) && T.x <= Math.max(A.x, B.x)))
      );
    } else {
      const AB = createVector(A, B);
      const AT = createVector(A, T);
      const s = AT.divide(AB);
      return infinite
        ? Math.abs(s.x) === Math.abs(s.y)
        : s.x === s.y && s.x >= 0 && s.x <= 1;
    }
  }

  /**
   * 使用射线投影法（Ray Casting）判断点是否在多边形内部
   * @see https://en.wikipedia.org/wiki/Point_in_polygon
   * @param point 待检测的点
   * @param points 多边形的顶点数组
   * @returns 在内部返回 true
   */
  static isPointInPolygon(point: Point, points: Point[]) {
    const other = new Point(point).setX(
      Math.min(point.x - 1, ...points.map((p) => p.x))
    );
    let hits = 0;
    for (let index = 0; index < points.length; index++) {
      const inter = this.intersectSegmentSegment(
        // polygon side
        points[index],
        points[(index + 1) % points.length], // ray
        point,
        other
      );
      if (inter.includes(point)) {
        return true;
      }
      hits += Number(inter.status === "Intersection");
    }
    return hits % 2 === 1;
  }
  /**
   * 计算两条线（或线段）的相交情况
   * 采用克莱姆法则（Cramer's rule）求解二元一次方程组
   * @param a1 线A点1
   * @param a2 线A点2
   * @param b1 线B点1
   * @param b2 线B点2
   * @param aInfinite 线A是否视为无限直线
   * @param bInfinite 线B是否视为无限直线
   */
  static intersectLineLine(
    a1: Point,
    a2: Point,
    b1: Point,
    b2: Point,
    aInfinite = true,
    bInfinite = true
  ) {
    const a2xa1x = a2.x - a1.x,
      a2ya1y = a2.y - a1.y,
      b2xb1x = b2.x - b1.x,
      b2yb1y = b2.y - b1.y,
      a1xb1x = a1.x - b1.x,
      a1yb1y = a1.y - b1.y,
      uaT = b2xb1x * a1yb1y - b2yb1y * a1xb1x,
      ubT = a2xa1x * a1yb1y - a2ya1y * a1xb1x,
      uB = b2yb1y * a2xa1x - b2xb1x * a2ya1y;
    if (uB !== 0) {
      const ua = uaT / uB,
        ub = ubT / uB;
      if (
        (aInfinite || (0 <= ua && ua <= 1)) &&
        (bInfinite || (0 <= ub && ub <= 1))
      ) {
        return new Intersection("Intersection").append(
          new Point(a1.x + ua * a2xa1x, a1.y + ua * a2ya1y)
        );
      } else {
        return new Intersection();
      }
    } else {
      if (uaT === 0 || ubT === 0) {
        const segmentsCoincide =
          aInfinite ||
          bInfinite ||
          Intersection.isPointContained(a1, b1, b2) ||
          Intersection.isPointContained(a2, b1, b2) ||
          Intersection.isPointContained(b1, a1, a2) ||
          Intersection.isPointContained(b2, a1, a2);
        return new Intersection(segmentsCoincide ? "Coincident" : void 0);
      } else {
        return new Intersection("Parallel");
      }
    }
  }

  /** 检测线段与直线的相交情况 */
  static intersectSegmentLine(s1: Point, s2: Point, l1: Point, l2: Point) {
    return Intersection.intersectLineLine(s1, s2, l1, l2, false, true);
  }

  /** 检测线段与线段的相交情况 */
  static intersectSegmentSegment(a1: Point, a2: Point, b1: Point, b2: Point) {
    return Intersection.intersectLineLine(a1, a2, b1, b2, false, false);
  }

  /**
   * 检测线/线段与多边形的相交情况
   * @param points 多边形顶点数组
   * @param infinite true为直线，false为线段
   */
  static intersectLinePolygon(
    a1: Point,
    a2: Point,
    points: Point[],
    infinite = true
  ) {
    const result = new Intersection();
    const length = points.length;
    for (let i = 0, b1, b2, inter; i < length; i++) {
      b1 = points[i];
      b2 = points[(i + 1) % length];
      inter = Intersection.intersectLineLine(a1, a2, b1, b2, infinite, false);
      if (inter.status === "Coincident") {
        return inter;
      }
      result.append(...inter.points);
    }
    if (result.points.length > 0) {
      result.status = "Intersection";
    }
    return result;
  }

  /**
   * AABB 矩形碰撞检测
   * 判断两个轴对齐矩形是否重叠
   */
  static intersectRect(
    r1: { left: number; top: number; width: number; height: number },
    r2: { left: number; top: number; width: number; height: number }
  ): boolean {
    return !(
      r1.left + r1.width < r2.left ||
      r1.left > r2.left + r2.width ||
      r1.top + r1.height < r2.top ||
      r1.top > r2.top + r2.height
    );
  }

  /** 检测线段与多边形的相交情况 */
  static intersectSegmentPolygon(a1: Point, a2: Point, points: Point[]) {
    return Intersection.intersectLinePolygon(a1, a2, points, false);
  }

  /**
   * 检测两个多边形是否相交
   * 通过判断一个多边形的每条边是否与另一个多边形相交实现
   */
  static intersectPolygonPolygon(points1: Point[], points2: Point[]) {
    const result = new Intersection(),
      length = points1.length;
    const coincidences = [];
    for (let i = 0; i < length; i++) {
      const a1 = points1[i],
        a2 = points1[(i + 1) % length],
        inter = Intersection.intersectSegmentPolygon(a1, a2, points2);
      if (inter.status === "Coincident") {
        coincidences.push(inter);
        result.append(a1, a2);
      } else {
        result.append(...inter.points);
      }
    }
    if (coincidences.length > 0 && coincidences.length === points1.length) {
      return new Intersection("Coincident");
    } else if (result.points.length > 0) {
      result.status = "Intersection";
    }
    return result;
  }

  /** 检测多边形与矩形的相交情况 */
  static intersectPolygonRectangle(points: Point[], r1: Point, r2: Point) {
    const min = r1.min(r2),
      max = r1.max(r2),
      topRight = new Point(max.x, min.y),
      bottomLeft = new Point(min.x, max.y);
    return Intersection.intersectPolygonPolygon(points, [
      min,
      topRight,
      max,
      bottomLeft
    ]);
  }

  /**
   * 计算点到线段的最短距离的平方
   * @param point 目标点
   * @param p1 线段端点1
   * @param p2 线段端点2
   */
  static pointToLineSegmentDistance(point: Point, p1: Point, p2: Point) {
    const x = point.x;
    const y = point.y;
    const x1 = p1.x;
    const y1 = p1.y;
    const x2 = p2.x;
    const y2 = p2.y;

    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;

    // 如果线段长度为0 (p1 和 p2 重合)，直接计算点到 p1 的距离
    let param = -1;
    if (len_sq !== 0) {
      param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      // 投影点在线段内部
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isPointInCircle(point: Point, center: Point, radius: number): boolean {
    // 1. 计算鼠标点和圆心的 X/Y 轴差值
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    // 2. 计算距离的平方: dx² + dy²
    const distanceSquared = dx * dx + dy * dy;

    // 3. 比较：距离平方 <= 半径平方
    return distanceSquared <= radius ** 2;
  }

  static isPointInRoundRect(
    point: Point,
    w: number,
    h: number,
    r: number
  ): boolean {
    // 1. 将点移动到以矩形中心为原点的坐标系 (假设原点在左上角)
    let px = Math.abs(point.x - w / 2);
    let py = Math.abs(point.y - h / 2);

    // 2. 检查点是否在最外层大矩形之外
    if (px > w / 2 || py > h / 2) return false;

    // 3. 检查点是否在内部的“十字架”区域（非圆角区域）
    // 只要点落在水平矩形或垂直矩形内，就一定在图形内
    if (px <= w / 2 - r || py <= h / 2 - r) return true;

    // 4. 如果点在剩下的四个角落区域（即圆角矩形的“空隙”处）
    // 判断点到圆角圆心的距离
    const cornerCenterX = w / 2 - r;
    const cornerCenterY = h / 2 - r;
    const dx = px - cornerCenterX;
    const dy = py - cornerCenterY;

    // 距离平方 <= 半径平方
    return dx * dx + dy * dy <= r * r;
  }
}
