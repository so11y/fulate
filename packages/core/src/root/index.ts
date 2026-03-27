import { Node } from "../node/node";
import { Layer } from "../layer";
import { Element, RBushItem } from "../node/element";
import { CustomEvent } from "../event";
import { Point } from "@fulate/util";
import { RectWithCenter } from "@fulate/util";
import { initRootEvents } from "./events";
import { Viewport } from "./viewport";
import {
  checkHit as checkHitImpl,
  searchHitElements as searchHitElementsImpl,
  searchArea as searchAreaImpl
} from "./hit-test";

export class Root extends Node {
  type = "root";

  container: HTMLElement;
  textDefaults: Record<string, any> = {};

  viewport: Viewport;
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

  private _containerRect!: DOMRect;

  layers: Layer[] = [];

  _pendingLayers = new Set<Layer>();

  private _rafScheduled = false;
  private _rafId = 0;
  private _nextTickPromise: Promise<void> | null = null;
  private _nextTickResolve: (() => void) | null = null;

  constructor(
    el: HTMLElement,
    options?: {
      width?: number;
      height?: number;
      scale?: { min?: number; max?: number };
      textStyle?: Record<string, any>;
    }
  ) {
    super();
    this.container = el;
    this.width = options?.width ?? el.clientWidth;
    this.height = options?.height ?? el.clientHeight;

    this.viewport = new Viewport(this, {
      minScale: options?.scale?.min ?? 0.1,
      maxScale: options?.scale?.max ?? 10,
    });

    this.container.style.position = "relative";
    this.container.style.userSelect = "none";
    this.container.style.touchAction = "none";
    this.container.style.overflow = "hidden";

    this.provide("root", this);
    this.textDefaults = {
      color: "#000000",
      fontSize: 14,
      ...options?.textStyle,
    };
  }

  mount() {
    super.mount();
    this._updateContainerRect();

    const onRectChange = () => {
      this._updateContainerRect();
      this.viewport.dpr = window.devicePixelRatio || 1;
    };
    window.addEventListener("resize", onRectChange);
    window.addEventListener("scroll", onRectChange, true);
    this.addEventListener("unmounted", () => {
      window.removeEventListener("resize", onRectChange);
      window.removeEventListener("scroll", onRectChange, true);
    });

    initRootEvents(this);
    this.viewport.syncPaintedViewport();
    this.requestRender();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;

    const dpr = this.viewport.dpr;
    for (const layer of this.layers) {
      layer.width = width;
      layer.height = height;
      layer.canvasEl.width = width * dpr;
      layer.canvasEl.height = height * dpr;
      layer.canvasEl.style.width = width + "px";
      layer.canvasEl.style.height = height + "px";
    }

    this._updateContainerRect();
    this.viewport.syncPaintedViewport();
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
      // layer.clearDirtyState();
      layer._forceFullRepaint = true;
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

      if (this.viewport._tweenGroup.getAll().length > 0) {
        this.viewport._tweenGroup.update(time);
      }

      for (const l of this.layers) {
        if (l.tweenGroup.getAll().length > 0) {
          l.tweenGroup.update(time);
        }
      }

      for (const l of this._pendingLayers) {
        l._frameId++;
        l.flushUpdate();
      }
      for (const l of this.layers) {
        l.flushPostUpdate();
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
        this.viewport._tweenGroup.getAll().length > 0 ||
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

  // ================= 事件分发 =================

  _notify(
    e: PointerEvent | MouseEvent | WheelEvent,
    eventName: string,
    targetEl = this.currentElement
  ) {
    if (this.isSpacePressed || this.isPanning) return;

    const { x, y } = this.viewport.getLogicalPosition(e.clientX, e.clientY);

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
          detail: { ctrlKey: (e as any).ctrlKey, shiftKey: (e as any).shiftKey, ...detail }
        })
      );
      return;
    }

    element.dispatchEvent(eventName, {
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      ...detail,
      target: element
    });
  }

  // ================= 序列化 =================

  toJSON() {
    return {
      viewport: this.viewport.toJSON(),
      textDefaults: { ...this.textDefaults },
      width: this.width,
      height: this.height,
    };
  }

  unmounted() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    this._pendingLayers.clear();
    this._rafScheduled = false;

    this.viewport.dispose();

    super.unmounted();
  }
}
