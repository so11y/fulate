import { describe, it, expect } from "vitest";
import {
  isAxisAlignedRect,
  addEdgeMidpoints,
  collectSnapData,
  buildAxisSnapLines,
} from "../../src/select/snap";

// ─── isAxisAlignedRect ──────────────────────────────────────

describe("isAxisAlignedRect", () => {
  it("标准轴对齐矩形 → true", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ];
    expect(isAxisAlignedRect(pts)).toBe(true);
  });

  it("旋转 45° 菱形 → false", () => {
    const pts = [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ];
    expect(isAxisAlignedRect(pts)).toBe(false);
  });

  it("3 个点 → false", () => {
    expect(isAxisAlignedRect([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });

  it("带微小浮点误差的轴对齐矩形 → true", () => {
    const pts = [
      { x: 0.001, y: 0 },
      { x: 100, y: 0.005 },
      { x: 100.003, y: 80 },
      { x: 0, y: 80.002 },
    ];
    expect(isAxisAlignedRect(pts)).toBe(true);
  });
});

// ─── addEdgeMidpoints ───────────────────────────────────────

describe("addEdgeMidpoints", () => {
  it("4 个顶点 → 返回 8 个点（4 顶点 + 4 中点）", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ];
    const result = addEdgeMidpoints(pts);
    expect(result).toHaveLength(8);
  });

  it("中点坐标正确", () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ];
    const result = addEdgeMidpoints(pts);
    expect(result[4]).toEqual({ x: 50, y: 0 });
    expect(result[5]).toEqual({ x: 100, y: 40 });
    expect(result[6]).toEqual({ x: 50, y: 80 });
    expect(result[7]).toEqual({ x: 0, y: 40 });
  });

  it("非 4 点集 → 只返回原始点", () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 50 }];
    const result = addEdgeMidpoints(pts);
    expect(result).toEqual(pts);
  });
});

// ─── collectSnapData ────────────────────────────────────────

describe("collectSnapData", () => {
  it("轴对齐矩形 → xData/yData 各 6 个值", () => {
    const xData: number[] = [];
    const yData: number[] = [];
    const pts = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ];
    collectSnapData(pts, xData, yData);

    expect(xData).toHaveLength(6);
    expect(yData).toHaveLength(6);
  });

  it("轴对齐矩形 → xData 包含 minX 和 maxX", () => {
    const xData: number[] = [];
    const yData: number[] = [];
    collectSnapData(
      [
        { x: 10, y: 20 },
        { x: 110, y: 20 },
        { x: 110, y: 90 },
        { x: 10, y: 90 },
      ],
      xData,
      yData
    );

    expect(xData).toContain(10);
    expect(xData).toContain(110);
  });

  it("非轴对齐 → 使用分组策略收集", () => {
    const xData: number[] = [];
    const yData: number[] = [];
    const rotated = [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ];
    collectSnapData(rotated, xData, yData);

    expect(xData.length).toBeGreaterThan(0);
    expect(yData.length).toBeGreaterThan(0);
    expect(xData.length % 3).toBe(0);
    expect(yData.length % 3).toBe(0);
  });
});

// ─── buildAxisSnapLines ─────────────────────────────────────

describe("buildAxisSnapLines", () => {
  it("vertical 类型 → 生成竖线", () => {
    const best = {
      diff: 2,
      targetVal: 100,
      matchedIndex: 0,
      segments: [{ min: 50, max: 200 }],
    };
    const lines = buildAxisSnapLines(best, { min: 10, max: 40 }, "vertical", 1);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.type).toBe("vertical");
      expect(line.value).toBe(100);
    }
  });

  it("horizontal 类型 → 生成横线", () => {
    const best = {
      diff: -1,
      targetVal: 50,
      matchedIndex: 0,
      segments: [{ min: 10, max: 300 }],
    };
    const lines = buildAxisSnapLines(best, { min: 0, max: 100 }, "horizontal", 1);

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.type).toBe("horizontal");
      expect(line.value).toBe(50);
    }
  });

  it("间隔段生成距离标注", () => {
    const best = {
      diff: 0,
      targetVal: 100,
      matchedIndex: 0,
      segments: [{ min: 200, max: 300 }],
    };
    const lines = buildAxisSnapLines(best, { min: 0, max: 50 }, "vertical", 1);

    const gapLine = lines.find(
      (l) => l.start >= 50 && l.end <= 200
    );
    expect(gapLine).toBeTruthy();
    expect(gapLine!.distanceText).toBeDefined();
  });

  it("segment 太小（dist<=1） → 不生成段内线", () => {
    const best = {
      diff: 0,
      targetVal: 100,
      matchedIndex: 0,
      segments: [{ min: 50, max: 50.5 }],
    };
    const lines = buildAxisSnapLines(best, { min: 0, max: 40 }, "vertical", 1);
    const segLine = lines.find((l) => l.start === 50 && l.end === 50.5);
    expect(segLine).toBeUndefined();
  });

  it("多个 segment → 每个间隔都标注距离", () => {
    const best = {
      diff: 0,
      targetVal: 100,
      matchedIndex: 0,
      segments: [
        { min: 200, max: 250 },
        { min: 300, max: 350 },
      ],
    };
    const lines = buildAxisSnapLines(best, { min: 0, max: 50 }, "vertical", 1);
    const gapLines = lines.filter((l) => l.distanceText !== undefined);
    expect(gapLines.length).toBeGreaterThanOrEqual(1);
  });

  it("快照验证完整输出结构", () => {
    const best = {
      diff: 3,
      targetVal: 100,
      matchedIndex: 0,
      segments: [{ min: 50, max: 200 }],
    };
    const lines = buildAxisSnapLines(best, { min: 0, max: 30 }, "vertical", 1);
    expect(lines).toMatchSnapshot();
  });
});
