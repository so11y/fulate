import { Point } from "../lib/base";
import { Element } from "../lib/base";
import { UserCanvasEvent } from "../lib/utils/eventManage";

interface DragOptions {
  onDragStart?: (point: Point) => void;
  onDragMove?: (point: Point) => void;
  onDragEnd?: (point: Point) => void;
  child?: Element;
}

export class Drag extends Element implements DragOptions {
  type = "drag";
  onDragStart?: (point: Point) => void;
  onDragMove?: (point: Point) => void;
  onDragEnd?: (point: Point) => void;
  constructor(options: DragOptions) {
    super(options);
    this.onDragStart = options.onDragStart;
    this.onDragMove = options.onDragMove;
    this.onDragEnd = options.onDragEnd;
  }

  mounted() {
    super.mounted();
    this.addEventListener("mouseenter", () => {
      this.root.el.style.cursor = "pointer";
    });
    this.addEventListener("mouseleave", () => {
      this.root.el.style.cursor = "default";
    });

    this.addEventListener("pointerdown", pointerdown);
    function pointerdown(e: UserCanvasEvent) {
      e.stopPropagation();
      const selfPoint = {
        x: this.x,
        y: this.y
      };
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };

      const pointermove = (e: UserCanvasEvent) => {
        const { x, y } = e.detail;
        this.setOption({
          x: x - startDownPoint.x + selfPoint.x,
          y: y - startDownPoint.y + selfPoint.y
        });
        this.root.render();
      };
      this.addEventListener("pointermove", pointermove);
      this.addEventListener(
        "pointerup",
        () => this.removeEventListener("pointermove", pointermove),
        {
          once: true
        }
      );
    }
  }
}

export function drag(options: DragOptions) {
  return new Drag(options);
}
