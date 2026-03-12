import { Node } from "../node/node";
import { Layer } from "../layer";
import type { RBushItem } from "../layer";
import { Element } from "../node/element";
import { CustomEvent } from "@fulate/util";
import { Point } from "@fulate/util";
import { RectWithCenter } from "@fulate/util";
import { Group } from "@tweenjs/tween.js";
import { initRootEvents } from "./events";
import { syncPaintedViewport, focusNode as focusNodeImpl } from "./viewport";
import {
  checkHit as checkHitImpl,
  searchHitElements as searchHitElementsImpl,
  searchArea as searchAreaImpl
} from "./hit-test";

export type { RBushItem };

export class Root extends Node {
  type = "root";

  container: HTMLElement;

  viewport = { x: 0, y: 0, scale: 1, matrix: new DOMMatrix() };
  currentElement?: RBushItem;
  keyElmenet = new Map<string, Element>();
  idElements = new Map<string, Element>();

  _provides = Object.create(null);

  isSpacePressed = false;
  isPanning = false;
  hasLockPoint = false;
  lastPointerPos = { x: 0, y: 0 };

  width: number;
  height: number;
  dpr = window.devicePixelRatio || 1;

  private _containerRect!: DOMRect;

  layers: Layer[] = [];

  _pendingLayers = new Set<Layer>();

  private _rafScheduled = false;
  private _rafId = 0;
  private _nextTickPromise: Promise<void> | null = null;
  private _nextTickResolve: (() => void) | null = null;

  _viewportTweenGroup = new Group();

  _paintedViewport = { x: 0, y: 0, scale: 1 };
  _cssTransformTimer: ReturnType<typeof setTimeout> | null = null;
  _isCssTransforming = false;
  cssTransformThreshold = 0.45;

  constructor(el: HTMLElement, options?: { width?: number; height?: number }) {
    super();
    this.container = el;
    this.width = options?.width ?? el.clientWidth;
    this.height = options?.height ?? el.clientHeight;
    this.container.style.position = "relative";
    this.container.style.userSelect = "none";
    this.container.style.touchAction = "none";
    this.container.style.overflow = "hidden";
    this.provide("root", this);
  }

  mount() {
    super.mount();
    this._updateContainerRect();

    const onRectChange = () => {
      this._updateContainerRect();
      this.dpr = window.devicePixelRatio || 1;
    };
    window.addEventListener("resize", onRectChange);
    window.addEventListener("scroll", onRectChange, true);
    this.addEventListener("unmounted", () => {
      window.removeEventListener("resize", onRectChange);
      window.removeEventListener("scroll", onRectChange, true);
    });

    initRootEvents(this);
    syncPaintedViewport(this);
    this.requestRender();
  }

  private _updateContainerRect() {
    this._containerRect = this.container.getBoundingClientRect();
  }

  get containerRect(): DOMRect {
    return this._containerRect;
  }

  // ================= Layer 管理 =================

  registerLayer(layer: Layer) {
    if (!this.layers.includes(layer)) {
      this.layers.push(layer);
      this.layers.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    }
  }

  unregisterLayer(layer: Layer) {
    const idx = this.layers.indexOf(layer);
    if (idx !== -1) {
      this.layers.splice(idx, 1);
    }
  }

  // ================= 渲染调度 =================

  requestRender() {
    this.layers.forEach((layer) => {
      layer.dirtyNodes.clear();
      layer.requestRender();
    });
  }

  scheduleLayerRender(layer: Layer) {
    this._pendingLayers.add(layer);
    if (this._rafScheduled) return;
    this._rafScheduled = true;

    this._rafId = requestAnimationFrame((time) => {
      this._rafId = 0;

      if (this.isUnmounted) return;

      if (this._viewportTweenGroup.getAll().length > 0) {
        this._viewportTweenGroup.update(time);
      }

      for (const l of this.layers) {
        if (l.tweenGroup.getAll().length > 0) {
          l.tweenGroup.update(time);
        }
      }

      for (const l of this._pendingLayers) {
        l.flushUpdate();
      }
      for (const l of this.layers) {
        l.flushSyncNodes();
      }
      for (const l of this._pendingLayers) {
        l.flushPaint();
      }
      this._pendingLayers.clear();
      this._rafScheduled = false;

      const hasActiveTweens =
        this._viewportTweenGroup.getAll().length > 0 ||
        this.layers.some((l) => l.tweenGroup.getAll().length > 0);

      if (hasActiveTweens) {
        this.requestRender();
      }

      const resolve = this._nextTickResolve;
      this._nextTickPromise = null;
      this._nextTickResolve = null;
      resolve?.();
    });
  }

  nextTick(callback: () => void) {
    if (!this._rafScheduled && this._pendingLayers.size === 0) {
      return Promise.resolve().then(callback);
    }
    if (!this._nextTickPromise) {
      this._nextTickPromise = new Promise<void>((resolve) => {
        this._nextTickResolve = resolve;
      });
    }

    this._nextTickPromise.then(callback);
  }

  // ================= 坐标变换 =================

  getViewportRect() {
    const { x, y, scale } = this.viewport;
    const left = -x / scale;
    const top = -y / scale;
    return {
      left,
      top,
      width: this.width / scale,
      height: this.height / scale
    };
  }

  getLogicalPosition(clientX: number, clientY: number) {
    const rect = this._containerRect;
    return new Point(
      (clientX - rect.left - this.viewport.x) / this.viewport.scale,
      (clientY - rect.top - this.viewport.y) / this.viewport.scale
    );
  }

  getViewPointMtrix() {
    const m = this.viewport.matrix;
    m.a = this.viewport.scale;
    m.b = 0;
    m.c = 0;
    m.d = this.viewport.scale;
    m.e = this.viewport.x;
    m.f = this.viewport.y;
    return m;
  }

  applyViewPointTransform(ctx: CanvasRenderingContext2D, ownMatrix?: DOMMatrix) {
    const d = this.dpr;
    const vp = this.getViewPointMtrix();
    if (!ownMatrix) {
      ctx.setTransform(vp.a * d, vp.b * d, vp.c * d, vp.d * d, vp.e * d, vp.f * d);
      return;
    }
    const m = ownMatrix;
    ctx.setTransform(
      (vp.a * m.a + vp.c * m.b) * d,
      (vp.b * m.a + vp.d * m.b) * d,
      (vp.a * m.c + vp.c * m.d) * d,
      (vp.b * m.c + vp.d * m.d) * d,
      (vp.a * m.e + vp.c * m.f + vp.e) * d,
      (vp.b * m.e + vp.d * m.f + vp.f) * d
    );
  }

  // ================= 查询 =================

  getCurrnetEelement() {
    return this.currentElement;
  }

  find<T = Element>(v: string): T | undefined {
    return this.keyElmenet.get(v) as T;
  }

  // ================= 碰撞检测（委托） =================

  checkHit(point?: Point) {
    checkHitImpl(this, point);
  }

  searchHitElements(point: Point, callback: (element: RBushItem) => any) {
    return searchHitElementsImpl(this, point, callback);
  }

  searchArea(area: RectWithCenter, callback: (element: RBushItem) => any) {
    return searchAreaImpl(this, area, callback);
  }

  // ================= 视口（委托） =================

  focusNode(
    node: Element,
    options: {
      padding?: number;
      animate?: { duration?: number; easing?: (amount: number) => number };
    }
  ): Promise<void> {
    return focusNodeImpl(this, node, options);
  }

  // ================= 事件分发 =================

  _notify(
    e: PointerEvent | MouseEvent | WheelEvent,
    eventName: string,
    targetEl = this.currentElement
  ) {
    if (this.isSpacePressed || this.isPanning) return;

    const { x, y } = this.getLogicalPosition(e.clientX, e.clientY);

    const element = targetEl?.element;

    const detail = {
      target: element ?? this,
      x,
      y,
      buttons: e.buttons,
      deltaY: (e as WheelEvent).deltaY ?? 0,
      deltaX: (e as WheelEvent).deltaX ?? 0
    };

    if (!element) {
      this.dispatchEvent(new CustomEvent(eventName, { detail }));
      return;
    }

    if (element && !element.isActiveed) {
      return;
    }

    const select = this.keyElmenet?.get("select");
    if (select && element !== select) {
      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { ctrlKey: (e as any).ctrlKey, ...detail }
        })
      );
      return;
    }

    element.dispatchEvent(eventName, {
      ctrlKey: e.ctrlKey,
      ...detail,
      target: element
    });
  }

  unmounted() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    this._pendingLayers.clear();
    this._rafScheduled = false;

    if (this._cssTransformTimer) {
      clearTimeout(this._cssTransformTimer);
      this._cssTransformTimer = null;
    }

    super.unmounted();
  }
}
