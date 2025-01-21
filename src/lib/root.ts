import { AnimationController, AnimationType } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { generateFont, TextOptions } from "./text";
import {
  isOverlap,
  isOverlapAndNotAdjacent,
  isPartiallyIntersecting,
  mergeOverlappingRects
} from "./utils/calc";
import { debounce } from "lodash-es";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLCanvasElement;
  width: number;
  height: number;
  useDirtyRect?: boolean;
  dirtyDebug?: boolean;
  children?: Element[];
  font?: TextOptions["font"] & {
    color?: string;
  };
}

export class Root extends Element {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  type = "root";
  ac: AnimationController;
  keyMap = new Map<string, Element>();
  quickElements: Set<Element> = new Set();
  dirtys: Set<Element> = new Set();
  font: Required<RootOptions["font"]>;
  currentElement?: Element;
  useDirtyRect: boolean;
  dirtyDebugRoot?: Root;
  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.el.width = options.width;
    this.el.height = options.height;
    this.ctx = this.el.getContext("2d")!;
    this.useDirtyRect = options.useDirtyRect ?? false;
    this.ac = new AnimationController(
      options.animationSwitch ? options.animationTime ?? 300 : 0
    );
    this.font = {
      style: options.font?.style ?? "normal",
      variant: options.font?.variant ?? "normal",
      stretch: options.font?.stretch ?? "normal",
      size: options.font?.size ?? 16,
      lineHeight: options.font?.lineHeight ?? 1.2,
      family: options.font?.family ?? "sans-serif",
      color: options.font?.color ?? "black",
      weight: options.font?.weight ?? "normal"
    };

    if (this.useDirtyRect && options.dirtyDebug) {
      const dirtyCanvas = document.createElement("canvas") as HTMLCanvasElement;
      const rect = this.el.getBoundingClientRect();
      dirtyCanvas.style.cssText = `
        position:absolute;
        top:${rect.top}px;
        left:${rect.left}px;
        pointer-events: none;
      `;
      this.el.parentElement?.append(dirtyCanvas);
      this.dirtyDebugRoot = new Root({
        el: dirtyCanvas,
        width: options.width,
        height: options.height
      });
      this.dirtyDebugRoot.mounted();
    }
  }

  mounted() {
    this.root = this;
    this.render();
    super.mounted();
    this.eventManage.hasUserEvent = true;
    const rect = this.el.getBoundingClientRect();
    const abortController = new AbortController();

    //为了如果鼠标按下那么即便鼠标已经移动出canvas之外
    //也能继续触发的这个元素的事件
    let hasLockPoint = false;

    document.addEventListener(
      "pointermove",
      (e) => {
        const offsetX = e.clientX - rect.x;
        const offsetY = e.clientY - rect.y;
        const prevElement = this.currentElement;
        if (hasLockPoint === false) {
          this.currentElement = undefined;
          for (const element of this.quickElements) {
            if (element.hasPointHint(offsetX, offsetY)) {
              this.currentElement = element;
              break;
            }
          }
        }

        if (!this.currentElement) {
          return;
        }

        if (this.currentElement !== prevElement) {
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

    this.el.addEventListener(
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
      el = this.currentElement
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
      super.unmounted();
      this.keyMap.clear();
      this.quickElements.clear();
    };
  }

  getElementByKey<T = Element>(key: string): T | undefined {
    return this.keyMap.get(key) as any;
  }

  nextFrame() {
    return new Promise((resolve) => {
      this.ac.addEventListener(
        AnimationType.END,
        () => {
          this.ac.timeLine.progress = 0;
          resolve(null);
        },
        {
          once: true
        }
      );
      this.ac.timeLine.progress = 1;
      this.ac.play();
    });
  }

  render() {
    const point = this.getLocalPoint();
    if (this.isDirty) {
      return point;
    }
    this.ctx.clearRect(0, 0, this.width!, this.height!);
    this.isDirty = true;
    this.ctx.font = generateFont(this.font);
    // this.ctx.textBaseline ="ideographic"
    super.layout(Constraint.loose(this.width!, this.height!));
    super.render(point);
    this.isDirty = false;
    return point;
  }

  //就脏节点开始重绘制
  dirtyRender = debounce(() => {
    //TODO 这里getBoundingBox要改为相对视口的也就是要减去滚动条的,不然脏矩形判断不对
    if (this.dirtys.has(this)) {
      this.dirtys.clear();
      super.render();
      return;
    }
    console.time("dirtyRectMerger");
    const dirtys = Array.from(this.dirtys);
    this.dirtys.clear();
    const aabbs = dirtys.map((v) => v.getBoundingBox());
    const mergeDirtyAABB = mergeOverlappingRects(aabbs);
    const needRerender: Set<Element> = new Set();
    function walk(el: Element) {
      if (el.parent) {
        let parent: Element | undefined = el.parent;
        const provide = parent.provideLocalCtx();
        while (parent) {
          let aabb = parent.getBoundingBox();
          if (mergeDirtyAABB.some((v) => isPartiallyIntersecting(aabb, v))) {
            mergeDirtyAABB.push(aabb);
            needRerender.add(parent);
            return;
          }
          parent = parent?.parent;
        }
        if (provide.backgroundColor) {
          needRerender.add(el.parent);
          return;
        }
      }
      if (el.parent?.children) {
        const children = el.parent?.children;
        for (let index = 0; index < children.length; index++) {
          const element = children[index];
          const isDirty = element.isDirty;
          if (isDirty || needRerender.has(element)) {
            continue;
          }
          const isCurrent = element === el;
          const aabb = element.getBoundingBox();
          if (isCurrent && mergeDirtyAABB.some((v) => isOverlap(v, aabb))) {
            needRerender.add(element);
          } else if (
            mergeDirtyAABB.some((v) => isOverlapAndNotAdjacent(v, aabb))
          ) {
            mergeDirtyAABB.push(aabb);
            needRerender.add(element);
          }
        }
      }
    }
    dirtys.forEach(walk);
    console.log(mergeDirtyAABB, needRerender);
    console.timeEnd("dirtyRectMerger");

    if (needRerender.has(this)) {
      needRerender.clear();
      needRerender.add(this);
    }

    // const mergeDirtyAABB1 = mergeOverlappingRects(mergeDirtyAABB);
    // console.log(mergeDirtyAABB1, "--");
    if (this.dirtyDebugRoot) {
      this.dirtyDebugRoot.children = Array.from(needRerender).map((v) => {
        const point = v.getLocalPoint(v.getWordPoint());
        return new Element({
          x: point.x,
          y: point.y,
          width: v.size.width,
          height: v.size.height,
          backgroundColor: "rgba(128, 0, 128, 0.5)"
        });
      });
      this.dirtyDebugRoot.render();
    }

    needRerender.forEach((v) => {
      v.isDirty = true;
      v.render();
    });
    if (this.dirtyDebugRoot) {
      setTimeout(() => {
        this.dirtyDebugRoot!.children = [];
        this.dirtyDebugRoot!.render();
      }, 300);
    }
  });
}

export function root(options: RootOptions) {
  return new Root(options);
}
