import { AnimationController, AnimationType } from "ac";
import { Element } from "./base";
import { Constraint } from "./utils/constraint";
import { generateFont, TextOptions } from "./text";

interface RootOptions {
  animationSwitch?: boolean;
  animationTime?: number;
  el: HTMLCanvasElement;
  width: number;
  height: number;
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
  font: Required<RootOptions["font"]>;
  currentElement?: Element;
  constructor(options: RootOptions) {
    super(options);
    this.root = this;
    this.el = options.el;
    this.el.width = options.width;
    this.el.height = options.height;
    this.ctx = this.el.getContext("2d")!;
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
  }

  mounted() {
    this.render();
    super.mounted();
    this.eventMeager.hasUserEvent = true;
    const rect = this.el.getBoundingClientRect();
    const abortController = new AbortController();

    //为了如果鼠标按下那么即便鼠标已经移动出canvas之外
    //也能继续触发的这个元素的事件
    let hasLockPoint = false

    document.addEventListener("pointermove", (e) => {
      const offsetX = e.clientX - rect.x;
      const offsetY = e.clientY - rect.y;
      if (hasLockPoint === false) {
        this.currentElement = undefined
        for (const element of this.quickElements) {
          if (element.hasPointHint(offsetX, offsetY)) {
            this.currentElement = element
            break
          }
        }
      }

      if (!this.currentElement) {
        return
      }

      notify(e, "pointermove")
    }, {
      signal: abortController.signal
    })
    document.addEventListener("click", (e) => notify(e, "click"), {
      signal: abortController.signal
    })
    document.addEventListener("pointerdown", (e) => notify(e, "pointerdown"), {
      signal: abortController.signal
    })
    document.addEventListener("pointerup", (e) => notify(e, "pointerup"), {
      signal: abortController.signal
    })
    document.addEventListener("contextmenu", (e) => notify(e, "contextmenu"), {
      signal: abortController.signal
    })


    const notify = (e: PointerEvent | MouseEvent, eventName: string) => {
      if (!this.currentElement) {
        hasLockPoint = false
        return
      }
      if (eventName === "contextmenu") {
        e.preventDefault()
      }
      if (eventName === "pointerdown") {
        hasLockPoint = true
      } else if (eventName === "pointerup") {
        hasLockPoint = false
      }
      const offsetX = e.clientX - rect.x;
      const offsetY = e.clientY - rect.y;
      this.currentElement.eventMeager.notify(eventName, {
        target: this.currentElement,
        x: offsetX,
        y: offsetY,
        buttons: e.buttons
      })
    }

    this.unmounted = () => {
      abortController.abort()
      super.unmounted()
      this.keyMap.clear()
      this.quickElements.clear()
    }
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
}
