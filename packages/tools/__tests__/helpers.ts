/**
 * @fulate/tools 测试辅助
 *
 * 提供 mock 工厂函数，解耦测试与 core/ui 的运行时依赖。
 * core 包已有的辅助（createElement / createMockRoot / createMockLayer 等）
 * 在这里 re-export 并做 tools 层的增量扩展。
 */
import { vi, type Mock } from "vitest";
import { Point } from "@fulate/util";
import { Element } from "../../core/src/node/element";
import type { BaseElementOption } from "../../core/src/node/element";
import type { Select } from "../src/select/index";
import type { ControlSchema } from "../src/select/controls";
import { DEFAULT_RECT_SCHEMA } from "../src/select/controls";

// ─── re-export core helpers ──────────────────────────────────
export {
  createElement,
  createActivatedElement,
  createMockRoot,
  createMockLayer,
  createNode,
  createTransformable,
  expectMatrixCloseTo,
  expectIdentityMatrix,
  expectPointCloseTo,
  expectRectCloseTo,
  computeExpectedMatrix,
  resetNodeStatics,
  deg2rad,
} from "../../core/__tests__/helpers";

export type {
  MockRoot,
  MockLayer,
} from "../../core/__tests__/helpers";

// ─── FulateEvent 工厂 ────────────────────────────────────────

/**
 * 构造可用于 controls / interaction 的 FulateEvent mock。
 * detail 中包含 x, y, target, shiftKey 等；
 * 顶层也保留 shiftKey / ctrlKey 以兼容 interaction.ts 的用法。
 */
export function createFulateEvent(
  overrides: {
    x?: number;
    y?: number;
    target?: any;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    buttons?: number;
    deltaX?: number;
    deltaY?: number;
  } = {}
) {
  const {
    x = 0,
    y = 0,
    target = null,
    shiftKey = false,
    ctrlKey = false,
    buttons = 0,
    deltaX = 0,
    deltaY = 0,
  } = overrides;

  return {
    shiftKey,
    ctrlKey,
    detail: {
      x,
      y,
      target,
      buttons,
      deltaX,
      deltaY,
      shiftKey,
      ctrlKey,
    },
  } as any;
}

// ─── Element mock 工厂 ───────────────────────────────────────

/**
 * 创建带 mock 方法的轻量 Element。
 * 不触发 activate，但 inject/provide/_provides 可用。
 */
export function mockElement(
  overrides: Partial<BaseElementOption> & Record<string, any> = {}
) {
  const el = new Element();
  el._provides = {};

  Object.assign(el, {
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    originX: "center",
    originY: "center",
    visible: true,
    selectctbale: undefined,
    type: "element",
    ...overrides,
  });

  return el;
}

/**
 * 创建一个 Element mock，带有指定的 boundingRect 返回值和 setOptions spy。
 * 用于 align / controls 等需要 getBoundingRect + setOptions 的测试。
 */
export function mockElementWithRect(rect: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  const el = mockElement({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  });

  el.getBoundingRect = vi.fn().mockReturnValue({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  });

  const originalSetOptions = el.setOptions.bind(el);
  el.setOptions = vi.fn((opts: any) => {
    if (opts) Object.assign(el, opts);
    return el;
  });

  return el;
}

/**
 * 创建带 group inject 的 Element（测 checkElement 的 group 解析）。
 */
export function mockGroupedElement(
  element: Element,
  group: Element
) {
  element.provide("group", group);
  return element;
}

/**
 * 批量创建带指定 boundingRect 的元素数组。
 */
export function mockElementsWithRects(
  rects: Array<{ left: number; top: number; width: number; height: number }>
) {
  return rects.map((r) => mockElementWithRect(r));
}

// ─── Layer / Artboard mock ───────────────────────────────────

export function mockLayer(overrides: Record<string, any> = {}) {
  const layer = mockElement({ type: "layer", ...overrides });
  (layer as any).isLayer = true;
  return layer;
}

export function mockArtboard(overrides: Record<string, any> = {}) {
  const layer = mockElement({ type: "artboard", ...overrides });
  (layer as any).isLayer = true;
  return layer;
}

// ─── Root mock（tools 级别，扩展 core 的 MockRoot） ──────────

export interface ToolsMockRoot {
  idElements: Map<string, any>;
  keyElmenet: Map<string, any>;
  _provides: Record<string, any>;
  isUnmounted: boolean;
  _pendingLayers: Set<any>;
  viewport: { scale: number; x: number; y: number };
  container: HTMLDivElement;
  layers: any[];
  searchArea: Mock;
  searchHitElements: Mock;
  nextTick: Mock;
  find: Mock;
  getCurrnetEelement: Mock;
  lastPointerPos: { x: number; y: number };
  addEventListener: Mock;
  removeEventListener: Mock;
  checkHit: Mock;
}

export function createToolsMockRoot(
  overrides: Partial<ToolsMockRoot> = {}
): ToolsMockRoot {
  const container = document.createElement("div");
  container.tabIndex = -1;

  return {
    idElements: new Map(),
    keyElmenet: new Map(),
    _provides: {},
    isUnmounted: false,
    _pendingLayers: new Set(),
    viewport: {
      scale: 1, x: 0, y: 0,
      dpr: 1,
      getWorldRect: vi.fn(() => ({ left: 0, top: 0, width: 1000, height: 1000 })),
      getLogicalPosition: vi.fn((x: number, y: number) => new Point(x, y)),
      applyViewPointTransform: vi.fn(),
      getViewPointMtrix: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
      getZoom: vi.fn(() => 1),
      zoom: vi.fn(() => 1),
      reset: vi.fn(),
      focus: vi.fn(() => Promise.resolve()),
      syncPaintedViewport: vi.fn(),
      _applyCssTransform: vi.fn(),
      _flushCssTransform: vi.fn(),
      dispose: vi.fn(),
      _tweenGroup: { getAll: vi.fn(() => []), update: vi.fn(), removeAll: vi.fn() },
      _paintedViewport: { x: 0, y: 0, scale: 1 },
      _cssTransformTimer: null,
      _isCssTransforming: false,
      cssTransformThreshold: 0.45,
      minScale: 0.1,
      maxScale: 10,
    },
    container,
    layers: [],
    searchArea: vi.fn(),
    searchHitElements: vi.fn(),
    nextTick: vi.fn((fn: () => void) => fn()),
    find: vi.fn(),
    getCurrnetEelement: vi.fn(() => null),
    lastPointerPos: { x: 0, y: 0 },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    checkHit: vi.fn(),
    ...overrides,
  };
}

// ─── History mock ────────────────────────────────────────────

export interface MockHistory {
  snapshot: Mock;
  commit: Mock;
  pushAction: Mock;
  undo: Mock;
  redo: Mock;
}

export function createMockHistory(): MockHistory {
  return {
    snapshot: vi.fn(),
    commit: vi.fn(),
    pushAction: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

// ─── Select mock ─────────────────────────────────────────────

export interface MockSelect {
  selectEls: Element[];
  currentControl: any;
  hoverElement: Element | null;
  controlSize: number;
  hitPadding: number;
  snapAngle: number;
  snapThreshold: number;
  controlCoords: Point[];
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  originX: string;
  originY: string;
  key: string;
  type: string;
  root: ToolsMockRoot;
  layer: any;
  history: MockHistory;
  select: Mock;
  updateSelectFrame: Mock;
  getActiveSchema: Mock;
  getControlCoords: Mock;
  getParentCoords: Mock;
  bodyHasPoint: Mock;
  getWorldCenterPoint: Mock;
  getOwnMatrix: Mock;
  getPositionByOrigin: Mock;
  getRelativeCenterPoint: Mock;
  markNeedsLayout: Mock;
  markPaintDirty: Mock;
  setOptions: Mock;
  setOptionsSync: Mock;
  getCoords: Mock;
  getBoundingRect: Mock;
  calcWorldMatrix: Mock;
  getSnapPoints: Mock;
  hasPointHint: Mock;
  doGroup: Mock;
  unGroup: Mock;
  copy: Mock;
  paste: Mock;
  delete: Mock;
  canDiveIn: Mock;
  snapTool: any;
  connectedLines: Set<string>;
  id: string;
  _provides: Record<string, any>;
  inject: (key: string) => any;
  provide: (key: string, value: any) => void;
  dispatchEvent: Mock;
}

export function createMockSelect(
  overrides: Partial<MockSelect> = {}
): MockSelect {
  const mockRoot = createToolsMockRoot(
    overrides.root as any
  );
  const mockHist = overrides.history ?? createMockHistory();
  const mockLyr = overrides.layer ?? {
    addDirtyNode: vi.fn(),
    addPaintDirtyNode: vi.fn(),
    removeRbush: vi.fn(),
    syncRbush: vi.fn(),
    requestRender: vi.fn(),
    _dirtyVisitSet: null,
    _frameId: 1,
    isUnmounted: false,
  };

  const provides: Record<string, any> = {};

  const select: MockSelect = {
    selectEls: [],
    currentControl: null,
    hoverElement: null,
    controlSize: 6,
    hitPadding: 6,
    snapAngle: 45,
    snapThreshold: 5,
    controlCoords: [],
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    originX: "center",
    originY: "center",
    key: "select",
    type: "select",
    id: "select_mock",
    connectedLines: new Set(),
    root: mockRoot,
    layer: mockLyr,
    history: mockHist,
    _provides: provides,
    inject: (key: string) => provides[key],
    provide: (key: string, value: any) => { provides[key] = value; },

    select: vi.fn(),
    updateSelectFrame: vi.fn((opts: any) => {
      if (opts) Object.assign(select, opts);
    }),
    getActiveSchema: vi.fn(() => DEFAULT_RECT_SCHEMA),
    getControlCoords: vi.fn(() => select.controlCoords),
    getParentCoords: vi.fn(() => []),
    bodyHasPoint: vi.fn(() => false),
    getWorldCenterPoint: vi.fn(() => new Point(
      select.left + select.width / 2,
      select.top + select.height / 2
    )),
    getOwnMatrix: vi.fn(() => new DOMMatrix()),
    getPositionByOrigin: vi.fn(
      (center: Point) => new Point(
        center.x - select.width / 2,
        center.y - select.height / 2
      )
    ),
    getRelativeCenterPoint: vi.fn(() => new Point(
      select.width / 2,
      select.height / 2
    )),
    markNeedsLayout: vi.fn(),
    markPaintDirty: vi.fn(),
    setOptions: vi.fn((opts: any) => {
      if (opts) Object.assign(select, opts);
      return select;
    }),
    setOptionsSync: vi.fn((opts: any) => {
      if (opts) Object.assign(select, opts);
      return select;
    }),
    getCoords: vi.fn(() => []),
    getBoundingRect: vi.fn(() => ({
      left: select.left,
      top: select.top,
      width: select.width,
      height: select.height,
      centerX: select.left + select.width / 2,
      centerY: select.top + select.height / 2,
    })),
    calcWorldMatrix: vi.fn(() => new DOMMatrix()),
    getSnapPoints: vi.fn(() => []),
    hasPointHint: vi.fn(() => false),
    doGroup: vi.fn(),
    unGroup: vi.fn(),
    copy: vi.fn(),
    paste: vi.fn(),
    delete: vi.fn(),
    canDiveIn: vi.fn(() => false),
    snapTool: undefined,
    dispatchEvent: vi.fn(),

    ...overrides,
  };

  // 确保 overrides 后 root/history/layer 引用一致
  if (!overrides.root) select.root = mockRoot;
  if (!overrides.history) select.history = mockHist;
  if (!overrides.layer) select.layer = mockLyr;

  return select;
}

// ─── Element 扩展工厂 ─────────────────────────────────────────

/**
 * 创建带 parent 链的 Element mock。
 * parent 自带 children / removeChild / append / insertBefore。
 */
export function mockElementWithParent(
  parent?: any,
  overrides: Partial<BaseElementOption> & Record<string, any> = {}
) {
  const el = mockElement(overrides);
  const p = parent ?? {
    children: [] as any[],
    removeChild: vi.fn(function (this: any, child: any) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
    }),
    append: vi.fn(function (this: any, child: any) {
      if (!this.children.includes(child)) this.children.push(child);
      child.parent = this;
    }),
    insertBefore: vi.fn(function (this: any, child: any, ref: any) {
      const idx = this.children.indexOf(ref);
      if (idx >= 0) this.children.splice(idx, 0, child);
      else this.children.push(child);
      child.parent = this;
    }),
  };
  (el as any).parent = p;
  if (!p.children.includes(el)) p.children.push(el);
  (el as any).isMounted = true;
  (el as any).isActiveed = true;
  return { el, parent: p };
}

/**
 * 创建带 toJson() 返回指定数据的 Element mock。
 */
export function mockElementWithToJson(
  data: Record<string, any>,
  overrides: Record<string, any> = {}
) {
  const el = mockElement({ ...data, ...overrides });
  el.toJson = vi.fn(() => ({ ...data }));
  return el;
}

/**
 * Snap mock（start/detect/stop）。
 */
export function mockSnap() {
  return {
    start: vi.fn(),
    detect: vi.fn(() => ({ dx: 0, dy: 0 })),
    stop: vi.fn(),
    detectAnchorSnap: vi.fn(() => null),
    validateAnchorConnection: vi.fn(async () => true),
    anchorHighlights: [],
    isActive: false,
  };
}

// ─── ElementSnapshot 工厂 ────────────────────────────────────

/**
 * 创建 ElementSnapshot（controls.ts 的 rotateCallback / resizeObject 使用）。
 */
export function createElementSnapshot(
  el: any,
  overrides: Record<string, any> = {}
) {
  return {
    el,
    matrix: DOMMatrix.fromMatrix(new DOMMatrix()),
    worldCenterPoint: new Point(
      (el.left ?? 0) + (el.width ?? 100) / 2,
      (el.top ?? 0) + (el.height ?? 100) / 2
    ),
    width: el.width ?? 100,
    height: el.height ?? 100,
    scaleX: el.scaleX ?? 1,
    scaleY: el.scaleY ?? 1,
    ...overrides,
  };
}

/**
 * 创建 SelectState（controls.ts 的 onDrag 回调使用）。
 */
export function createSelectState(
  select: MockSelect,
  snapshots: any[],
  overrides: Record<string, any> = {}
) {
  return {
    theta: (select.angle ?? 0) * Math.PI / 180,
    angle: select.angle ?? 0,
    width: select.width,
    height: select.height,
    left: select.left,
    top: select.top,
    worldCenterPoint: new Point(
      select.left + select.width / 2,
      select.top + select.height / 2
    ),
    matrix: new DOMMatrix().translate(select.left, select.top),
    snapshots,
    ...overrides,
  };
}
