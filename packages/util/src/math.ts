const PiBy180 = Math.PI / 180;
export const degreesToRadians = (degrees: number) => degrees * PiBy180;
export const radiansToDegrees = (radians: number) => radians / PiBy180;

export type Edge = "top" | "right" | "bottom" | "left";

/**
 * 矩形边上按 ratio 取点，同时返回朝外法线。
 * ratio ∈ [0, 1]，沿边的起点到终点方向插值。
 */
export function rectEdgePosition(
  w: number, h: number, edge: Edge, ratio: number
): { x: number; y: number; nx: number; ny: number } {
  switch (edge) {
    case "top":    return { x: w * ratio, y: 0, nx: 0, ny: -1 };
    case "right":  return { x: w, y: h * ratio, nx: 1, ny: 0 };
    case "bottom": return { x: w * ratio, y: h, nx: 0, ny: 1 };
    case "left":   return { x: 0, y: h * ratio, nx: -1, ny: 0 };
  }
}
