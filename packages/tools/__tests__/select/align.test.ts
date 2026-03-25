import { describe, it, expect, vi, beforeEach } from "vitest";
import { alignElements, type AlignType } from "../../src/select/align";
import {
  createMockSelect,
  mockElementWithRect,
  type MockSelect,
} from "../helpers";
import type { Element } from "@fulate/core";

function setup(
  rects: Array<{ left: number; top: number; width: number; height: number }>
) {
  const els = rects.map((r) => mockElementWithRect(r));
  const select = createMockSelect({ selectEls: els as unknown as Element[] });
  return { select, els };
}

function runAlign(
  rects: Array<{ left: number; top: number; width: number; height: number }>,
  type: AlignType
) {
  const { select, els } = setup(rects);
  alignElements(select as unknown as any, type);
  return { select, els };
}

describe("alignElements", () => {
  // ─── 前置条件 ─────────────────────────────────────────────

  it("少于 2 个元素 → 不执行", () => {
    const { select } = setup([{ left: 0, top: 0, width: 50, height: 50 }]);
    alignElements(select as unknown as any, "justify-start");
    expect(select.history.snapshot).not.toHaveBeenCalled();
  });

  // ─── justify-start ────────────────────────────────────────

  it("justify-start — 所有元素左边缘对齐到最小 left", () => {
    const { els } = runAlign(
      [
        { left: 100, top: 0, width: 50, height: 50 },
        { left: 200, top: 0, width: 80, height: 50 },
        { left: 50, top: 0, width: 60, height: 50 },
      ],
      "justify-start"
    );

    expect(els[0].left).toBe(50);
    expect(els[1].left).toBe(50);
    expect(els[2].left).toBe(50);
  });

  // ─── justify-center ───────────────────────────────────────

  it("justify-center — 所有元素水平中心对齐", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 100, height: 50 },
        { left: 200, top: 0, width: 60, height: 50 },
        { left: 100, top: 0, width: 40, height: 50 },
      ],
      "justify-center"
    );

    // minL=0, maxR=260, center=130
    expect(els[0].left).toBeCloseTo(80);   // 0 + (130 - 50) = 80
    expect(els[1].left).toBeCloseTo(100);  // 200 + (130 - 230) = 100
    expect(els[2].left).toBeCloseTo(110);  // 100 + (130 - 120) = 110
  });

  // ─── justify-end ──────────────────────────────────────────

  it("justify-end — 所有元素右边缘对齐到最大 right", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 50, height: 50 },
        { left: 100, top: 0, width: 80, height: 50 },
        { left: 200, top: 0, width: 60, height: 50 },
      ],
      "justify-end"
    );

    // maxR = 260
    expect(els[0].left).toBe(210);  // 0 + (260 - 50) = 210
    expect(els[1].left).toBe(180);  // 100 + (260 - 180) = 180
    expect(els[2].left).toBe(200);  // 200 + (260 - 260) = 200
  });

  // ─── justify-between ──────────────────────────────────────

  it("justify-between — 4 个元素，首尾不动，中间等间距", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 20, height: 50 },
        { left: 50, top: 0, width: 20, height: 50 },
        { left: 100, top: 0, width: 20, height: 50 },
        { left: 200, top: 0, width: 20, height: 50 },
      ],
      "justify-between"
    );

    // sorted by left: [0, 50, 100, 200]
    // first=0, last=220, totalWidth=80, gap=(220-0-80)/3 = 140/3 ≈ 46.667
    expect(els[0].left).toBeCloseTo(0, 1);
    expect(els[3].left).toBeCloseTo(200, 1);
    // 中间两个等间距
    const gap = (220 - 80) / 3;
    expect(els[1].left).toBeCloseTo(0 + 20 + gap, 1);
    expect(els[2].left).toBeCloseTo(0 + 20 + gap + 20 + gap, 1);
  });

  it("justify-between — 2 个元素 → 不执行（length < 3）", () => {
    const { select, els } = setup([
      { left: 0, top: 0, width: 50, height: 50 },
      { left: 100, top: 0, width: 50, height: 50 },
    ]);
    alignElements(select as unknown as any, "justify-between");
    // justifyBetween 内 rects.length < 3 直接返回
    // 但 snapshot 和 select 仍被调用（在外层 alignElements 中）
    expect(select.history.snapshot).toHaveBeenCalled();
    expect(els[0].left).toBe(0);
    expect(els[1].left).toBe(100);
  });

  // ─── align-start ──────────────────────────────────────────

  it("align-start — 所有元素上边缘对齐到最小 top", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 50, width: 50, height: 50 },
        { left: 0, top: 100, width: 50, height: 80 },
        { left: 0, top: 10, width: 50, height: 60 },
      ],
      "align-start"
    );

    expect(els[0].top).toBe(10);
    expect(els[1].top).toBe(10);
    expect(els[2].top).toBe(10);
  });

  // ─── align-center ─────────────────────────────────────────

  it("align-center — 所有元素垂直中心对齐", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 50, height: 100 },
        { left: 0, top: 200, width: 50, height: 60 },
        { left: 0, top: 100, width: 50, height: 40 },
      ],
      "align-center"
    );

    // minT=0, maxB=260, center=130
    expect(els[0].top).toBeCloseTo(80);   // 0 + (130 - 50)
    expect(els[1].top).toBeCloseTo(100);  // 200 + (130 - 230)
    expect(els[2].top).toBeCloseTo(110);  // 100 + (130 - 120)
  });

  // ─── align-end ────────────────────────────────────────────

  it("align-end — 所有元素下边缘对齐到最大 bottom", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 50, height: 50 },
        { left: 0, top: 100, width: 50, height: 80 },
        { left: 0, top: 200, width: 50, height: 60 },
      ],
      "align-end"
    );

    // maxB = 260
    expect(els[0].top).toBe(210);  // 0 + (260 - 50)
    expect(els[1].top).toBe(180);  // 100 + (260 - 180)
    expect(els[2].top).toBe(200);  // 200 + (260 - 260)
  });

  // ─── align-between ────────────────────────────────────────

  it("align-between — 4 个元素，首尾不动，中间等间距", () => {
    const { els } = runAlign(
      [
        { left: 0, top: 0, width: 50, height: 20 },
        { left: 0, top: 50, width: 50, height: 20 },
        { left: 0, top: 100, width: 50, height: 20 },
        { left: 0, top: 200, width: 50, height: 20 },
      ],
      "align-between"
    );

    expect(els[0].top).toBeCloseTo(0, 1);
    expect(els[3].top).toBeCloseTo(200, 1);
    const gap = (220 - 80) / 3;
    expect(els[1].top).toBeCloseTo(0 + 20 + gap, 1);
    expect(els[2].top).toBeCloseTo(0 + 20 + gap + 20 + gap, 1);
  });

  // ─── history / select 调用验证 ────────────────────────────

  it("对齐前后调用 history.snapshot → history.commit 和 select.select", () => {
    const { select, els } = setup([
      { left: 0, top: 0, width: 50, height: 50 },
      { left: 100, top: 0, width: 50, height: 50 },
    ]);
    alignElements(select as unknown as any, "justify-start");
    expect(select.history.snapshot).toHaveBeenCalledWith(select.selectEls);
    expect(select.select).toHaveBeenCalledWith(select.selectEls);
    expect(select.history.commit).toHaveBeenCalled();
  });
});
