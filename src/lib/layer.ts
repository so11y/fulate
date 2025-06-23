import { Element as CanvasElement } from "./base";

import { debounce } from "lodash-es";
import { Root } from "./root";

export class Layer extends EventTarget {
  declare el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDirty = true;
  constructor(public key: number, public manager: LayerManager) {
    super();
    this.el = document.createElement("canvas");
    this.ctx = this.el.getContext("2d")!;
    this.el.width = this.manager.width;
    this.el.height = this.manager.height;
    this.el.style.cssText = `position:absolute;inset:0;pointer-events:none;`;
    this.manager.getEl().appendChild(this.el);
  }

  getContext() {
    return this.ctx;
  }

  setDirty = () => {
    if (this.isDirty) return;
    this.isDirty = true;
    this.dispatchEvent(new CustomEvent("dirty"));
  };

  clear() {
    if (this.isDirty) {
      this.ctx.clearRect(0, 0, this.manager.width, this.manager.height);
    }
  }

  destroy() {
    this.manager.getEl().removeChild(this.el);
  }

  applyMatrix(matrix: DOMMatrix) {
    this.ctx.setTransform(
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f
    );
  }
}

export class LayerManager {
  private layers: Array<Layer> = [];
  width = 0;
  height = 0;
  constructor(public target: Element, public root: Root) {}

  mounted() {
    const rootEl = document.createElement("div");
    rootEl.style.cssText = `position:relative;width:100%;height:100%;`;
    this.target.innerHTML = "";
    this.target.appendChild(rootEl);
    this.getRect();
    this.proxyEvent();
  }

  proxyEvent() {
    const el = this.getEl();
    const rect = el.getBoundingClientRect();
    const abortController = new AbortController();

    //为了如果鼠标按下那么即便鼠标已经移动出canvas之外
    //也能继续触发的这个元素的事件
    let hasLockPoint = false;

    document.addEventListener(
      "pointermove",
      (e) => {
        const offsetX = e.clientX - rect.x;
        const offsetY = e.clientY - rect.y;
        const prevElement = this.root.currentElement;
        if (hasLockPoint === false) {
          this.root.currentElement = undefined;
          for (const element of this.root.quickElements) {
            if (element.hasInView() && element.hasPointHint(offsetX, offsetY)) {
              this.root.currentElement = element;
              break;
            }
          }
        }

        if (!this.root.currentElement) {
          el.style.cursor = "default";
          return;
        }
        if (this.root.currentElement.cursor) {
          el.style.cursor = this.root.currentElement.cursor;
        }

        if (this.root.currentElement !== prevElement) {
          notify(e, "mouseleave", prevElement);
          notify(e, "mouseenter");
        }

        notify(e, "pointermove");
      },
      {
        signal: abortController.signal
      }
    );

    document.addEventListener("click", (e) => notify(e, "click"), {
      signal: abortController.signal
    });
    document.addEventListener("pointerdown", (e) => notify(e, "pointerdown"), {
      signal: abortController.signal
    });
    document.addEventListener("pointerup", (e) => notify(e, "pointerup"), {
      signal: abortController.signal
    });

    document.addEventListener("contextmenu", (e) => notify(e, "contextmenu"), {
      signal: abortController.signal
    });

    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        notify(e, "wheel");
      },
      {
        signal: abortController.signal,
        passive: false
      }
    );

    const notify = (
      e: PointerEvent | MouseEvent | WheelEvent,
      eventName: string,
      el = this.root.currentElement
    ) => {
      if (!el) {
        hasLockPoint = false;
        return;
      }
      if (eventName === "contextmenu") {
        e.preventDefault();
      }
      if (eventName === "pointerdown") {
        hasLockPoint = true;
      } else if (eventName === "pointerup") {
        hasLockPoint = false;
      }
      const offsetX = e.clientX - rect.x;
      const offsetY = e.clientY - rect.y;
      el.eventManage.notify(eventName, {
        target: el,
        x: offsetX,
        y: offsetY,
        buttons: e.buttons,
        deltaY: (e as WheelEvent).deltaY ?? 0,
        deltaX: (e as WheelEvent).deltaX ?? 0
      });
    };

    this.unmounted = () => {
      abortController.abort();
      this.layers.forEach((layer) => {
        if (layer) {
          layer.destroy();
        }
      });
    };
  }

  unmounted() {}

  getEl() {
    return this.target.firstElementChild! as HTMLElement;
  }

  getRootEl() {
    return this.target;
  }

  getRect() {
    const rect = this.getEl().getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
  }

  getLayer(layerIndex: number = 1) {
    if (this.layers[layerIndex]) {
      return this.layers[layerIndex];
    }
    const layer = new Layer(layerIndex, this);
    this.layers[layerIndex] = layer;
    this.layers.forEach((layer, index) => {
      if (layer) {
        layer.el.style.zIndex = Math.max(1, index).toString();
      }
    });
    return layer;
  }

  renderStart() {
    this.layers.forEach((layer) => {
      if (layer) {
        layer.clear();
      }
    });
  }

  renderEnd() {
    this.layers.forEach((layer) => {
      if (layer) {
        layer.isDirty = false;
      }
    });
  }
}
