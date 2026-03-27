/**
 * 测试工具函数集合
 * 提供工厂方法、mock 对象、断言辅助，解耦测试与 layer/root 等外部依赖。
 */
import { vi, expect, type Mock } from "vitest";
import { Transformable, TransformableOptions } from "../src/node/transformable";
import { Node } from "../src/node/node";
import { Element, BaseElementOption } from "../src/node/element";
import { EventEmitter, CustomEvent } from "../src/event";
import { Point, resolveOrigin, degreesToRadians } from "@fulate/util";
import type { TOriginX, TOriginY } from "@fulate/util";

// ==================== 工厂函数 ====================

/**
 * 创建独立的 Transformable 实例（无 layer/root 依赖）。
 * 自动初始化 _provides 以避免 inject 报错。
 */
export function createTransformable(opts?: Partial<TransformableOptions>) {
  const t = new Transformable();
  t._provides = {};
  if (opts) Object.assign(t, opts);
  return t;
}

/**
 * 创建带父子关系的 Transformable 对。
 * 父矩阵会被预先计算，确保子的 calcWorldMatrix 可正确引用。
 */
export function createParentChild(
  parentOpts?: Partial<TransformableOptions>,
  childOpts?: Partial<TransformableOptions>
) {
  const parent = createTransformable({ width: 100, height: 100, ...parentOpts });
  const child = createTransformable({ width: 50, height: 50, ...childOpts });
  child.parent = parent as any;
  parent.children = [child as any];
  parent.calcWorldMatrix();
  return { parent, child };
}

/**
 * 创建独立的 Node 实例，并初始化 _provides。
 */
export function createNode() {
  const n = new Node();
  n._provides = {};
  return n;
}

/**
 * 创建带 mock root/layer 的已 activate 节点树根。
 * 返回的 root 节点已处于 activated 状态，可直接 append 子节点。
 */
export function createActivatedRoot() {
  const root = createNode();
  const mockRoot = createMockRoot();
  const mockLayer = createMockLayer();

  root._provides = {
    root: mockRoot,
    layer: mockLayer,
  };
  root._root = mockRoot as any;
  root._layer = mockLayer as any;
  root.isMounted = true;
  root.isActiveed = true;

  return { node: root, mockRoot, mockLayer };
}

/**
 * 创建最小可用的 Element（无 layer/root 依赖，不触发 activate 流程）。
 */
export function createElement(opts?: Partial<BaseElementOption>) {
  const el = new Element();
  el._provides = {};
  if (opts) {
    Object.assign(el, opts);
  }
  return el;
}

/**
 * 创建已 activate 的 Element，可安全调用 markNeedsLayout 等。
 */
export function createActivatedElement(opts?: Partial<BaseElementOption>) {
  const el = createElement({ width: 100, height: 100, ...opts });
  const mockRoot = createMockRoot();
  const mockLayer = createMockLayer();

  el._provides = { root: mockRoot, layer: mockLayer };
  el._root = mockRoot as any;
  el._layer = mockLayer as any;
  el.isMounted = true;
  el.isActiveed = true;

  return { el, mockRoot, mockLayer };
}

/**
 * 创建独立的 EventEmitter 实例。
 */
export function createEmitter() {
  return new EventEmitter();
}

/**
 * 创建一条冒泡链：child → middle → top，
 * 每个节点通过 parent 指向上级。
 */
export function createBubbleChain() {
  const top = createEmitter();
  const middle = createEmitter();
  const child = createEmitter();

  child.parent = middle;
  middle.parent = top;
  (middle as any).pickable = true;
  (top as any).pickable = true;

  return { top, middle, child };
}

// ==================== Mock 对象 ====================

export interface MockRoot {
  idElements: Map<string, any>;
  keyElmenet: Map<string, any>;
  _provides: Record<string, any>;
  isUnmounted: boolean;
  _pendingLayers: Set<any>;
  textDefaults: Record<string, any>;
}

export function createMockRoot(viewportRect?: {
  left: number;
  top: number;
  width: number;
  height: number;
}): MockRoot {
  const root: MockRoot = {
    idElements: new Map(),
    keyElmenet: new Map(),
    _provides: {},
    isUnmounted: false,
    _pendingLayers: new Set(),
    textDefaults: {},
  };
  if (viewportRect) {
    (root as any).viewport = {
      getWorldRect: () => ({ ...viewportRect }),
    };
  }
  return root;
}

export interface MockLayer {
  addDirtyNode: Mock;
  addPaintDirtyNode: Mock;
  removeRbush: Mock;
  syncRbush: Mock;
  requestRender: Mock;
  _dirtyVisitSet: Set<any> | null;
  _frameId: number;
  isUnmounted: boolean;
}

export function createMockLayer(): MockLayer {
  return {
    addDirtyNode: vi.fn(),
    addPaintDirtyNode: vi.fn(),
    removeRbush: vi.fn(),
    syncRbush: vi.fn(),
    requestRender: vi.fn(),
    _dirtyVisitSet: null,
    _frameId: 1,
    isUnmounted: false,
  };
}

// ==================== 断言辅助 ====================

const FLOAT_PRECISION = 5;

/**
 * 断言 DOMMatrix 接近目标值（浮点安全）。
 */
export function expectMatrixCloseTo(
  m: DOMMatrix,
  expected: { a: number; b: number; c: number; d: number; e: number; f: number }
) {
  expect(m.a).toBeCloseTo(expected.a, FLOAT_PRECISION);
  expect(m.b).toBeCloseTo(expected.b, FLOAT_PRECISION);
  expect(m.c).toBeCloseTo(expected.c, FLOAT_PRECISION);
  expect(m.d).toBeCloseTo(expected.d, FLOAT_PRECISION);
  expect(m.e).toBeCloseTo(expected.e, FLOAT_PRECISION);
  expect(m.f).toBeCloseTo(expected.f, FLOAT_PRECISION);
}

/**
 * 断言 DOMMatrix 为单位矩阵。
 */
export function expectIdentityMatrix(m: DOMMatrix) {
  expectMatrixCloseTo(m, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
}

/**
 * 断言 Point 坐标接近目标值。
 */
export function expectPointCloseTo(
  p: { x: number; y: number },
  expected: { x: number; y: number },
  precision = FLOAT_PRECISION
) {
  expect(p.x).toBeCloseTo(expected.x, precision);
  expect(p.y).toBeCloseTo(expected.y, precision);
}

/**
 * 断言 RectWithCenter 接近目标值。
 */
export function expectRectCloseTo(
  r: { left: number; top: number; width: number; height: number },
  expected: { left: number; top: number; width: number; height: number },
  precision = FLOAT_PRECISION
) {
  expect(r.left).toBeCloseTo(expected.left, precision);
  expect(r.top).toBeCloseTo(expected.top, precision);
  expect(r.width).toBeCloseTo(expected.width, precision);
  expect(r.height).toBeCloseTo(expected.height, precision);
}

// ==================== 数学辅助 ====================

/** 角度转弧度，复用 @fulate/util 的 degreesToRadians */
export const deg2rad = degreesToRadians;

/**
 * 手动计算 calcWorldMatrix 的期望结果，与源码逻辑 1:1 对应：
 *   M = translate(left, top)
 *       · translate(offsetX, offsetY)
 *       · rotate(angle)
 *       · skewX(skew)
 *       · scale(sx, sy)
 *       · translate(-offsetX, -offsetY)
 *
 * originX/originY 使用与源码相同的 resolveOrigin 语义：
 *   "center"=0, "left"=-0.5, "right"=0.5, "top"=-0.5, "bottom"=0.5
 * 内部自动计算 offset = (resolveOrigin(origin) - resolveOrigin("left/top")) * size
 */
export function computeExpectedMatrix(opts: {
  left?: number;
  top?: number;
  width: number;
  height: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  skewX?: number;
  originX?: TOriginX;
  originY?: TOriginY;
}) {
  const {
    left = 0, top = 0, width, height,
    angle = 0, scaleX = 1, scaleY = 1, skewX = 0,
    originX = "center", originY = "center",
  } = opts;

  const ox = resolveOrigin(originX) - resolveOrigin("left" as TOriginX);
  const oy = resolveOrigin(originY) - resolveOrigin("top" as TOriginY);

  const m = new DOMMatrix();
  m.translateSelf(left, top);

  const hasAngle = angle !== 0;
  const hasScale = scaleX !== 1 || scaleY !== 1;
  const hasSkew = skewX !== 0;

  if (hasAngle || hasScale || hasSkew) {
    const offsetX = ox * width;
    const offsetY = oy * height;
    m.translateSelf(offsetX, offsetY);
    if (hasAngle) m.rotateSelf(0, 0, angle);
    if (hasSkew) m.skewXSelf(skewX);
    if (hasScale) m.scaleSelf(scaleX, scaleY);
    m.translateSelf(-offsetX, -offsetY);
  }

  return m;
}

// ==================== 状态重置 ====================

/**
 * 重置 Node 静态计数器（避免测试间 ID 串扰）。
 */
export function resetNodeStatics() {
  Node.uIndex = 1;
  Node._uidSeq = 0;
}
