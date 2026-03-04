import { Node } from "./node/node";
import { Layer, RBushItem } from "./layer";
import { Element } from "./node/element";

export class Root extends Node {
  type = "root";

  container: HTMLElement;

  viewport = { x: 0, y: 0, scale: 1, matrix: new DOMMatrix() };
  currentElement?: RBushItem;
  keyElmenet = new Map();

  _provides = Object.create(null);

  private isSpacePressed = false;
  private isPanning = false;
  private hasLockPoint = false;
  private lastPointerPos = { x: 0, y: 0 };

  width: number;
  height: number;

  layers: Layer[] = [];

  constructor(el: HTMLElement, options?: { width?: number; height?: number }) {
    super();
    this.container = el;
    this.width = options?.width ?? el.clientWidth;
    this.height = options?.height ?? el.clientHeight;
    this.container.style.position = "relative";
    this.container.style.userSelect = "none";
    this.container.style.touchAction = "none";
  }

  mounted() {
    this.root = this as any;
    super.mounted();
    this.mounteded();
    this.requestRender();
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

  mounteded() {
    this.initEvents();
  }

  requestRender() {
    this.layers.forEach((layer) => layer.requestRender());
  }

  getLogicalPosition(clientX: number, clientY: number) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.viewport.x) / this.viewport.scale,
      y: (clientY - rect.top - this.viewport.y) / this.viewport.scale
    };
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

  getCurrnetEelement() {
    return this.currentElement;
  }

  find<T = Element>(v: T): T | undefined {
    return this.keyElmenet.get(v);
  }

  /**
   * 碰撞检测
   */
  checkHit(e: PointerEvent | MouseEvent) {
    if (this.isSpacePressed || this.isPanning) return;

    if (this.hasLockPoint) return;

    const { x, y } = this.getLogicalPosition(e.clientX, e.clientY);

    this.currentElement = undefined;

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];

      const hitElements = layer.searchHitElements(x, y);
      if (hitElements.length > 0) {
        hitElements.sort((a, b) => b.element.id - a.element.id);

        for (const item of hitElements) {
          const element = item.element;
          if (
            !element.silent &&
            element.visible &&
            element.hasPointHint?.(x, y)
          ) {
            this.currentElement = item;
            return;
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
          // 执行视口平移
          const dx = e.clientX - this.lastPointerPos.x;
          const dy = e.clientY - this.lastPointerPos.y;
          this.viewport.x += dx;
          this.viewport.y += dy;
          this.lastPointerPos = { x: e.clientX, y: e.clientY };

          this.dispatchEvent(new CustomEvent("panzoom"));
          this.requestRender();
        } else {
          // 执行正常的元素交互检测
          const prevElement = this.currentElement;
          this.checkHit(e);

          // 处理 cursor 切换
          if (this.isSpacePressed) {
            this.container.style.cursor = this.isPanning ? "grabbing" : "grab";
          } else {
            this.container.style.cursor =
              this.currentElement?.element.cursor || "default";
          }

          // 处理 MouseEnter / MouseLeave
          if (this.currentElement?.element !== prevElement?.element) {
            if (prevElement) this.notify(e, "mouseleave", prevElement);
            if (this.currentElement) this.notify(e, "mouseenter");
          }
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

        if (this.isSpacePressed) {
          // 进入平移模式
          this.isPanning = true;
          this.lastPointerPos = { x: e.clientX, y: e.clientY };
          this.container.setPointerCapture(e.pointerId);
        } else {
          // 正常交互
          this.checkHit(e);
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
        const rect = this.container.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        const prevScale = this.viewport.scale;
        const newScale = Math.max(0.1, Math.min(10, prevScale * factor));

        // 以鼠标当前位置为中心进行缩放
        this.viewport.x = cx - ((cx - this.viewport.x) * newScale) / prevScale;
        this.viewport.y = cy - ((cy - this.viewport.y) * newScale) / prevScale;
        this.viewport.scale = newScale;

        this.dispatchEvent(new CustomEvent("panzoom"));
        this.requestRender();

        // 缩放后重新计算 hit
        this.checkHit(e);
      },
      { signal, passive: false }
    );

    // 其他事件包装
    document.addEventListener("click", (e) => this.notify(e, "click"), {
      signal
    });
    document.addEventListener(
      "contextmenu",
      (e) => {
        e.preventDefault();
        this.notify(e, "contextmenu");
      },
      { signal }
    );

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
      target: element ?? null,
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

    element.eventManage.notify(eventName, {
      ctrlKey: e.ctrlKey,
      originalClientX: e.clientX,
      originalClientY: e.clientY,
      ...detail,
      target: element
    });
  }

  focusNode(node: Element, padding = 10) {
    const root = this.root;
    const RULER_SIZE = root.keyElmenet.get("rule")?.rulerSize ?? 0;
    const aabb = node.getBoundingRect();

    const activeWidth = root.width - RULER_SIZE;
    const activeHeight = root.height - RULER_SIZE;

    const scaleX = (activeWidth - padding * 2) / aabb.width;
    const scaleY = (activeHeight - padding * 2) / aabb.height;
    const bestScale = Math.min(scaleX, scaleY, 1);

    const visualCenterX = RULER_SIZE + activeWidth / 2;
    const visualCenterY = RULER_SIZE + activeHeight / 2;

    root.viewport.scale = bestScale;
    root.viewport.x = visualCenterX - aabb.centerX * bestScale;
    root.viewport.y = visualCenterY - aabb.centerY * bestScale;

    root.requestRender();
  }
}
