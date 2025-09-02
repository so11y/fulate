import { Bounds, Container, ContainerChild, Point, Rectangle } from "pixi.js";

export type BoundingBox = ReturnType<typeof getBoundingBox>;

//检查是否重叠，相邻
export function isOverlap(rect1: Bounds, rect2: Bounds) {
  return (
    rect1.x <= rect2.x + rect2.width &&
    rect1.x + rect1.width >= rect2.x &&
    rect1.y <= rect2.y + rect2.height &&
    rect1.y + rect1.height >= rect2.y
  );
}

export function getBoundingBox(vv: Container<ContainerChild>) {
  const bounds = vv.getLocalBounds();
  const vertices = [
    vv.worldTransform.apply({ x: bounds.x, y: bounds.y }),
    vv.worldTransform.apply({
      x: bounds.x + bounds.width,
      y: bounds.y
    }),
    vv.worldTransform.apply({
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height
    }),
    vv.worldTransform.apply({
      x: bounds.x,
      y: bounds.y + bounds.height
    })
  ];
  return {
    width: bounds.width,
    height: bounds.height,
    x: vertices[0].x,
    y: vertices[0].y,
    vertices
  };
}

export function doPolygonsIntersect(a: Point[], b: Point[]): boolean {
  function getAxes(points: Point[]) {
    const axes = [];
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const normal = { x: -edge.y, y: edge.x }; // 垂直向量
      const length = Math.hypot(normal.x, normal.y);
      //@ts-ignore
      axes.push({ x: normal.x / length, y: normal.y / length });
    }
    return axes;
  }

  function project(points: Point[], axis: { x: number; y: number }) {
    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      const projection = p.x * axis.x + p.y * axis.y;
      min = Math.min(min, projection);
      max = Math.max(max, projection);
    }
    return { min, max };
  }

  const axes = [...getAxes(a), ...getAxes(b)];

  for (const axis of axes) {
    const proj1 = project(a, axis);
    const proj2 = project(b, axis);

    // 分离轴：两个投影不重叠
    if (proj1.max < proj2.min || proj2.max < proj1.min) {
      return false;
    }
  }

  return true; // 所有轴上都重叠 → 相交
}

export function mergeBoundingBoxes(boxes: { vertices: Point[] }[]): Rectangle {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const box of boxes) {
    for (const point of box.vertices) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return new Rectangle(minX, minY, maxX - minX, maxY - minY);
}
