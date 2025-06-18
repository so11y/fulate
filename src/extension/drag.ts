import { Point } from "../lib/base";
import { Element } from "../lib/base";
import { UserCanvasEvent } from "../lib/utils/eventManage";

interface DragOptions {
  onDragStart?: (point: Point) => void;
  onDragMove?: (point: Point) => void;
  onDragEnd?: (point: Point) => void;
  child?: Element;
  proxyEl?: Element;
}

export class Drag extends Element implements DragOptions {
  type = "drag";
  onDragStart?: (point: Point) => void;
  onDragMove?: (point: Point) => void;
  onDragEnd?: (point: Point) => void;
  proxyEl?: Element;
  constructor(options: DragOptions) {
    super(options);
    // this.cursor = "pointer";
    this.proxyEl = options.proxyEl;
    this.onDragStart = options.onDragStart;
    this.onDragMove = options.onDragMove;
    this.onDragEnd = options.onDragEnd;
  }

  mounted() {
    super.mounted();
    const el = this.proxyEl || this.children![0];
    const pointerdown = (e: UserCanvasEvent) => {
      e.stopPropagation();
      const selfPoint = {
        x: el.x,
        y: el.y
      };
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
      this.onDragStart?.(startDownPoint);
      const pointermove = (e: UserCanvasEvent) => {
        const { x, y } = e.detail;
        const moveX = x - startDownPoint.x;
        const moveY = y - startDownPoint.y;
        el.setOption({
          x: moveX + selfPoint.x,
          y: moveY + selfPoint.y
        });
        this.onDragMove?.({ x: moveX, y: moveY });
        this.root.render();
      };
      el.addEventListener("pointermove", pointermove);
      el.addEventListener(
        "pointerup",
        () => el.removeEventListener("pointermove", pointermove),
        {
          once: true
        }
      );
    };
    el.addEventListener("pointerdown", pointerdown);
  }
}

export function drag(options: DragOptions) {
  return new Drag(options);
}
