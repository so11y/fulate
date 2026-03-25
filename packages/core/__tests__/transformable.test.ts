import { describe, it, expect, beforeEach, vi } from "vitest";
import { Transformable } from "../src/node/transformable";
import { Point } from "@fulate/util";
import {
  createTransformable,
  createParentChild,
  createActivatedElement,
  expectMatrixCloseTo,
  expectIdentityMatrix,
  expectPointCloseTo,
  expectRectCloseTo,
  computeExpectedMatrix,
  deg2rad,
  createMockLayer
} from "./helpers";

// ==================== calcWorldMatrix ====================

describe("calcWorldMatrix", () => {
  it("默认值 → 单位矩阵", () => {
    const t = createTransformable({ width: 100, height: 100 });
    const m = t.calcWorldMatrix();
    expectIdentityMatrix(m);
  });

  it("纯平移 left=100, top=50", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 100,
      top: 50
    });
    const m = t.calcWorldMatrix();
    expectMatrixCloseTo(m, { a: 1, b: 0, c: 0, d: 1, e: 100, f: 50 });
  });

  it("旋转 90°（originX=center, originY=center）", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      angle: 90,
      originX: "center",
      originY: "center"
    });
    const expected = computeExpectedMatrix({
      width: 100,
      height: 100,
      angle: 90
    });
    const m = t.calcWorldMatrix();
    expectMatrixCloseTo(m, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });

  it("旋转 45° → a/b/c/d 接近 cos45/sin45", () => {
    const t = createTransformable({ width: 100, height: 100, angle: 45 });
    const m = t.calcWorldMatrix();
    const cos45 = Math.cos(deg2rad(45));
    const sin45 = Math.sin(deg2rad(45));
    expect(m.a).toBeCloseTo(cos45, 5);
    expect(m.b).toBeCloseTo(sin45, 5);
    expect(m.c).toBeCloseTo(-sin45, 5);
    expect(m.d).toBeCloseTo(cos45, 5);
  });

  it("缩放 scaleX=2, scaleY=3", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      scaleX: 2,
      scaleY: 3
    });
    const m = t.calcWorldMatrix();
    expect(m.a).toBeCloseTo(2, 5);
    expect(m.d).toBeCloseTo(3, 5);
    expect(m.b).toBeCloseTo(0, 5);
    expect(m.c).toBeCloseTo(0, 5);
  });

  it("skewX=30", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      skewX: 30
    });
    const expected = computeExpectedMatrix({
      width: 100,
      height: 100,
      skewX: 30
    });
    const m = t.calcWorldMatrix();
    expectMatrixCloseTo(m, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });

  it("复合变换：平移+旋转+缩放", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 50,
      top: 30,
      angle: 45,
      scaleX: 2,
      scaleY: 1.5
    });
    const expected = computeExpectedMatrix({
      width: 100,
      height: 100,
      left: 50,
      top: 30,
      angle: 45,
      scaleX: 2,
      scaleY: 1.5
    });
    const m = t.calcWorldMatrix();
    expectMatrixCloseTo(m, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });

  it("父子矩阵继承：子矩阵 = 父矩阵 × 子自身变换", () => {
    const { parent, child } = createParentChild(
      { left: 100, top: 50 },
      { left: 20, top: 10 }
    );
    const cm = child.calcWorldMatrix();
    expect(cm.e).toBeCloseTo(120, 5);
    expect(cm.f).toBeCloseTo(60, 5);
  });

  it("父子矩阵继承：父旋转影响子位置", () => {
    const { parent, child } = createParentChild(
      { left: 0, top: 0, angle: 90, width: 100, height: 100 },
      { left: 50, top: 0, width: 50, height: 50 }
    );
    parent.calcWorldMatrix();
    const cm = child.calcWorldMatrix();

    const expected = new DOMMatrix();
    expected.multiplySelf(parent.getOwnMatrix());
    expected.translateSelf(50, 0);
    expectMatrixCloseTo(cm, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });

  it("originX='left', originY='top' → 旋转中心在左上角", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      angle: 90,
      originX: "left",
      originY: "top"
    });
    const m = t.calcWorldMatrix();
    const expected = computeExpectedMatrix({
      width: 100,
      height: 100,
      angle: 90,
      originX: "left",
      originY: "top"
    });
    expectMatrixCloseTo(m, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });

  it("originX='right', originY='bottom' → 旋转中心在右下角", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      angle: 90,
      originX: "right",
      originY: "bottom"
    });
    const m = t.calcWorldMatrix();
    const expected = computeExpectedMatrix({
      width: 100,
      height: 100,
      angle: 90,
      originX: "right",
      originY: "bottom"
    });
    expectMatrixCloseTo(m, {
      a: expected.a,
      b: expected.b,
      c: expected.c,
      d: expected.d,
      e: expected.e,
      f: expected.f
    });
  });
});

// ==================== getCoords / setCoords ====================

describe("getCoords / setCoords", () => {
  it("无变换的 100×100 矩形 → 四角坐标正确", () => {
    const t = createTransformable({ width: 100, height: 100 });
    t.calcWorldMatrix();
    const coords = t.getCoords()!;
    expectPointCloseTo(coords[0], { x: 0, y: 0 });
    expectPointCloseTo(coords[1], { x: 100, y: 0 });
    expectPointCloseTo(coords[2], { x: 100, y: 100 });
    expectPointCloseTo(coords[3], { x: 0, y: 100 });
  });

  it("平移 left=50, top=30 → 四角各加偏移", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 50,
      top: 30
    });
    t.calcWorldMatrix();
    const coords = t.getCoords()!;
    expectPointCloseTo(coords[0], { x: 50, y: 30 });
    expectPointCloseTo(coords[1], { x: 150, y: 30 });
    expectPointCloseTo(coords[2], { x: 150, y: 130 });
    expectPointCloseTo(coords[3], { x: 50, y: 130 });
  });

  it("旋转 90°（center origin）→ 四角正确旋转", () => {
    const t = createTransformable({ width: 100, height: 100, angle: 90 });
    t.calcWorldMatrix();
    const coords = t.getCoords()!;
    expectPointCloseTo(coords[0], { x: 100, y: 0 }, 3);
    expectPointCloseTo(coords[1], { x: 100, y: 100 }, 3);
    expectPointCloseTo(coords[2], { x: 0, y: 100 }, 3);
    expectPointCloseTo(coords[3], { x: 0, y: 0 }, 3);
  });

  it("缩放 2x（围绕 center）→ 四角坐标正确放大", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      scaleX: 2,
      scaleY: 2
    });
    t.calcWorldMatrix();
    const coords = t.getCoords()!;
    expectPointCloseTo(coords[0], { x: -50, y: -50 }, 3);
    expectPointCloseTo(coords[1], { x: 150, y: -50 }, 3);
    expectPointCloseTo(coords[2], { x: 150, y: 150 }, 3);
    expectPointCloseTo(coords[3], { x: -50, y: 150 }, 3);
  });

  it("父节点有变换 → 子节点四角受父矩阵影响", () => {
    const { parent, child } = createParentChild(
      { left: 100, top: 0 },
      { left: 0, top: 0 }
    );
    child.calcWorldMatrix();
    const coords = child.getCoords()!;
    expectPointCloseTo(coords[0], { x: 100, y: 0 });
    expectPointCloseTo(coords[1], { x: 150, y: 0 });
  });

  it("getCoords 惰性缓存 → setCoords 强制重算", () => {
    const t = createTransformable({ width: 100, height: 100 });
    t.calcWorldMatrix();
    const coords1 = t.getCoords();
    const coords2 = t.getCoords();
    expect(coords1).toBe(coords2);

    t.setCoords();
    const coords3 = t.getCoords();
    expect(coords1).not.toBe(coords3);
  });
});

// ==================== getBoundingRect ====================

describe("getBoundingRect", () => {
  it("无旋转 → AABB = 自身 rect", () => {
    const t = createTransformable({
      width: 100,
      height: 50,
      left: 10,
      top: 20
    });
    t.calcWorldMatrix();
    const r = t.getBoundingRect();
    expectRectCloseTo(r, { left: 10, top: 20, width: 100, height: 50 });
  });

  it("旋转 45° → AABB 正确扩大", () => {
    const t = createTransformable({ width: 100, height: 100, angle: 45 });
    t.calcWorldMatrix();
    const r = t.getBoundingRect();
    const diag = 100 * Math.sqrt(2);
    expect(r.width).toBeCloseTo(diag, 1);
    expect(r.height).toBeCloseTo(diag, 1);
  });

  it("旋转 90° → AABB 宽高互换", () => {
    const t = createTransformable({ width: 200, height: 100, angle: 90 });
    t.calcWorldMatrix();
    const r = t.getBoundingRect();
    expect(r.width).toBeCloseTo(100, 1);
    expect(r.height).toBeCloseTo(200, 1);
  });

  it("缓存有效 → 第二次调用返回同一对象引用", () => {
    const t = createTransformable({ width: 100, height: 100 });
    t.calcWorldMatrix();
    const r1 = t.getBoundingRect();
    const r2 = t.getBoundingRect();
    expect(r1).toBe(r2);
  });
});

// ==================== hasPointHint ====================

describe("hasPointHint", () => {
  let t: Transformable;

  beforeEach(() => {
    t = createTransformable({ width: 100, height: 100 });
    t.calcWorldMatrix();
  });

  it("点在矩形内部 → true", () => {
    expect(t.hasPointHint(new Point(50, 50))).toBe(true);
  });

  it("点在矩形外部 → false", () => {
    expect(t.hasPointHint(new Point(200, 200))).toBe(false);
  });

  it("点在边界上 → true", () => {
    expect(t.hasPointHint(new Point(0, 0))).toBe(true);
    expect(t.hasPointHint(new Point(100, 100))).toBe(true);
    expect(t.hasPointHint(new Point(100, 0))).toBe(true);
    expect(t.hasPointHint(new Point(0, 100))).toBe(true);
  });

  it("有旋转的情况 → 正确转换到局部坐标判定", () => {
    const rotated = createTransformable({ width: 100, height: 100, angle: 45 });
    rotated.calcWorldMatrix();
    const center = new Point(50, 50);
    expect(rotated.hasPointHint(center)).toBe(true);

    const farAway = new Point(200, 200);
    expect(rotated.hasPointHint(farAway)).toBe(false);
  });

  it("width/height undefined → false", () => {
    const noSize = createTransformable();
    noSize.calcWorldMatrix();
    expect(noSize.hasPointHint(new Point(0, 0))).toBe(false);
  });
});

// ==================== getPositionByOrigin ====================

describe("getPositionByOrigin", () => {
  it("center → left/top → 坐标偏移正确", () => {
    const t = createTransformable({ width: 100, height: 80 });
    const result = t.getPositionByOrigin(
      { x: 50, y: 40 },
      "center",
      "center",
      "left",
      "top"
    );
    expectPointCloseTo(result, { x: 0, y: 0 });
  });

  it("left/top → center → 反向偏移正确", () => {
    const t = createTransformable({ width: 100, height: 80 });
    const result = t.getPositionByOrigin(
      { x: 0, y: 0 },
      "left",
      "top",
      "center",
      "center"
    );
    expectPointCloseTo(result, { x: 50, y: 40 });
  });

  it("自定义数值 origin → 计算正确", () => {
    const t = createTransformable({ width: 200, height: 100 });
    const result = t.getPositionByOrigin({ x: 100, y: 50 }, 0, 0, 0.5, 0.5);
    expectPointCloseTo(result, { x: 200, y: 100 });
  });

  it("可复用 out 参数", () => {
    const t = createTransformable({ width: 100, height: 100 });
    const out = new Point(0, 0);
    const result = t.getPositionByOrigin(
      { x: 50, y: 50 },
      "center",
      "center",
      "left",
      "top",
      out
    );
    expect(result).toBe(out);
    expectPointCloseTo(out, { x: 0, y: 0 });
  });
});

// ==================== getWorldCenterPoint ====================

describe("getWorldCenterPoint", () => {
  it("无变换 → 中心 = (width/2, height/2) 经矩阵变换", () => {
    const t = createTransformable({ width: 100, height: 80 });
    t.calcWorldMatrix();
    const center = t.getWorldCenterPoint();
    expectPointCloseTo(center, { x: 50, y: 40 }, 3);
  });

  it("有旋转（围绕自身中心）→ 中心点不移动", () => {
    const t = createTransformable({ width: 100, height: 100, angle: 45 });
    t.calcWorldMatrix();
    const center = t.getWorldCenterPoint();
    expectPointCloseTo(center, { x: 50, y: 50 }, 3);
  });

  it("有平移 → 中心点跟随平移", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 200,
      top: 100
    });
    t.calcWorldMatrix();
    const center = t.getWorldCenterPoint();
    expectPointCloseTo(center, { x: 250, y: 150 }, 3);
  });
});

// ==================== 脏标记与缓存 ====================

describe("脏标记与缓存", () => {
  it("markNeedsLayout → isDirty=true", () => {
    const { el } = createActivatedElement();
    el.isDirty = false;
    el.markNeedsLayout();
    expect(el.isDirty).toBe(true);
  });

  it("markNeedsLayout → _boundingRectCache=null", () => {
    const { el } = createActivatedElement();
    el.calcWorldMatrix();
    el.getBoundingRect();
    expect((el as any)._boundingRectCache).not.toBeNull();

    el.markNeedsLayout();
    expect((el as any)._boundingRectCache).toBeNull();
  });

  it("markNeedsLayout → _coords=null", () => {
    const { el } = createActivatedElement();
    el.calcWorldMatrix();
    el.getCoords();
    expect((el as any)._coords).not.toBeNull();

    el.markNeedsLayout();
    expect((el as any)._coords).toBeNull();
  });

  it("markNeedsLayout → _lastBoundingRect 保留旧值", () => {
    const { el } = createActivatedElement();
    el.calcWorldMatrix();
    const origRect = el.getBoundingRect();

    el.markNeedsLayout();
    expect((el as any)._lastBoundingRect).not.toBeNull();
    expectRectCloseTo((el as any)._lastBoundingRect, origRect);
  });

  it("markNeedsLayout 幂等：连续调用两次第二次为 no-op", () => {
    const { el, mockLayer } = createActivatedElement();
    el.isDirty = false;

    el.markNeedsLayout();
    const callCount = mockLayer.addDirtyNode.mock.calls.length;

    el.markNeedsLayout();
    expect(mockLayer.addDirtyNode.mock.calls.length).toBe(callCount);
  });

  it("连续两次 markNeedsLayout → _lastBoundingRect 合并旧+中间值", () => {
    const { el } = createActivatedElement({
      left: 0,
      top: 0,
      width: 50,
      height: 50
    });
    el.calcWorldMatrix();
    el.getBoundingRect();

    el.isDirty = false;
    el.markNeedsLayout();

    el.left = 100;
    el.calcWorldMatrix();
    el.getBoundingRect();

    el.isDirty = false;
    el.markNeedsLayout();

    const last = (el as any)._lastBoundingRect;
    expect(last).not.toBeNull();
    expect(last.left).toBeLessThanOrEqual(0);
    expect(last.left + last.width).toBeGreaterThanOrEqual(150);
  });

  it("updateTransform 后 isDirty=false", () => {
    const { el } = createActivatedElement();
    el.markNeedsLayout();
    expect(el.isDirty).toBe(true);

    el.updateTransform(false);
    expect(el.isDirty).toBe(false);
  });

  it("updateTransform 递归更新子节点", () => {
    const { el: parent, mockLayer } = createActivatedElement({
      left: 10,
      top: 10
    });
    const child = createTransformable({
      width: 50,
      height: 50,
      left: 5,
      top: 5
    });
    child.parent = parent as any;
    child._provides = parent._provides;
    child._root = parent._root as any;
    child._layer = parent._layer as any;
    child.isActiveed = true;
    child.isMounted = true;
    parent.children = [child as any];

    parent.markNeedsLayout();
    child.isDirty = true;

    parent.updateTransform(false);

    expect(parent.isDirty).toBe(false);
    expect(child.isDirty).toBe(false);

    const childM = child.getOwnMatrix();
    expect(childM.e).toBeCloseTo(15, 3);
    expect(childM.f).toBeCloseTo(15, 3);
  });
});

// ==================== getWorldPoint / getGlobalToLocal ====================

describe("getWorldPoint / getGlobalToLocal", () => {
  it("getWorldPoint 将局部点映射到世界坐标", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 50,
      top: 30
    });
    t.calcWorldMatrix();
    const wp = t.getWorldPoint(new Point(0, 0));
    expectPointCloseTo(wp, { x: 50, y: 30 });
  });

  it("getGlobalToLocal 将世界点映射到局部坐标", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 50,
      top: 30
    });
    t.calcWorldMatrix();
    const lp = t.getGlobalToLocal(new Point(50, 30));
    expectPointCloseTo(lp, { x: 0, y: 0 });
  });

  it("getWorldPoint 与 getGlobalToLocal 互为逆操作", () => {
    const t = createTransformable({
      width: 100,
      height: 100,
      left: 50,
      top: 30,
      angle: 37,
      scaleX: 1.5
    });
    t.calcWorldMatrix();
    const local = new Point(25, 40);
    const world = t.getWorldPoint(local);
    const backToLocal = t.getGlobalToLocal(world);
    expectPointCloseTo(backToLocal, { x: 25, y: 40 }, 3);
  });
});

// ==================== resolveFitSize ====================

describe("resolveFitSize", () => {
  it("fitWidth=true 且未显式设置宽度 → 继承父 width", () => {
    const { parent, child } = createParentChild(
      { width: 300, height: 200 },
      { width: 50, height: 50 }
    );
    child.fitWidth = true;
    child._hasExplicitWidth = false;

    child.resolveFitSize();
    expect(child.width).toBe(300);
  });

  it("fitWidth=true 但已显式设置宽度 → 不覆盖", () => {
    const { parent, child } = createParentChild(
      { width: 300, height: 200 },
      { width: 80, height: 50 }
    );
    child.fitWidth = true;
    child._hasExplicitWidth = true;

    child.resolveFitSize();
    expect(child.width).toBe(80);
  });
});
