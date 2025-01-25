import { Drag } from ".";
import { Element, Point } from "../lib/base";
import { Rect } from "../lib/types";
import {
  calculateElementBounds,
  isOverlap,
  mergeTwoRects
} from "../lib/utils/calc";
import { UserCanvasEvent } from "../lib/utils/eventManage";
import { first } from "lodash-es";

export class Select extends Element {
  type = "select";
  selectElements: Element[] = [];
  selectBody: Element;

  constructor() {
    super();
    this.selectBody = new Element({
      backgroundColor: "rgba(0, 0, 0, 0.1)"
    });
    this.selectBody.isInternal = true;

    let selectElementsStartPoint: Array<Point & { element: Element }> = [];
    this.children = [
      Drag({
        proxyEl: this,
        child: this.selectBody,
        onDragStart: () => {
          selectElementsStartPoint = this.selectElements.map((v) => ({
            x: v.x,
            y: v.y,
            element: v
          }));
        },
        onDragMove: (e) => {
          selectElementsStartPoint.forEach(({ x, y, element }) => {
            element.setOption({
              x: e.x + x,
              y: e.y + y
            });
          });
        }
      })
    ];
  }

  mounted() {
    super.mounted();

    const pointerdown = (e: UserCanvasEvent) => {
      this.selectElements = [];
      const selects = new Set<Element>();
      e.stopPropagation();
      const startDownPoint = {
        x: e.detail.x,
        y: e.detail.y
      };
      const pointermove = (e: UserCanvasEvent) => {
        const { x, y } = e.detail;
        const rect = {
          x: startDownPoint.x,
          y: startDownPoint.y,
          width: x - startDownPoint.x,
          height: y - startDownPoint.y
        };
        setRectSize(rect);
        const thisRect = calculateElementBounds(rect);
        this.root.quickElements.forEach((element) => {
          const react = element.getBoundingBox();
          if (
            isOverlap(thisRect, react) &&
            element !== this &&
            element.type !== "root" &&
            element.type !== "drag" &&
            !element.isInternal
          ) {
            selects.add(element);
          }
        });
        this.root.render();
      };
      this.root.addEventListener("pointermove", pointermove);
      this.root.addEventListener(
        "pointerup",
        () => {
          //因为是倒着鼠标碰撞的，所以里面包含了可能的父级,如果存在父级需要把自己过滤
          const els = Array.from(hasParentIgNoreSelf(selects));
          if (selects.size === 0) {
            setRectSize({
              x: 0,
              y: 0,
              width: 0,
              height: 0
            });
          } else if (selects.size >= 1) {
            if (els.length === 1) {
              setRectSize(first(els).getBoundingBox());
            } else {
              const rects = els.map((v) => v.getBoundingBox());
              const rect = rects.reduce((prev, next) =>
                mergeTwoRects(prev, next)
              );
              setRectSize(rect);
            }
          }
          console.log("select:", els);
          this.selectElements = els;
          this.root.removeEventListener("pointermove", pointermove);
          this.root.render();
        },
        {
          once: true
        }
      );
    };

    const setRectSize = (rect: Rect) => {
      this.setOption({
        x: rect.x - 4,
        y: rect.y - 4
      });
      this.selectBody.setOption({
        width: rect.width + 8,
        height: rect.height + 8
      });
    };
    this.root.addEventListener("pointerdown", pointerdown);
  }
}

function hasParentIgNoreSelf(v: Set<Element>) {
  Array.from(v).forEach((element) => {
    let parent = element.parent;
    while (parent) {
      if (v.has(parent)) {
        v.delete(element);
        return true;
      }
      parent = parent.parent;
    }
  });
  return v;
}

export function select() {
  return new Select();
}
