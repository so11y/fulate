import { Layer } from "./layer";
import { BaseElementOption, type Element } from "./node/element";

export class Root extends Layer {
  type = "root";

  container: HTMLElement;
  // 视口状态：x,y 是偏移量，scale 是缩放
  viewport = { x: 0, y: 0, scale: 1, matrix: new DOMMatrix() };
  currentElement?: Element;
  keyElmenet = new Map();
  quickElements: Array<Element> = [];

  _provides = Object.create(null);

  // 内部交互状态
  private isSpacePressed = false;
  private isPanning = false;
  private hasLockPoint = false;
  private lastPointerPos = { x: 0, y: 0 };

  constructor(el: HTMLElement, options?: BaseElementOption) {
    super(options);
    this.container = el;
    this.container.style.position = "relative";
    this.container.style.userSelect = "none"; // 禁止文字选中干扰
    this.container.style.touchAction = "none"; // 禁用浏览器默认手势
    this.cursor = "default";
  }

  mounted() {
    this.root = this;
    super.mounted();
    this.mounteded();
    this.requestRender();
  }

  mounteded() {
    this.calcEventSort();
    this.initEvents();
  }

  /**
   * 核心公式：将屏幕坐标转换为画布逻辑坐标（世界坐标）
   */
  private getLogicalPosition(clientX: number, clientY: number) {
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

  /**
   * 碰撞检测
   */
  private checkHit(e: PointerEvent | MouseEvent) {
    if (this.isSpacePressed || this.isPanning) return;
    if (this.hasLockPoint && this.currentElement) return;

    const { x, y } = this.getLogicalPosition(e.clientX, e.clientY);

    this.currentElement = undefined;
    for (const element of this.quickElements) {
      if (element.visible && element.hasPointHint(x, y)) {
        this.currentElement = element;
        break;
      }
    }
  }

  hasPointHint() {
    return true;
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
              this.currentElement?.cursor || "default";
          }

          // 处理 MouseEnter / MouseLeave
          if (this.currentElement !== prevElement) {
            if (prevElement) this.notify(e, "mouseleave", prevElement);
            if (this.currentElement)
              this.notify(e, "mouseenter", this.currentElement);
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

    if (!targetEl) return;

    const { x, y } = this.getLogicalPosition(e.clientX, e.clientY);

    targetEl.eventManage.notify(eventName, {
      ctrlKey: e.ctrlKey,
      originalClientX: e.clientX,
      originalClientY: e.clientY,
      target: targetEl,
      x: x,
      y: y,
      buttons: e.buttons,
      deltaY: (e as WheelEvent).deltaY ?? 0,
      deltaX: (e as WheelEvent).deltaX ?? 0
    });
  }

  calcEventSort() {
    const stack: Element[] = [this];
    const resultStack: Element[] = [];
    while (stack.length > 0) {
      const currentNode = stack.pop()!;
      if (currentNode.eventManage.hasUserEvent) {
        resultStack.unshift(currentNode);
      }
      if (currentNode.children) {
        for (let i = currentNode.children.length - 1; i >= 0; i--) {
          stack.push(currentNode.children[i]);
        }
      }
    }
    this.quickElements = resultStack;
  }
}
