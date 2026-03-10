import { Node } from "./node/node";
import { Layer, RBushItem } from "./layer";
import { Element } from "./node/element";
import { CustomEvent } from "../util/event";
import { Rule } from "./tools/rule";
import { Point } from "../util/point";
import { RectWithCenter } from "../util/rect";
import { HistoryManager } from "./history";
import { Tween, Easing, Group } from "@tweenjs/tween.js";

export class Root extends Node {
  type = "root";

  container: HTMLElement;

  viewport = { x: 0, y: 0, scale: 1, matrix: new DOMMatrix() };
  currentElement?: RBushItem;
  keyElmenet = new Map<string, Element>();
  idElements = new Map<string, Element>();

  _provides = Object.create(null);
  history: HistoryManager;

  private isSpacePressed = false;
  private isPanning = false;
  private hasLockPoint = false;
  lastPointerPos = { x: 0, y: 0 };

  width: number;
  height: number;
  dpr = window.devicePixelRatio || 1;

  private _containerRect!: DOMRect;

  layers: Layer[] = [];

  _pendingLayers = new Set<Layer>();

  private _rafScheduled = false;
  private _nextTickPromise: Promise<void> | null = null;
  private _nextTickResolve: (() => void) | null = null;

  private _viewportTweenGroup = new Group();

  constructor(el: HTMLElement, options?: { width?: number; height?: number }) {
    super();
    this.container = el;
    this.width = options?.width ?? el.clientWidth;
    this.height = options?.height ?? el.clientHeight;
    this.container.style.position = "relative";
    this.container.style.userSelect = "none";
    this.container.style.touchAction = "none";
    this.history = new HistoryManager(this);
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

    this.initEvents();
    this.requestRender();
  }

  private _updateContainerRect() {
    this._containerRect = this.container.getBoundingClientRect();
  }

  get containerRect(): DOMRect {
    return this._containerRect;
  }

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

    requestAnimationFrame((time) => {
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

  getCurrnetEelement() {
    return this.currentElement;
  }

  find<T = Element>(v: string): T | undefined {
    return this.keyElmenet.get(v) as T;
  }

  /**
   * 碰撞检测，不传 point 时默认使用 lastPointerPos 换算。
   * 内部同时处理 cursor 切换和 mouseenter / mouseleave 派发。
   */
  checkHit(point?: Point) {
    if (this.isSpacePressed || this.isPanning) return;

    if (this.hasLockPoint) return;

    if (!point) {
      point = this.getLogicalPosition(
        this.lastPointerPos.x,
        this.lastPointerPos.y
      );
    }

    const prevElement = this.currentElement;
    this.currentElement = undefined;

    this.searchHitElements(point, (element) => {
      this.currentElement = element;
      return true;
    });

    if (
      this.currentElement &&
      (this.currentElement.element?.isSubscribed ||
        this.currentElement.element?.cursor)
    ) {
      this.container.style.cursor =
        this.currentElement.element.cursor || "pointer";
    } else {
      this.container.style.cursor = "default";
    }

    if (this.currentElement?.element !== prevElement?.element) {
      const detail = {
        target: undefined as any,
        x: point.x,
        y: point.y,
        buttons: 0,
        deltaY: 0,
        deltaX: 0
      };

      if (prevElement?.element && prevElement.element.isActiveed) {
        detail.target = prevElement.element;
        prevElement.element.dispatchEvent("mouseleave", detail);
      }
      if (
        this.currentElement?.element &&
        this.currentElement.element.isActiveed
      ) {
        detail.target = this.currentElement.element;
        this.currentElement.element.dispatchEvent("mouseenter", detail);
      }
    }
  }

  searchHitElements(point: Point, callback: (element: RBushItem) => any) {
    const area = {
      left: point.x,
      top: point.y,
      width: 0,
      height: 0
    };
    return this.searchArea(area, (item) => {
      const element = item.element;
      if (element.hasPointHint?.(point)) {
        return callback(item);
      }
    });
  }

  searchArea(area: RectWithCenter, callback: (element: RBushItem) => any) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const hitElements = layer.searchAreaElements(area);
      if (hitElements.length > 0) {
        hitElements.sort((a, b) => b.element.uIndex - a.element.uIndex);
        for (const item of hitElements) {
          const element = item.element;
          if (element.selectctbale !== false && element.visible) {
            const result = callback(item);
            if (result) {
              return result;
            }
          }
        }
      }
    }
  }

  initEvents() {
    const abortController = new AbortController();
    const { signal } = abortController;

    // --- 1. 键盘监听：空格键控制状态 ---
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        this.isSpacePressed = true;
        this.container.style.cursor = "grab";
        if (this.currentElement) {
          this.currentElement = undefined;
          this.requestRender();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        this.isSpacePressed = false;
        this.isPanning = false;
        this.container.style.cursor = "default";
      }
    };

    document.addEventListener("keydown", onKeyDown, { signal });
    document.addEventListener("keyup", onKeyUp, { signal });

    // --- 2. 指针移动：区分 平移 vs 交互 ---
    document.addEventListener(
      "pointermove",
      (e) => {
        if (this.isPanning) {
          const dx = e.clientX - this.lastPointerPos.x;
          const dy = e.clientY - this.lastPointerPos.y;
          this.viewport.x += dx;
          this.viewport.y += dy;
          this.lastPointerPos.x = e.clientX;
          this.lastPointerPos.y = e.clientY;

          this.dispatchEvent(new CustomEvent("translation"));
          this.requestRender();
        } else {
          this.lastPointerPos.x = e.clientX;
          this.lastPointerPos.y = e.clientY;
          this.checkHit();
          this.notify(e, "pointermove");
        }
      },
      { signal }
    );

    // --- 3. 指针按下 ---
    this.container.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return; // 仅左键

        this.lastPointerPos.x = e.clientX;
        this.lastPointerPos.y = e.clientY;

        if (this.isSpacePressed) {
          this.isPanning = true;
          this.container.setPointerCapture(e.pointerId);
        } else {
          this.checkHit();
          this.hasLockPoint = true;
          this.notify(e, "pointerdown");
        }
      },
      { signal }
    );

    // --- 4. 指针抬起 ---
    document.addEventListener(
      "pointerup",
      (e) => {
        if (this.isPanning) {
          this.isPanning = false;
          this.container.releasePointerCapture(e.pointerId);
        } else {
          this.notify(e, "pointerup");
          this.hasLockPoint = false;
        }
      },
      { signal }
    );

    // --- 5. 滚轮：缩放逻辑 ---
    this.container.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();

        // 如果按住了空格，执行缩放；也可以不判断空格，直接支持缩放
        const rect = this._containerRect;
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const prevScale = this.viewport.scale;
        const newScale = Math.max(0.1, Math.min(10, prevScale * factor));

        // 以鼠标当前位置为中心进行缩放
        this.viewport.x = cx - ((cx - this.viewport.x) * newScale) / prevScale;
        this.viewport.y = cy - ((cy - this.viewport.y) * newScale) / prevScale;
        this.viewport.scale = newScale;

        this.dispatchEvent(new CustomEvent("wheel"));

        this.requestRender();

        this.lastPointerPos.x = e.clientX;
        this.lastPointerPos.y = e.clientY;
        this.checkHit();
      },
      { signal, passive: false }
    );

    // 其他事件包装
    document.addEventListener("click", (e) => this.notify(e, "click"), {
      signal
    });
    // document.addEventListener(
    //   "contextmenu",
    //   (e) => {
    //     e.preventDefault();
    //     this.notify(e, "contextmenu");
    //   },
    //   { signal }
    // );

    this.addEventListener("unmounted", () => abortController.abort());
  }

  /**
   * 统一的事件分发器
   */
  private notify(
    e: PointerEvent | MouseEvent | WheelEvent,
    eventName: string,
    targetEl = this.currentElement
  ) {
    // 如果正在平移视口，拦截所有 UI 元素事件
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

    element.dispatchEvent(eventName, {
      ctrlKey: e.ctrlKey,
      ...detail,
      target: element
    });
  }

  focusNode(
    node: Element,
    {
      padding = 10,
      animate
    }: {
      padding?: number;
      animate?: { duration?: number; easing?: (amount: number) => number };
    }
  ): Promise<void> {
    const root = this.root;
    const RULER_SIZE = root.find<Rule>("rule")?.rulerSize ?? 0;
    const aabb = node.getBoundingRect();

    const activeWidth = root.width - RULER_SIZE;
    const activeHeight = root.height - RULER_SIZE;

    const scaleX = (activeWidth - padding * 2) / aabb.width;
    const scaleY = (activeHeight - padding * 2) / aabb.height;
    const bestScale = Math.min(scaleX, scaleY, 1);

    const visualCenterX = RULER_SIZE + activeWidth / 2;
    const visualCenterY = RULER_SIZE + activeHeight / 2;

    const targetX = visualCenterX - aabb.centerX * bestScale;
    const targetY = visualCenterY - aabb.centerY * bestScale;

    if (!animate) {
      root.viewport.scale = bestScale;
      root.viewport.x = targetX;
      root.viewport.y = targetY;
      root.requestRender();
      return Promise.resolve();
    }

    this._viewportTweenGroup.removeAll();

    const duration = animate.duration ?? 600;
    const easing = animate.easing ?? Easing.Quadratic.InOut;

    return new Promise<void>((resolve) => {
      new Tween(root.viewport, this._viewportTweenGroup)
        .to({ x: targetX, y: targetY, scale: bestScale }, duration)
        .easing(easing)
        .onUpdate(() => root.requestRender())
        .onComplete(() => {
          resolve();
          this._viewportTweenGroup.removeAll();
        })
        .start();

      root.requestRender();
    });
  }
}
