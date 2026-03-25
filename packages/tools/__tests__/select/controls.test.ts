import { describe, it, expect, vi } from "vitest";
import { Point } from "@fulate/util";
import {
  rotateObjectWithSnapping,
  rotateCallback,
  resizeObject,
} from "../../src/select/controls";
import {
  createMockSelect,
  createFulateEvent,
  createElementSnapshot,
  createSelectState,
  mockElement,
} from "../helpers";
import type { Element } from "@fulate/core";

// ─── rotateObjectWithSnapping 辅助 ──────────────────────────

/**
 * 创建一个可被 rotateObjectWithSnapping 使用的 mock target。
 * pivot 固定在 (cx, cy)，通过 getPositionByOrigin 返回。
 */
function createRotateTarget(opts: {
  cx: number;
  cy: number;
  snapAngle?: number;
  snapThreshold?: number;
  width?: number;
  height?: number;
}) {
  const { cx, cy, snapAngle = 0, snapThreshold = 0, width = 100, height = 100 } = opts;

  return {
    width,
    height,
    originX: "center",
    originY: "center",
    snapAngle,
    snapThreshold,
    getRelativeCenterPoint: () => new Point(cx, cy),
    getPositionByOrigin: () => new Point(cx, cy),
  };
}

// ═════════════════════════════════════════════════════════════
// rotateObjectWithSnapping
// ═════════════════════════════════════════════════════════════

describe("rotateObjectWithSnapping", () => {
  it("无 snap（snapAngle=0）→ 返回精确角度", () => {
    const target = createRotateTarget({ cx: 50, cy: 50 });
    // ex,ey = 初始鼠标位置在 pivot 右侧 → lastAngle = 0
    // x,y = 新鼠标位置在 pivot 上方 → curAngle = -PI/2
    // theta = 0 → angle = radToDeg(-PI/2 - 0 + 0) = -90 → 归一化: 270
    const angle = rotateObjectWithSnapping(
      { target, ex: 100, ey: 50, theta: 0, originX: "center", originY: "center" },
      50,  // x: 与 pivot 同 x
      0    // y: 在 pivot 上方
    );
    expect(angle).toBeCloseTo(270);
  });

  it("snap 到 45° 倍数 — 在阈值内吸附到 90°", () => {
    const target = createRotateTarget({ cx: 0, cy: 0, snapAngle: 45, snapThreshold: 5 });
    // ex,ey 在右侧 (100,0) → lastAngle = 0
    // theta = 0
    // 让 curAngle 接近 90° 但稍有偏差
    // atan2(y, x) = atan2(100, 2) ≈ 88.85° → 接近 90°
    const angle = rotateObjectWithSnapping(
      { target, ex: 100, ey: 0, theta: 0, originX: "center", originY: "center" },
      2,
      100
    );
    expect(angle).toBe(90);
  });

  it("接近 0° 但未达到阈值 → 不吸附", () => {
    const target = createRotateTarget({ cx: 0, cy: 0, snapAngle: 45, snapThreshold: 1 });
    // atan2(0, 100) = 0 → lastAngle = 0
    // atan2(10, 100) ≈ 5.71° → angle ≈ 5.71°
    // abs(5.71 - 0) = 5.71 > threshold(1) → 不吸附到 0
    // abs(5.71 - 45) = 39.29 > threshold(1) → 不吸附到 45
    const angle = rotateObjectWithSnapping(
      { target, ex: 100, ey: 0, theta: 0, originX: "center", originY: "center" },
      100,
      10
    );
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(45);
    expect(angle).not.toBe(0);
    expect(angle).not.toBe(45);
  });

  it("负角度处理 → 归一化到 0-360", () => {
    const target = createRotateTarget({ cx: 0, cy: 0 });
    // ex,ey 在右侧 → lastAngle = 0
    // 新位置在下右 → curAngle 为负值
    // theta 给一个大负值使 angle < 0
    const angle = rotateObjectWithSnapping(
      { target, ex: 100, ey: 0, theta: -Math.PI, originX: "center", originY: "center" },
      100,
      1
    );
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(360);
  });

  it("theta 参与计算 — 初始角度偏移", () => {
    const target = createRotateTarget({ cx: 0, cy: 0 });
    // ex,ey 和 x,y 相同 → curAngle - lastAngle = 0
    // theta = PI/2 → angle = 90°
    const angle = rotateObjectWithSnapping(
      { target, ex: 100, ey: 0, theta: Math.PI / 2, originX: "center", originY: "center" },
      100,
      0
    );
    expect(angle).toBeCloseTo(90);
  });
});

// ═════════════════════════════════════════════════════════════
// rotateCallback
// ═════════════════════════════════════════════════════════════

describe("rotateCallback", () => {
  it("旋转 90° → select 的 angle 更新为 90°", () => {
    const select = createMockSelect({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      angle: 0,
      originX: "center",
      originY: "center",
      snapAngle: 0,
    });
    // 让 getPositionByOrigin 返回 pivot = center
    select.getPositionByOrigin = vi.fn(() => new Point(50, 50));
    select.getRelativeCenterPoint = vi.fn(() => new Point(50, 50));

    const childEl = mockElement({ left: 0, top: 0, width: 100, height: 100 });
    childEl.applyTransformMatrix = vi.fn();
    const snapshot = createElementSnapshot(childEl);
    const state = createSelectState(select, [snapshot]);

    // 初始鼠标点 = pivot 右侧 (150, 50)
    const initPoint = new Point(150, 50);
    // 移到 pivot 上方 (50, -50) → 转 90° 逆时针 → angle = 270
    // 但更简单的: 移到 (50, 150) → 转 -90° → angle = 360-90 = 270
    // 用精确值: atan2(150-50, 50-50) = 90° → curAngle = PI/2
    // lastAngle = atan2(50-50, 150-50) = 0
    // angle = (PI/2 - 0 + 0) → 90°
    const event = createFulateEvent({ x: 50, y: 150 });

    rotateCallback(select as any, initPoint, state, event);

    expect(select.updateSelectFrame).toHaveBeenCalledWith(
      expect.objectContaining({ angle: expect.any(Number) })
    );
    const calledAngle = (select.updateSelectFrame as any).mock.calls[0][0].angle;
    expect(calledAngle).toBeCloseTo(90);
  });

  it("旋转后每个子元素的 applyTransformMatrix 被调用", () => {
    const select = createMockSelect({
      left: 0, top: 0, width: 100, height: 100, angle: 0,
      originX: "center", originY: "center", snapAngle: 0,
    });
    select.getPositionByOrigin = vi.fn(() => new Point(50, 50));
    select.getRelativeCenterPoint = vi.fn(() => new Point(50, 50));

    const el1 = mockElement({ left: 0, top: 0, width: 50, height: 50 });
    el1.applyTransformMatrix = vi.fn();
    const el2 = mockElement({ left: 50, top: 50, width: 50, height: 50 });
    el2.applyTransformMatrix = vi.fn();

    const snap1 = createElementSnapshot(el1);
    const snap2 = createElementSnapshot(el2);
    const state = createSelectState(select, [snap1, snap2]);

    const point = new Point(150, 50);
    const event = createFulateEvent({ x: 50, y: 150 });

    rotateCallback(select as any, point, state, event);

    expect(el1.applyTransformMatrix).toHaveBeenCalledTimes(1);
    expect(el2.applyTransformMatrix).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════
// resizeObject
// ═════════════════════════════════════════════════════════════

describe("resizeObject", () => {
  /**
   * 通用的 resize 测试辅助。
   * select 初始化在 (0,0) 宽高 100x100，identity matrix。
   */
  function setupResize(opts?: { width?: number; height?: number; left?: number; top?: number }) {
    const w = opts?.width ?? 100;
    const h = opts?.height ?? 100;
    const l = opts?.left ?? 0;
    const t = opts?.top ?? 0;

    const select = createMockSelect({ left: l, top: t, width: w, height: h, angle: 0 });

    const childEl = mockElement({ left: l, top: t, width: w, height: h });
    childEl.applyTransformMatrix = vi.fn();

    const snapshot = createElementSnapshot(childEl, {
      matrix: new DOMMatrix().translate(l, t),
    });

    const matrix = new DOMMatrix().translate(l, t);
    const state = createSelectState(select, [snapshot], { matrix });

    return { select, childEl, state };
  }

  it("从 br 拉伸 2x → select 宽高翻倍", () => {
    const { select, childEl, state } = setupResize();
    // mouse 在世界坐标 (200, 200)，通过 inverse(matrix) → local (200, 200)
    // sx = 200/100 = 2, sy = 200/100 = 2
    const event = createFulateEvent({ x: 200, y: 200 });

    resizeObject(select as any, state, event, "br");

    expect(select.updateSelectFrame).toHaveBeenCalled();
    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(200);
    expect(args.height).toBeCloseTo(200);
  });

  it("从 tl 缩小 0.5x → select 宽高减半", () => {
    const { select, childEl, state } = setupResize();
    // tl: fixedLocal = (100, 100), mouse at (50, 50) → local (50,50)
    // sx = (100-50)/100 = 0.5, sy = (100-50)/100 = 0.5
    const event = createFulateEvent({ x: 50, y: 50 });

    resizeObject(select as any, state, event, "tl");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(50);
    expect(args.height).toBeCloseTo(50);
  });

  it("从 mr 仅水平拉伸 → sy=1, 只有宽度变化", () => {
    const { select, childEl, state } = setupResize();
    // mr: fixedLocalX=0, fixedLocalY=50, sx=mouseLocal.x/100, sy=1
    // mouse at (200, 50) → local (200,50), sx=2, sy=1
    const event = createFulateEvent({ x: 200, y: 50 });

    resizeObject(select as any, state, event, "mr");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(200);
    expect(args.height).toBeCloseTo(100);
  });

  it("从 mt 仅垂直拉伸 → sx=1, 只有高度变化", () => {
    const { select, childEl, state } = setupResize();
    // mt: fixedLocalX=50, fixedLocalY=100, sx=1, sy=(100-mouseLocal.y)/100
    // mouse at (50, 50) → local (50,50), sy=(100-50)/100=0.5
    const event = createFulateEvent({ x: 50, y: 50 });

    resizeObject(select as any, state, event, "mt");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(100);
    expect(args.height).toBeCloseTo(50);
  });

  it("shift 约束等比缩放 → sx === sy", () => {
    const { select, childEl, state } = setupResize();
    // br + shift: mouse at (200, 150) → sx=2, sy=1.5, shift → max(2,1.5)=2 → sx=sy=2
    const event = createFulateEvent({ x: 200, y: 150, shiftKey: true });

    resizeObject(select as any, state, event, "br");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(args.height);
  });

  it("极小值保护（sx 接近 0）→ 不出现 NaN/Infinity", () => {
    const { select, childEl, state } = setupResize();
    // br: mouse at (0.0001, 0.0001) → sx ≈ 0 → 被 || 0.0001 保护
    const event = createFulateEvent({ x: 0, y: 0 });

    resizeObject(select as any, state, event, "br");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(Number.isFinite(args.width)).toBe(true);
    expect(Number.isFinite(args.height)).toBe(true);
    expect(args.width).toBeGreaterThan(0);
    expect(args.height).toBeGreaterThan(0);
  });

  it("从 bl 缩放 → fixedLocal 正确", () => {
    const { select, childEl, state } = setupResize();
    // bl: fixedLocalX=100(width), fixedLocalY=0
    // mouse at (50, 200) → local (50, 200)
    // sx = (100-50)/100 = 0.5, sy = 200/100 = 2
    const event = createFulateEvent({ x: 50, y: 200 });

    resizeObject(select as any, state, event, "bl");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(50);
    expect(args.height).toBeCloseTo(200);
  });

  it("从 tr 缩放 → fixedLocal 正确", () => {
    const { select, childEl, state } = setupResize();
    // tr: fixedLocalX=0, fixedLocalY=100(height)
    // mouse at (200, 50) → local (200, 50)
    // sx = 200/100 = 2, sy = (100-50)/100 = 0.5
    const event = createFulateEvent({ x: 200, y: 50 });

    resizeObject(select as any, state, event, "tr");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(200);
    expect(args.height).toBeCloseTo(50);
  });

  it("负缩放（mouse 越过对角线）→ 不崩溃且值合理", () => {
    const { select, childEl, state } = setupResize();
    // br: mouse at (-50, -50) → sx = -0.5, sy = -0.5
    const event = createFulateEvent({ x: -50, y: -50 });

    resizeObject(select as any, state, event, "br");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(Number.isFinite(args.width)).toBe(true);
    expect(Number.isFinite(args.height)).toBe(true);
    expect(args.width).toBeGreaterThan(0);
    expect(args.height).toBeGreaterThan(0);
  });

  it("子元素的 applyTransformMatrix 被正确调用", () => {
    const { select, childEl, state } = setupResize();
    const event = createFulateEvent({ x: 200, y: 200 });

    resizeObject(select as any, state, event, "br");

    expect(childEl.applyTransformMatrix).toHaveBeenCalledTimes(1);
    const [targetMatrix, worldCenter, opts] = (childEl.applyTransformMatrix as any).mock.calls[0];
    expect(targetMatrix).toBeInstanceOf(DOMMatrix);
    expect(worldCenter.x).toBeDefined();
    expect(worldCenter.y).toBeDefined();
    expect(opts).toEqual(expect.objectContaining({
      width: expect.any(Number),
      height: expect.any(Number),
      scaleX: expect.any(Number),
      scaleY: expect.any(Number),
    }));
  });

  it("shift 对边缘类型（mr/mt/mb/ml）不生效", () => {
    const { select, childEl, state } = setupResize();
    // mr + shift: sx = mouseLocal.x/100, sy 始终 = 1（不受 shift 影响）
    const event = createFulateEvent({ x: 200, y: 50, shiftKey: true });

    resizeObject(select as any, state, event, "mr");

    const args = (select.updateSelectFrame as any).mock.calls[0][0];
    expect(args.width).toBeCloseTo(200);
    expect(args.height).toBeCloseTo(100);
  });

  it("连续多次调用同一 state，快照不被污染（幂等性）", () => {
    const { select, childEl, state } = setupResize();
    const event = createFulateEvent({ x: 150, y: 150 });

    resizeObject(select as any, state, event, "br");
    const first = (select.updateSelectFrame as any).mock.calls[0][0];

    resizeObject(select as any, state, event, "br");
    const second = (select.updateSelectFrame as any).mock.calls[1][0];

    expect(second.width).toBeCloseTo(first.width);
    expect(second.height).toBeCloseTo(first.height);
    expect(second.left).toBeCloseTo(first.left);
    expect(second.top).toBeCloseTo(first.top);
  });

  it("连续多次调用不同鼠标位置，快照不被污染", () => {
    const { select, childEl, state } = setupResize();

    resizeObject(select as any, state, createFulateEvent({ x: 150, y: 150 }), "br");
    resizeObject(select as any, state, createFulateEvent({ x: 200, y: 200 }), "br");
    resizeObject(select as any, state, createFulateEvent({ x: 150, y: 150 }), "br");

    const first = (select.updateSelectFrame as any).mock.calls[0][0];
    const third = (select.updateSelectFrame as any).mock.calls[2][0];

    expect(third.width).toBeCloseTo(first.width);
    expect(third.height).toBeCloseTo(first.height);
    expect(third.left).toBeCloseTo(first.left);
    expect(third.top).toBeCloseTo(first.top);
  });

  it("连续 tl resize，快照 worldCenterPoint 不被修改", () => {
    const { select, childEl, state } = setupResize();
    const originalCenter = state.snapshots[0].worldCenterPoint;
    const cx = originalCenter.x;
    const cy = originalCenter.y;

    resizeObject(select as any, state, createFulateEvent({ x: 30, y: 30 }), "tl");
    resizeObject(select as any, state, createFulateEvent({ x: 60, y: 60 }), "tl");

    expect(originalCenter.x).toBe(cx);
    expect(originalCenter.y).toBe(cy);
  });
});

// ═════════════════════════════════════════════════════════════
// rotateCallback — 连续调用幂等性
// ═════════════════════════════════════════════════════════════

describe("rotateCallback — 连续调用幂等性", () => {
  function setupRotate() {
    const select = createMockSelect({
      left: 0, top: 0, width: 100, height: 100, angle: 0,
      originX: "center", originY: "center", snapAngle: 0,
    });
    select.getPositionByOrigin = vi.fn(() => new Point(50, 50));
    select.getRelativeCenterPoint = vi.fn(() => new Point(50, 50));

    const el = mockElement({ left: 0, top: 0, width: 100, height: 100 });
    el.applyTransformMatrix = vi.fn();
    const snapshot = createElementSnapshot(el);
    const state = createSelectState(select, [snapshot]);

    return { select, el, state };
  }

  it("同一角度连续调用，结果一致", () => {
    const { select, el, state } = setupRotate();
    const initPoint = new Point(150, 50);
    const event = createFulateEvent({ x: 50, y: 150 });

    rotateCallback(select as any, initPoint, state, event);
    const firstAngle = (select.updateSelectFrame as any).mock.calls[0][0].angle;

    rotateCallback(select as any, initPoint, state, event);
    const secondAngle = (select.updateSelectFrame as any).mock.calls[1][0].angle;

    expect(secondAngle).toBeCloseTo(firstAngle);
  });

  it("连续调用不污染快照 worldCenterPoint", () => {
    const { select, el, state } = setupRotate();
    const originalCenter = state.snapshots[0].worldCenterPoint;
    const cx = originalCenter.x;
    const cy = originalCenter.y;

    const initPoint = new Point(150, 50);
    rotateCallback(select as any, initPoint, state, createFulateEvent({ x: 50, y: 150 }));
    rotateCallback(select as any, initPoint, state, createFulateEvent({ x: -50, y: 50 }));

    expect(originalCenter.x).toBe(cx);
    expect(originalCenter.y).toBe(cy);
  });
});
