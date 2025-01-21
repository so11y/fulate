import { Element, ElementOptions, Point } from "../base";
import { UserCanvasEvent } from "../utils/eventManage";
import { Scroll } from "./scroll";

interface ScrollOptions extends ElementOptions {
  direction: "vertical" | "horizontal";
  onScroll?: (move: Point) => void;
}

export class ScrollBar extends Element {
  constructor(options: ScrollOptions) {
    super(options);

    const abortController = new AbortController();
    const pointerScroll = (e: UserCanvasEvent) => {
      e.stopPropagation();
      const point = this.getWordPoint();
      const selfPoint = this.getLocalPoint(point);
      const startDownPoint = {
        x: e.detail.x - selfPoint.x,
        y: e.detail.y - selfPoint.y
      };
      const parent = this.parent! as Scroll;
      const parentSize = this.parent!.size;
      const maxScrollHeight = parentSize.height - this.size.height;
      const maxScrollWidth = parentSize.width - this.size.width;

      this.addEventListener("pointermove", pointermove);
      this.addEventListener(
        "pointerup",
        () => this.removeEventListener("pointermove", pointermove),
        {
          once: true
        }
      );
      function pointermove(e: UserCanvasEvent) {
        const { x, y } = e.detail;
        const moveX = Math.max(
          Math.min(startDownPoint.x - x, 0),
          -maxScrollWidth
        );
        const moveY = Math.max(
          Math.min(startDownPoint.y - y, 0),
          -maxScrollHeight
        );

        const contentScrollOffsetY =
          (moveY / maxScrollHeight) * (parentSize.height - parent.scrollHeight);
        const contentScrollOffsetX =
          (moveY / maxScrollWidth) * (parentSize.height - parent.scrollWidth);

        this.setOption({
          x: options.direction === "vertical" ? selfPoint.x : moveX,
          y: options.direction === "vertical" ? -moveY : selfPoint.y
        });

        options.onScroll?.({
          x: options.direction === "vertical" ? 0 : -contentScrollOffsetX,
          y: options.direction === "vertical" ? -contentScrollOffsetY : 0
        });
      }
    };
    const wheelScroll = (e: UserCanvasEvent) => {
      e.stopPropagation();
      const point = this.getWordPoint();
      const selfPoint = this.getLocalPoint(point);
      const parentSize = this.parent!.size;
      let deltaX = e.detail.deltaX ?? 0;
      let deltaY = e.detail.deltaY ?? 0;
      const parent = this.parent! as Scroll;
      const maxScrollWidth = parentSize.width - this.size.width;
      const maxScrollHeight = parentSize.height - this.size.height;

      const currentX = selfPoint.x;
      const currentY = selfPoint.y;

      const moveX = Math.max(Math.min(currentX + deltaX, maxScrollWidth), 0);
      const moveY = Math.max(Math.min(currentY + deltaY, maxScrollHeight), 0);

      const contentScrollOffsetY =
        (moveY / maxScrollHeight) * (parentSize.height - parent.scrollHeight);
      const contentScrollOffsetX =
        (moveY / maxScrollWidth) * (parentSize.height - parent.scrollWidth);

      this.setOption({
        x: options.direction === "vertical" ? selfPoint.x : moveX,
        y: options.direction === "vertical" ? moveY : selfPoint.y
      });
      options.onScroll?.({
        x: options.direction === "vertical" ? 0 : contentScrollOffsetX,
        y: options.direction === "vertical" ? contentScrollOffsetY : 0
      });
    };
    this.mounted = () => {
      super.mounted();
      this.addEventListener("pointerdown", pointerScroll, {
        signal: abortController.signal
      });
      this.parent!.addEventListener("wheel", wheelScroll, {
        signal: abortController.signal
      });
    };
    this.unmounted = () => {
      super.unmounted();
      this.removeEventListener("pointerdown", pointerScroll);
      this.parent!.removeEventListener("wheel", wheelScroll);
      abortController.abort();
    };
  }
}
