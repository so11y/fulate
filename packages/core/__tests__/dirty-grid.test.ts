import { describe, it, expect, beforeEach } from "vitest";
import { DirtyGrid } from "../src/layer/dirty-grid";
import type { RectPoint } from "@fulate/util";

function rect(left: number, top: number, width: number, height: number): RectPoint {
  return { left, top, width, height };
}

describe("DirtyGrid.merge", () => {
  let grid: DirtyGrid;

  beforeEach(() => {
    grid = new DirtyGrid();
  });

  const VISIBLE_AREA = 1_000_000;
  const RATIO = 0.5;

  it("空输入 → rects: []", () => {
    const result = grid.merge([], VISIBLE_AREA, RATIO);
    expect(result.rects).toEqual([]);
  });

  it("单个小脏矩形 → 原样返回", () => {
    const r = rect(10, 20, 30, 40);
    const result = grid.merge([r], VISIBLE_AREA, RATIO);
    expect(result.rects).toEqual([r]);
  });

  it("单个大脏矩形超阈值 → rects: null（全量重绘）", () => {
    const r = rect(0, 0, 1000, 1000);
    const result = grid.merge([r], VISIBLE_AREA, RATIO);
    expect(result.rects).toBeNull();
  });

  it("两个不相邻小矩形 → 返回多个 rect", () => {
    const r1 = rect(0, 0, 10, 10);
    const r2 = rect(200, 200, 10, 10);
    const result = grid.merge([r1, r2], VISIBLE_AREA, RATIO);
    expect(result.rects).not.toBeNull();
    expect(result.rects!.length).toBeGreaterThanOrEqual(2);
  });

  it("两个重叠矩形 → 合并为较少的 rect", () => {
    const r1 = rect(10, 10, 50, 50);
    const r2 = rect(30, 30, 50, 50);
    const result = grid.merge([r1, r2], VISIBLE_AREA, RATIO);
    expect(result.rects).not.toBeNull();
    expect(result.rects!.length).toBeLessThanOrEqual(2);
  });

  it("多个密集矩形（rawArea > 0.8 * bbArea）→ 返回总包围盒", () => {
    const rects: RectPoint[] = [];
    for (let i = 0; i < 10; i++) {
      rects.push(rect(i * 10, 0, 10, 100));
    }
    const result = grid.merge(rects, VISIBLE_AREA, RATIO);
    expect(result.rects).not.toBeNull();
    expect(result.rects!.length).toBe(1);
    expect(result.rects![0].left).toBeCloseTo(0, 5);
    expect(result.rects![0].width).toBeCloseTo(100, 5);
  });

  it("合并后 totalArea 超 bbArea → 退化为总包围盒", () => {
    const rects: RectPoint[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        rects.push(rect(col * 30, row * 30, 29, 29));
      }
    }
    const result = grid.merge(rects, VISIBLE_AREA, RATIO);
    expect(result.rects).not.toBeNull();
    expect(result.rects!.length).toBeGreaterThanOrEqual(1);
  });

  it("零面积包围盒 → rects: []", () => {
    const r1 = rect(50, 50, 0, 0);
    const r2 = rect(50, 50, 0, 0);
    const result = grid.merge([r1, r2], VISIBLE_AREA, RATIO);
    expect(result.rects).toEqual([]);
  });

  it("总包围盒面积超阈值 → rects: null", () => {
    const r1 = rect(0, 0, 10, 10);
    const r2 = rect(0, 0, 1000, 1000);
    const result = grid.merge([r1, r2], VISIBLE_AREA, RATIO);
    expect(result.rects).toBeNull();
  });

  it("连续调用 merge 时 _buckets 正确重置", () => {
    const r1 = rect(10, 10, 20, 20);
    grid.merge([r1], VISIBLE_AREA, RATIO);

    const r2 = rect(500, 500, 10, 10);
    const result = grid.merge([r2], VISIBLE_AREA, RATIO);
    expect(result.rects).toEqual([r2]);
  });
});
